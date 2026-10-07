import asyncio
import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query
from app.core.config import settings
from app.scenarios.definitions import SCENARIOS, get_all_scenarios, get_scenario
from app.engine.sandbox_cloud import cloud_sandbox
from app.engine.aws_telemetry import aws_telemetry_service
from app.engine.aws_remediation import aws_remediation_service
from app.engine.aws_client import aws_client_manager
from app.agents.detector import detector_agent

logger = logging.getLogger("ScenariosRouter")
router = APIRouter(prefix="/scenarios", tags=["Scenarios"])

@router.get("", response_model=List[Dict[str, Any]])
def list_scenarios():
    """Returns all available controlled incident failure scenarios."""
    return [s.model_dump() for s in get_all_scenarios()]

@router.post("/{scenario_id}/trigger")
async def trigger_scenario(scenario_id: str, mode: Optional[str] = Query(None)):
    """
    Injects a controlled incident scenario (AWS EC2 or Sandbox)
    and initiates the multi-agent detection and response workflow.
    """
    scenario = get_scenario(scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' not found")

    if mode:
        is_aws = (mode.lower() == "aws")
    else:
        is_aws = (scenario_id == "aws_ec2_cpu_saturation") or (settings.TELEMETRY_SOURCE.lower() == "aws" and scenario_id not in ["cpu_saturation", "memory_leak", "db_pool_exhaustion", "dependency_failure"])

    logger.info(f"Triggering incident scenario: {scenario.title} (Mode: {'AWS' if is_aws else 'Simulator'})...")

    if is_aws:
        instance_id = aws_telemetry_service.get_target_instance_id()
        service_name = aws_telemetry_service.get_target_service_name()
        if not instance_id:
            raise HTTPException(
                status_code=400,
                detail="AWS_EC2_INSTANCE_ID is not configured in backend settings / .env. Please configure your EC2 instance ID."
            )

        # 1. Sample real CloudWatch metrics and logs
        telemetry = await aws_telemetry_service.sample_live_telemetry()
        metrics = telemetry.get(service_name, [])
        logs = await aws_telemetry_service.fetch_cloudwatch_logs(instance_id)

        # 2. If CPU is not already high, mark an anomaly on the sample to initiate agent triage
        cpu_metric = next((m for m in metrics if m.metric_name == "cpu_utilization"), None)
        if cpu_metric and cpu_metric.value < settings.AWS_CPU_THRESHOLD_PERCENT:
            cpu_metric.value = 94.2
            cpu_metric.is_anomaly = True
            cpu_metric.anomaly_score = 0.94

        # 3. Trigger Detector Agent
        incident_id = await detector_agent.evaluate_telemetry_and_trigger(
            service=service_name,
            metrics=metrics,
            logs=logs,
            trigger_reason=f"Live CloudWatch: High CPUUtilization on EC2 instance {instance_id}"
        )

        return {
            "success": True,
            "mode": "aws",
            "scenario_id": scenario.id,
            "scenario_title": scenario.title,
            "target_service": service_name,
            "aws_instance_id": instance_id,
            "incident_id": incident_id,
            "message": f"AWS Scenario '{scenario.title}' triggered for EC2 instance {instance_id}. Multi-agent workflow initiated."
        }

    else:
        # 1. Inject anomaly into sandbox cloud
        cloud_sandbox.inject_anomaly(
            service_name=scenario.target_service,
            anomaly_type=scenario.anomaly_type,
            severity=scenario.severity,
            details={"scenario_id": scenario.id, "title": scenario.title}
        )

        # 2. Sample anomalous metrics + logs
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
            "mode": "simulator",
            "scenario_id": scenario.id,
            "scenario_title": scenario.title,
            "target_service": scenario.target_service,
            "incident_id": incident_id,
            "message": f"Scenario '{scenario.title}' injected successfully. Multi-agent workflow initiated."
        }

@router.post("/aws/stress")
async def trigger_aws_cpu_stress(duration_seconds: int = Query(180, ge=30, le=600)):
    """
    Demo helper: Dispatches a controlled CPU stress process on the live EC2 instance
    using AWS Systems Manager (SSM) Run Command.
    """
    instance_id = aws_telemetry_service.get_target_instance_id()
    if not instance_id:
        raise HTTPException(status_code=400, detail="AWS_EC2_INSTANCE_ID not configured.")

    res = await aws_remediation_service.trigger_cpu_stress_scenario(
        instance_id=instance_id,
        duration_seconds=duration_seconds
    )
    return {
        "success": res.get("success", False),
        "instance_id": instance_id,
        "duration_seconds": duration_seconds,
        "details": res
    }

@router.get("/aws/status")
async def get_aws_status():
    """Returns live AWS connection status, EC2 metadata, and latest CloudWatch metrics."""
    conn = aws_client_manager.check_connectivity()
    instance_id = aws_telemetry_service.get_target_instance_id()
    meta = await aws_telemetry_service.fetch_ec2_metadata(instance_id) if instance_id else {}
    cpu_val = await aws_telemetry_service.fetch_cloudwatch_cpu(instance_id) if instance_id else 0.0

    return {
        "aws_connected": conn.get("connected", False),
        "identity": conn,
        "configured_instance_id": instance_id,
        "region": settings.AWS_REGION,
        "instance_metadata": meta,
        "latest_cloudwatch_cpu": cpu_val,
        "cpu_threshold": settings.AWS_CPU_THRESHOLD_PERCENT,
        "telemetry_source": settings.TELEMETRY_SOURCE
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
