import pytest
import asyncio
from app.core.database import init_db, SessionLocal, DBIncident, DBAction
from app.core.models import IncidentStatus, RiskLevel, ApprovalStatus, TelemetryMetric, LogEntry
from app.engine.approval_policy import ApprovalPolicyEngine
from app.engine.knowledge_store import knowledge_store
from app.engine.sandbox_cloud import cloud_sandbox
from app.agents.detector import detector_agent
from app.agents.analyst import analyst_agent
from app.agents.responder import responder_agent
from app.agents.reporter import reporter_agent

@pytest.fixture(autouse=True)
def setup_database():
    init_db()

def test_approval_policy():
    risk_low, human_low, _ = ApprovalPolicyEngine.evaluate("scale_replicas", {"target_count": 3})
    assert risk_low == RiskLevel.LOW
    assert human_low is False

    risk_high, human_high, _ = ApprovalPolicyEngine.evaluate("rollback_deployment", {})
    assert risk_high == RiskLevel.HIGH
    assert human_high is True

    risk_pool, human_pool, _ = ApprovalPolicyEngine.evaluate("resize_db_pool", {"new_pool_size": 120})
    assert risk_pool == RiskLevel.CRITICAL
    assert human_pool is True

def test_knowledge_search():
    results = knowledge_store.search_similar("database connection pool timeout postgresql", top_k=2)
    assert len(results) > 0
    assert any("connection pool" in r["root_cause"].lower() for r in results)

def test_sandbox_metrics():
    cloud_sandbox.inject_anomaly("order-service", "cpu_saturation", "HIGH")
    telemetry = cloud_sandbox.sample_telemetry()
    order_metrics = telemetry.get("order-service", [])
    
    cpu_metric = next((m for m in order_metrics if m.metric_name == "cpu_utilization"), None)
    assert cpu_metric is not None
    assert cpu_metric.value >= 85.0
    assert cpu_metric.is_anomaly is True

    # Healing test
    cloud_sandbox.remediate_anomaly("order-service", "scale_replicas", {"target_count": 5})
    assert cloud_sandbox.services["order-service"]["status"] == "HEALTHY"

@pytest.mark.asyncio
async def test_end_to_end_agent_flow():
    # 1. Trigger Anomaly
    cloud_sandbox.inject_anomaly("order-service", "cpu_saturation", "HIGH")
    metrics = cloud_sandbox.sample_telemetry().get("order-service", [])
    logs = cloud_sandbox.generate_recent_logs("order-service", count=2)

    # 2. Detector
    incident_id = await detector_agent.evaluate_telemetry_and_trigger(
        service="order-service",
        metrics=metrics,
        logs=logs,
        trigger_reason="Test CPU Saturation"
    )
    assert incident_id.startswith("INC-")

    with SessionLocal() as db:
        inc = db.query(DBIncident).filter(DBIncident.id == incident_id).first()
        assert inc is not None
        assert inc.service == "order-service"
