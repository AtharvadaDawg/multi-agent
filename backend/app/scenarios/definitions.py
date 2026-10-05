from typing import Dict, Any, List
from pydantic import BaseModel

class IncidentScenario(BaseModel):
    id: str
    title: str
    target_service: str
    anomaly_type: str
    severity: str
    description: str
    expected_root_cause: str
    expected_remediation: str
    risk_level: str
    requires_human_approval: bool

SCENARIOS: Dict[str, IncidentScenario] = {
    "cpu_saturation": IncidentScenario(
        id="cpu_saturation",
        title="CPU Saturation & Thread Pool Starvation",
        target_service="order-service",
        anomaly_type="cpu_saturation",
        severity="HIGH",
        description="Runaway worker threads causing CPU spikes > 95% and blocking user requests.",
        expected_root_cause="CPU saturation caused by runaway worker process and thread pool queue starvation.",
        expected_remediation="scale_replicas",
        risk_level="LOW",
        requires_human_approval=False
    ),
    "error_spike": IncidentScenario(
        id="error_spike",
        title="HTTP 500 Internal Server Error Surge",
        target_service="order-service",
        anomaly_type="error_spike",
        severity="CRITICAL",
        description="Release v2.4.0 introduced an unhandled null-pointer exception in checkout path.",
        expected_root_cause="Unhandled exception in application checkout route following release v2.4.0.",
        expected_remediation="rollback_deployment",
        risk_level="HIGH",
        requires_human_approval=True
    ),
    "db_pool_exhaustion": IncidentScenario(
        id="db_pool_exhaustion",
        title="Database Connection Pool Exhaustion",
        target_service="order-service",
        anomaly_type="db_pool_exhaustion",
        severity="CRITICAL",
        description="Connection pool saturation (20/20 active) causing 30s query lease timeouts.",
        expected_root_cause="PostgreSQL connection pool exhaustion due to slow blocking queries.",
        expected_remediation="resize_db_pool",
        risk_level="HIGH",
        requires_human_approval=True
    ),
    "failed_deployment": IncidentScenario(
        id="failed_deployment",
        title="Failed Container Canary Rollout",
        target_service="order-service",
        anomaly_type="failed_deployment",
        severity="HIGH",
        description="New container canary release failing health checks with exit code 137.",
        expected_root_cause="Failed canary deployment revision crashing due to schema/container issue.",
        expected_remediation="rollback_deployment",
        risk_level="HIGH",
        requires_human_approval=True
    ),
    "dependency_failure": IncidentScenario(
        id="dependency_failure",
        title="Upstream Third-Party Dependency Timeout",
        target_service="payment-gateway",
        anomaly_type="dependency_failure",
        severity="HIGH",
        description="Upstream banking partner API latency > 4500ms causing gateway thread stalls.",
        expected_root_cause="External dependency latency and connectivity timeout on upstream gateway.",
        expected_remediation="enable_circuit_breaker",
        risk_level="MEDIUM",
        requires_human_approval=False
    )
}

def get_all_scenarios() -> List[IncidentScenario]:
    return list(SCENARIOS.values())

def get_scenario(scenario_id: str) -> IncidentScenario:
    return SCENARIOS.get(scenario_id)
