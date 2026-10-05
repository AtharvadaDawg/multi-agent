import asyncio
import logging
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
from app.scenarios.definitions import SCENARIOS, get_all_scenarios, get_scenario
from app.engine.sandbox_cloud import cloud_sandbox
from app.agents.detector import detector_agent

logger = logging.getLogger("ScenariosRouter")
router = APIRouter(prefix="/scenarios", tags=["Scenarios"])

@router.get("", response_model=List[Dict[str, Any]])
def list_scenarios():
    """Returns all available controlled incident failure scenarios."""
    return [s.model_dump() for s in get_all_scenarios()]

@router.post("/{scenario_id}/trigger")
async def trigger_scenario(scenario_id: str):
    """
    Injects a controlled incident scenario into the sandbox cloud environment
    and initiates the multi-agent detection and response workflow.
    """
    scenario = get_scenario(scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' not found")

    logger.info(f"Triggering incident scenario: {scenario.title} on {scenario.target_service}...")

    # 1. Inject anomaly into sandbox cloud
    cloud_sandbox.inject_anomaly(
        service_name=scenario.target_service,
        anomaly_type=scenario.anomaly_type,
        severity=scenario.severity,
        details={"scenario_id": scenario.id, "title": scenario.title}
    )

    # 2. Let simulator settle and sample anomalous metrics + logs
    await asyncio.sleep(0.3)
    metrics = cloud_sandbox.sample_telemetry().get(scenario.target_service, [])
    logs = cloud_sandbox.generate_recent_logs(scenario.target_service, count=3)

    # 3. Trigger Detector Agent
    incident_id = await detector_agent.evaluate_telemetry_and_trigger(
        service=scenario.target_service,
        metrics=metrics,
        logs=logs,
        trigger_reason=scenario.title
    )

    return {
        "success": True,
        "scenario_id": scenario.id,
        "scenario_title": scenario.title,
        "target_service": scenario.target_service,
        "incident_id": incident_id,
        "message": f"Scenario '{scenario.title}' injected successfully. Multi-agent workflow initiated."
    }

@router.post("/reset")
def reset_sandbox():
    """Heals all simulated services and resets environment to healthy baseline."""
    for svc in cloud_sandbox.services.values():
        svc["active_anomaly"] = None
        svc["status"] = "HEALTHY"
        svc["cpu_base"] = 24.0
        svc["mem_base"] = 40.0
        svc["latency_base"] = 45.0
        svc["error_rate_base"] = 0.02
    return {"success": True, "message": "All sandbox services reset to healthy baseline."}
