import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List
from app.core.config import settings
from app.agents.base import BaseAgent
from app.core.models import (
    AgentName, IncidentStatus, RiskLevel, ApprovalStatus, AgentEventMessage, RemediationProposal
)
from app.core.database import SessionLocal, DBIncident, DBAction
from app.core.event_bus import event_bus
from app.engine.approval_policy import ApprovalPolicyEngine
from app.engine.runbook_executor import runbook_executor
from app.engine.aws_remediation import ALLOWED_AWS_ACTIONS

logger = logging.getLogger("ResponderAgent")

SYSTEM_RESPONDER_PROMPT = """You are an expert DevOps Remediation & SRE Responder Agent.
Given an incident diagnosis and root cause, synthesize the optimal, safest candidate remediation action from approved runbooks.

Approved Action Types:
- AWS Infrastructure Mode: "restart_application_service" | "stop_runaway_process" | "reboot_ec2_instance"
- Sandbox/Container Mode: "scale_replicas" | "rollback_deployment" | "resize_db_pool" | "enable_circuit_breaker" | "restart_service"

Security Rule:
The LLM must NEVER generate arbitrary shell commands or arbitrary AWS API calls. Only choose an action_type from the approved list.

Return JSON in the format:
{
  "action_type": "<approved action type>",
  "title": "<Concise action title>",
  "description": "<Detailed description of what the action does>",
  "target_resource": "<resource name or EC2 instance>",
  "rationale": "<Why this action cures the specific root cause>",
  "rollback_plan": "<Exact step to undo if action fails>",
  "parameters": {}
}
"""

class ResponderAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name=AgentName.RESPONDER,
            role_description="Synthesizes ranked remediation actions from vetted runbooks, enforces approval policies, and coordinates safe execution."
        )

    async def handle_diagnosis_ready(self, event: AgentEventMessage):
        """Processes a diagnosis_ready event and prepares remediation."""
        incident_id = event.incident_id
        payload = event.payload
        service = payload.get("service", "unknown-service")
        root_cause = payload.get("root_cause", "")
        is_aws_mode = (service == "aws-ec2-workload") or service.startswith("aws-") or ("ec2" in service.lower())
        
        logger.info(f"[Responder] Formulating remediation plan for incident {incident_id} on {service} (Target: {'AWS' if is_aws_mode else 'Sandbox'})...")

        # 1. Ask LLM / Reasoning Engine for optimal remediation plan
        user_prompt = f"""
Incident ID: {incident_id}
Target Service/Host: {service}
Mode: {'AWS EC2 CloudWatch' if is_aws_mode else 'Sandbox Microservices'}
Target EC2 Instance: {settings.AWS_EC2_INSTANCE_ID if is_aws_mode else 'N/A'}
Diagnosed Root Cause: {root_cause}
Blast Radius: {payload.get('blast_radius', [])}
Reasoning: {payload.get('reasoning', '')}
"""
        schema_hint = '{"action_type": "restart_application_service", "title": "string", "description": "string", "target_resource": "string", "rationale": "string", "rollback_plan": "string", "parameters": {}}'
        llm_resp = await self.call_llm(SYSTEM_RESPONDER_PROMPT, user_prompt, structured_schema_hint=schema_hint)

        # 2. Parse candidate action
        try:
            clean_json = llm_resp.strip()
            if clean_json.startswith("```json"):
                clean_json = clean_json[7:]
            if clean_json.startswith("```"):
                clean_json = clean_json[3:]
            if clean_json.endswith("```"):
                clean_json = clean_json[:-3]
            clean_json = clean_json.strip()
            
            parsed = json.loads(clean_json)
            action_type = parsed.get("action_type", "restart_application_service" if is_aws_mode else "restart_service")
            title = parsed.get("title", f"Remediate {service}")
            description = parsed.get("description", "Apply corrective infrastructure command.")
            target_resource = parsed.get("target_resource", settings.AWS_EC2_INSTANCE_ID if is_aws_mode else service)
            rationale = parsed.get("rationale", "Mitigate diagnosed root cause.")
            rollback_plan = parsed.get("rollback_plan", "Revert configuration to previous state.")
            parameters = parsed.get("parameters", {})
        except Exception as e:
            logger.warning(f"Error parsing remediation JSON: {e}. Applying deterministic fallback.")
            parsed = None

        # 3. Deterministic Safety Enforcement / Fallback
        rc_lower = root_cause.lower()
        if is_aws_mode:
            # Enforce strictly that action_type is in ALLOWED_AWS_ACTIONS
            if not parsed or action_type not in ALLOWED_AWS_ACTIONS:
                if "reboot" in rc_lower or "kernel" in rc_lower or "hang" in rc_lower:
                    action_type = "reboot_ec2_instance"
                    title = f"Reboot EC2 Instance ({settings.AWS_EC2_INSTANCE_ID})"
                    description = "Perform clean reboot of target EC2 instance via AWS EC2 API."
                    target_resource = settings.AWS_EC2_INSTANCE_ID or service
                    rationale = "Clears persistent OS lock and restarts instance cleanly."
                    rollback_plan = "Instance restarts with previous AMI state."
                    parameters = {"instance_id": settings.AWS_EC2_INSTANCE_ID}
                else:
                    action_type = "restart_application_service"
                    title = f"Restart Application Service on EC2 ({settings.AWS_EC2_INSTANCE_ID})"
                    description = "Restarts the demo application and clears runaway CPU worker processes via AWS Systems Manager."
                    target_resource = settings.AWS_EC2_INSTANCE_ID or service
                    rationale = "Terminates CPU saturation worker and restores application service."
                    rollback_plan = "Service restarts automatically upon worker termination."
                    parameters = {"instance_id": settings.AWS_EC2_INSTANCE_ID}
        else:
            if not parsed:
                if "cpu" in rc_lower or "saturation" in rc_lower:
                    action_type = "scale_replicas"
                    title = f"Scale out {service} replicas"
                    description = "Increase replica count from 3 to 5 to distribute compute load."
                    target_resource = service
                    rationale = "Relieves thread pool pressure and CPU saturation."
                    rollback_plan = "Scale down to initial replica count 3."
                    parameters = {"target_count": 5}
                elif "pool" in rc_lower or "connection" in rc_lower or "db" in rc_lower:
                    action_type = "resize_db_pool"
                    title = "Resize database connection pool"
                    description = "Expand database pool limit from 20 to 80 connections."
                    target_resource = service
                    rationale = "Allows queued queries to acquire connection slots without timing out."
                    rollback_plan = "Restore pool size to 20."
                    parameters = {"new_pool_size": 80}
                elif "deployment" in rc_lower or "canary" in rc_lower or "500" in rc_lower or "exception" in rc_lower:
                    action_type = "rollback_deployment"
                    title = f"Rollback {service} to previous stable version"
                    description = "Revert active container deployment to previous stable revision v1.4.1."
                    target_resource = service
                    rationale = "Restores working application binary and eliminates runtime exceptions."
                    rollback_plan = "Re-deploy failed revision after hotfix."
                    parameters = {"target_version": "v1.4.1"}
                elif "dependency" in rc_lower or "gateway" in rc_lower:
                    action_type = "enable_circuit_breaker"
                    title = f"Enable circuit breaker for external dependency"
                    description = "Open circuit breaker on upstream gateway and route calls to async fallback queue."
                    target_resource = service
                    rationale = "Prevents thread exhaustion while upstream partner recovers."
                    rollback_plan = "Close circuit breaker once upstream healthcheck passes."
                    parameters = {"fallback_mode": "async_dlq"}
                else:
                    action_type = "restart_service"
                    title = f"Gracefully restart {service}"
                    description = "Perform rolling restart of worker pods."
                    target_resource = service
                    rationale = "Clears transient deadlock or memory leak."
                    rollback_plan = "Re-launch original instances."
                    parameters = {}

        # 4. Evaluate Risk and Human Approval requirement via ApprovalPolicyEngine
        risk, requires_human, initial_approval = ApprovalPolicyEngine.evaluate(action_type, parameters)
        action_id = f"ACT-{uuid.uuid4().hex[:6].upper()}"

        # 5. Persist Action to DB
        with SessionLocal() as db:
            db_action = DBAction(
                id=action_id,
                incident_id=incident_id,
                action_type=action_type,
                title=title,
                description=description,
                risk=risk.value,
                requires_human_approval=requires_human,
                rationale=rationale,
                rollback_plan=rollback_plan,
                target_resource=target_resource,
                parameters_json=json.dumps(parameters),
                approval_status=initial_approval.value,
                created_at=datetime.now(timezone.utc)
            )
            db.add(db_action)

            inc = db.query(DBIncident).filter(DBIncident.id == incident_id).first()
            if inc:
                if requires_human:
                    inc.status = IncidentStatus.AWAITING_APPROVAL.value
                else:
                    inc.status = IncidentStatus.ACTION_PROPOSED.value
            db.commit()

        # 6. Branch based on Human-in-the-Loop requirement
        if requires_human:
            logger.info(f"[Responder] Action {action_id} classified as {risk.value} risk. Awaiting human operator approval...")
            await event_bus.record_timeline(
                incident_id=incident_id,
                actor=self.name,
                event=f"Proposed consequential remediation '{title}' ({risk.value} Risk) - Awaiting human operator authorization.",
                state_before=IncidentStatus.DIAGNOSED,
                state_after=IncidentStatus.AWAITING_APPROVAL,
                details={"action_id": action_id, "action_type": action_type, "risk": risk.value}
            )

            await event_bus.publish(
                incident_id=incident_id,
                event_type="action_proposed",
                producer=self.name,
                payload={
                    "incident_id": incident_id,
                    "action_id": action_id,
                    "action_type": action_type,
                    "title": title,
                    "description": description,
                    "risk": risk.value,
                    "requires_human_approval": True,
                    "rationale": rationale,
                    "rollback_plan": rollback_plan,
                    "target_resource": target_resource,
                    "parameters": parameters
                }
            )
        else:
            # Auto-approved action execution
            logger.info(f"[Responder] Action {action_id} classified as {risk.value} risk. Auto-approved for immediate execution.")
            await event_bus.record_timeline(
                incident_id=incident_id,
                actor=self.name,
                event=f"Auto-approved low-risk action '{title}'. Proceeding to execution...",
                state_before=IncidentStatus.DIAGNOSED,
                state_after=IncidentStatus.REMEDIATING,
                details={"action_id": action_id, "action_type": action_type}
            )
            await self.execute_remediation(incident_id, action_id, service, action_type, parameters)

    async def execute_remediation(
        self,
        incident_id: str,
        action_id: str,
        service: str,
        action_type: str,
        parameters: Dict[str, Any]
    ):
        """Executes the approved remediation action and verifies resolution."""
        with SessionLocal() as db:
            inc = db.query(DBIncident).filter(DBIncident.id == incident_id).first()
            if inc:
                inc.status = IncidentStatus.REMEDIATING.value
                db.commit()

        await event_bus.record_timeline(
            incident_id=incident_id,
            actor=self.name,
            event=f"Executing remediation runbook '{action_type}' on {service}...",
            state_before=IncidentStatus.AWAITING_APPROVAL,
            state_after=IncidentStatus.REMEDIATING,
            details={"action_id": action_id, "action_type": action_type}
        )

        # Call Runbook Executor (dispatches to AWS or Sandbox)
        exec_result = await runbook_executor.execute_action(
            service=service,
            action_type=action_type,
            parameters=parameters
        )

        now = datetime.now(timezone.utc)
        with SessionLocal() as db:
            act = db.query(DBAction).filter(DBAction.id == action_id).first()
            if act:
                act.execution_result_json = json.dumps(exec_result)

            inc = db.query(DBIncident).filter(DBIncident.id == incident_id).first()
            if inc:
                if exec_result.get("verified_recovered", True):
                    inc.status = IncidentStatus.RESOLVED.value
                    inc.resolved_at = now
                    if inc.started_at:
                        started = inc.started_at
                        if started.tzinfo is None:
                            started = started.replace(tzinfo=timezone.utc)
                        inc.mttr_seconds = round((now - started).total_seconds(), 2)
                else:
                    inc.status = IncidentStatus.FAILED_ESCALATED.value
                db.commit()

        # Record timeline & Publish outcome
        if exec_result.get("verified_recovered", True):
            await event_bus.record_timeline(
                incident_id=incident_id,
                actor=self.name,
                event=f"Remediation successful! Verification passed: {exec_result.get('verification_message')}",
                state_before=IncidentStatus.REMEDIATING,
                state_after=IncidentStatus.RESOLVED,
                details=exec_result
            )

            await event_bus.publish(
                incident_id=incident_id,
                event_type="incident_resolved",
                producer=self.name,
                payload={
                    "incident_id": incident_id,
                    "action_id": action_id,
                    "service": service,
                    "action_type": action_type,
                    "execution_result": exec_result,
                    "resolved_at": now.isoformat()
                }
            )
        else:
            await event_bus.record_timeline(
                incident_id=incident_id,
                actor=self.name,
                event=f"Remediation verification failed: {exec_result.get('verification_message')}. Escalating to SRE on-call.",
                state_before=IncidentStatus.REMEDIATING,
                state_after=IncidentStatus.FAILED_ESCALATED,
                details=exec_result
            )

responder_agent = ResponderAgent()
