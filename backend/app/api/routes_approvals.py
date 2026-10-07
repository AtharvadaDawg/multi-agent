import json
import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db, SessionLocal, DBAction, DBIncident, DBAuditEvent
from app.core.models import ApprovalDecisionRequest, ApprovalStatus, IncidentStatus, AgentName
from app.core.event_bus import event_bus
from app.agents.responder import responder_agent

logger = logging.getLogger("ApprovalsRouter")
router = APIRouter(prefix="/approvals", tags=["Approvals"])

@router.get("/pending", response_model=List[Dict[str, Any]])
def list_pending_approvals(db: Session = Depends(get_db)):
    """Returns all high-risk remediation actions currently awaiting human authorization."""
    actions = (
        db.query(DBAction)
        .join(DBIncident, DBAction.incident_id == DBIncident.id)
        .filter(
            DBAction.approval_status == ApprovalStatus.PENDING.value,
            DBIncident.status == IncidentStatus.AWAITING_APPROVAL.value
        )
        .all()
    )
    results = []
    for a in actions:
        params = {}
        try:
            params = json.loads(a.parameters_json) if a.parameters_json else {}
        except Exception:
            pass
        results.append({
            "action_id": a.id,
            "incident_id": a.incident_id,
            "action_type": a.action_type,
            "title": a.title,
            "description": a.description,
            "risk": a.risk,
            "rationale": a.rationale,
            "rollback_plan": a.rollback_plan,
            "target_resource": a.target_resource,
            "parameters": params,
            "created_at": a.created_at.isoformat() if a.created_at else ""
        })
    return results

@router.post("/decision")
async def submit_approval_decision(request: ApprovalDecisionRequest, db: Session = Depends(get_db)):
    """
    Submits a human operator decision (APPROVE / REJECT / REVISE) for a pending remediation action.
    """
    action = db.query(DBAction).filter(DBAction.id == request.action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    
    incident = db.query(DBIncident).filter(DBIncident.id == action.incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Associated incident not found")

    decision_upper = request.decision.upper()
    now = datetime.now(timezone.utc)

    # 1. Record Audit Event
    audit_id = str(uuid.uuid4())
    audit_entry = DBAuditEvent(
        id=audit_id,
        actor=request.operator_name,
        object=f"Action:{action.id}",
        action=f"APPROVAL_DECISION_{decision_upper}",
        timestamp=now,
        decision=decision_upper,
        evidence_ref=f"Incident:{incident.id}",
        details_json=json.dumps({
            "action_type": action.action_type,
            "notes": request.notes or "",
            "risk": action.risk
        })
    )
    db.add(audit_entry)

    # 2. Process Decision
    if decision_upper == "APPROVE":
        action.approval_status = ApprovalStatus.APPROVED.value
        db.commit()

        # Record Timeline Event
        await event_bus.record_timeline(
            incident_id=incident.id,
            actor=AgentName.HUMAN_OPERATOR,
            event=f"Operator '{request.operator_name}' APPROVED action '{action.title}'. Notes: {request.notes or 'None'}",
            state_before=IncidentStatus.AWAITING_APPROVAL,
            state_after=IncidentStatus.REMEDIATING,
            details={"operator": request.operator_name, "decision": "APPROVED", "notes": request.notes}
        )

        # Dispatch execution to Responder Agent
        params = {}
        try:
            params = json.loads(action.parameters_json) if action.parameters_json else {}
        except Exception:
            pass

        # Trigger execution asynchronously
        import asyncio
        asyncio.create_task(
            responder_agent.execute_remediation(
                incident_id=incident.id,
                action_id=action.id,
                service=incident.service,
                action_type=action.action_type,
                parameters=params
            )
        )

        return {
            "success": True,
            "message": f"Action {action.id} approved. Remediation execution initiated.",
            "status": "APPROVED"
        }

    elif decision_upper == "REJECT":
        action.approval_status = ApprovalStatus.REJECTED.value
        incident.status = IncidentStatus.FAILED_ESCALATED.value
        db.commit()

        await event_bus.record_timeline(
            incident_id=incident.id,
            actor=AgentName.HUMAN_OPERATOR,
            event=f"Operator '{request.operator_name}' REJECTED action '{action.title}'. Reason: {request.notes or 'No reason provided'}",
            state_before=IncidentStatus.AWAITING_APPROVAL,
            state_after=IncidentStatus.FAILED_ESCALATED,
            details={"operator": request.operator_name, "decision": "REJECTED", "notes": request.notes}
        )

        return {
            "success": True,
            "message": f"Action {action.id} rejected. Workflow halted and escalated.",
            "status": "REJECTED"
        }

    else:
        raise HTTPException(status_code=400, detail=f"Invalid decision '{request.decision}'. Must be APPROVE or REJECT.")
