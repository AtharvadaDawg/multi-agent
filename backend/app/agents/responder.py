import json
import logging
import uuid
from datetime import datetime
from typing import Dict, Any, List
from app.agents.base import BaseAgent
from app.core.models import (
    AgentName, IncidentStatus, RiskLevel, ApprovalStatus, AgentEventMessage, RemediationProposal
)
from app.core.database import SessionLocal, DBIncident, DBAction
from app.core.event_bus import event_bus
from app.engine.approval_policy import ApprovalPolicyEngine
from app.engine.runbook_executor import runbook_executor

logger = logging.getLogger("ResponderAgent")

SYSTEM_RESPONDER_PROMPT = """You are an expert DevOps Remediation & SRE Responder Agent.
Given an incident diagnosis and root cause, synthesize the optimal, safest candidate remediation action.
Identify the action_type (scale_replicas, rollback_deployment, resize_db_pool, enable_circuit_breaker, restart_service),
rationale, parameter overrides, and explicit rollback plan.

Return JSON in the format:
{
  "action_type": "rollback_deployment | scale_replicas | resize_db_pool | enable_circuit_breaker | restart_service",
  "title": "<Concise action title>",
  "description": "<Detailed description of what the action does>",
  "target_resource": "<resource name>",
  "rationale": "<Why this action cures the specific root cause>",
  "rollback_plan": "<Exact step to undo if action fails>",
  "parameters": {}
}
"""

class ResponderAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name=AgentName.RESPONDER,
            role_description="Synthesizes ranked remediation actions, enforces human-in-the-loop approval policies, and coordinates safe execution."
        )

    async def handle_diagnosis_ready(self, event: AgentEventMessage):
        """Processes a diagnosis_ready event and prepares remediation."""
        incident_id = event.incident_id
        payload = event.payload
        service = payload.get("service", "unknown-service")
        root_cause = payload.get("root_cause", "")
        
        logger.info(f"[Responder] Formulating remediation plan for incident {incident_id} on {service}...")

        # 1. Ask LLM / Reasoning Engine for optimal remediation plan
        user_prompt = f"""
Incident ID: {incident_id}
Service: {service}
Diagnosed Root Cause: {root_cause}
Blast Radius: {payload.get('blast_radius', [])}
Reasoning: {payload.get('reasoning', '')}
"""
        schema_hint = '{"action_type": "rollback_deployment", "title": "string", "description": "string", "target_resource": "string", "rationale": "string", "rollback_plan": "string", "parameters": {}}'
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
            action_type = parsed.get("action_type", "restart_service")
            title = parsed.get("title", f"Remediate {service}")
            description = parsed.get("description", "Apply corrective infrastructure command.")
            target_resource = parsed.get("target_resource", service)
            rationale = parsed.get("rationale", "Mitigate diagnosed root cause.")
            rollback_plan = parsed.get("rollback_plan", "Revert configuration to previous snapshot.")
            parameters = parsed.get("parameters", {})
        except Exception as e:
            logger.warning(f"Error parsing remediation JSON: {e}. Applying deterministic fallback.")
            # Fallback based on root cause keywords
            rc_lower = root_cause.lower()
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

        # 3. Evaluate Risk and Human Approval requirement
        risk, requires_human, initial_approval = ApprovalPolicyEngine.evaluate(action_type, parameters)
        action_id = f"ACT-{uuid.uuid4().hex[:6].upper()}"

        # 4. Persist Action to DB
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
                created_at=datetime.utcnow()
            )
            db.add(db_action)

            inc = db.query(DBIncident).filter(DBIncident.id == incident_id).first()
            if inc:
                if requires_human:
                    inc.status = IncidentStatus.AWAITING_APPROVAL.value
                else:
                    inc.status = IncidentStatus.ACTION_PROPOSED.value
            db.commit()

        # 5. Branch based on Human-in-the-Loop requirement
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

        # Call Runbook Executor
        exec_result = await runbook_executor.execute_action(
            service=service,
            action_type=action_type,
            parameters=parameters
        )

        now = datetime.utcnow()
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
                        inc.mttr_seconds = round((now - inc.started_at).total_seconds(), 2)
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
                event=f"Remediation verification failed. Escalating to SRE on-call team.",
                state_before=IncidentStatus.REMEDIATING,
                state_after=IncidentStatus.FAILED_ESCALATED,
                details=exec_result
            )

responder_agent = ResponderAgent()
