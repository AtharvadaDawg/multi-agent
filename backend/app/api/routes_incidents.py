import json
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db, DBIncident, DBEvidence, DBDiagnosis, DBAction, DBTimelineEvent, DBPostmortem, DBAuditEvent
from app.core.models import IncidentModel, EvidenceItem, DiagnosisOutput, RemediationProposal, TimelineEventModel, PostmortemModel, IncidentStatus, ApprovalStatus
from app.core.event_bus import event_bus
from app.engine.sandbox_cloud import cloud_sandbox
from app.engine.aws_telemetry import aws_telemetry_service

router = APIRouter(prefix="/incidents", tags=["Incidents"])

def format_incident_detail(inc: DBIncident) -> Dict[str, Any]:
    evidence_list = []
    for ev in inc.evidence:
        payload = {}
        try:
            payload = json.loads(ev.payload_json) if ev.payload_json else {}
        except Exception:
            pass
        evidence_list.append({
            "id": ev.id,
            "incident_id": ev.incident_id,
            "source": ev.source,
            "type": ev.type,
            "reference": ev.reference,
            "relevance": ev.relevance,
            "payload": payload
        })

    diagnosis_data = None
    if inc.diagnosis:
        d = inc.diagnosis
        blast = []
        alts = []
        refs = []
        try:
            blast = json.loads(d.blast_radius_json) if d.blast_radius_json else []
            alts = json.loads(d.alternatives_json) if d.alternatives_json else []
            refs = json.loads(d.evidence_refs_json) if d.evidence_refs_json else []
        except Exception:
            pass
        diagnosis_data = {
            "incident_id": inc.id,
            "root_cause": d.root_cause,
            "confidence": d.confidence,
            "blast_radius": blast,
            "alternatives": alts,
            "evidence_ids": refs,
            "reasoning": d.reasoning,
            "timestamp": d.created_at.isoformat() if d.created_at else ""
        }

    actions_list = []
    for act in inc.actions:
        params = {}
        exec_res = None
        try:
            params = json.loads(act.parameters_json) if act.parameters_json else {}
            if act.execution_result_json:
                exec_res = json.loads(act.execution_result_json)
        except Exception:
            pass
        actions_list.append({
            "action_id": act.id,
            "incident_id": inc.id,
            "action_type": act.action_type,
            "title": act.title,
            "description": act.description,
            "risk": act.risk,
            "requires_human_approval": act.requires_human_approval,
            "rationale": act.rationale,
            "rollback_plan": act.rollback_plan,
            "target_resource": act.target_resource,
            "parameters": params,
            "approval_status": act.approval_status,
            "execution_result": exec_res,
            "created_at": act.created_at.isoformat() if act.created_at else ""
        })

    timeline_list = []
    for t in inc.timeline:
        details = {}
        try:
            details = json.loads(t.details_json) if t.details_json else {}
        except Exception:
            pass
        timeline_list.append({
            "id": t.id,
            "incident_id": inc.id,
            "actor": t.actor,
            "event": t.event,
            "state_before": t.state_before,
            "state_after": t.state_after,
            "timestamp": t.timestamp.isoformat() if t.timestamp else "",
            "details": details
        })
    # Sort timeline chronologically
    timeline_list.sort(key=lambda x: x["timestamp"])

    postmortem_data = None
    if inc.postmortem:
        pm = inc.postmortem
        items = []
        lessons = []
        try:
            items = json.loads(pm.action_items_json) if pm.action_items_json else []
            lessons = json.loads(pm.lessons_learned_json) if pm.lessons_learned_json else []
        except Exception:
            pass
        postmortem_data = {
            "id": pm.id,
            "incident_id": inc.id,
            "title": pm.title,
            "summary": pm.summary,
            "root_cause": pm.root_cause,
            "impact": pm.impact,
            "remediation_summary": pm.remediation_summary,
            "action_items": items,
            "lessons_learned": lessons,
            "created_at": pm.created_at.isoformat() if pm.created_at else ""
        }

    return {
        "id": inc.id,
        "title": inc.title,
        "service": inc.service,
        "severity": inc.severity,
        "status": inc.status,
        "started_at": inc.started_at.isoformat() if inc.started_at else "",
        "resolved_at": inc.resolved_at.isoformat() if inc.resolved_at else None,
        "mttd_seconds": inc.mttd_seconds,
        "mttr_seconds": inc.mttr_seconds,
        "initial_trigger": inc.initial_trigger,
        "evidence": evidence_list,
        "diagnosis": diagnosis_data,
        "actions": actions_list,
        "timeline": timeline_list,
        "postmortem": postmortem_data
    }

@router.get("", response_model=List[Dict[str, Any]])
def list_incidents(
    status: Optional[str] = None,
    service: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    query = db.query(DBIncident).order_by(DBIncident.started_at.desc())
    if status:
        query = query.filter(DBIncident.status == status)
    if service:
        query = query.filter(DBIncident.service == service)
    
    incidents = query.limit(limit).all()
    return [format_incident_detail(inc) for inc in incidents]

@router.get("/{incident_id}", response_model=Dict[str, Any])
def get_incident(incident_id: str, db: Session = Depends(get_db)):
    inc = db.query(DBIncident).filter(DBIncident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    return format_incident_detail(inc)

@router.get("/telemetry/live")
async def get_live_telemetry(source: Optional[str] = Query(None)):
    """Returns real-time telemetry from either AWS CloudWatch or the Cloud Sandbox."""
    selected_source = (source or settings.TELEMETRY_SOURCE).lower()
    if selected_source == "aws":
        telemetry = await aws_telemetry_service.sample_live_telemetry()
        services = aws_telemetry_service.get_services_topology()
        return {
            "mode": "aws",
            "services": services,
            "metrics": {s: [m.model_dump() for m in m_list] for s, m_list in telemetry.items()}
        }
    else:
        telemetry = cloud_sandbox.sample_telemetry()
        return {
            "mode": "simulator",
            "services": cloud_sandbox.services,
            "metrics": {s: [m.model_dump() for m in m_list] for s, m_list in telemetry.items()}
        }

@router.get("/telemetry/sandbox")
def get_sandbox_telemetry():
    """Returns synthetic microservices topology and metrics from the offline Cloud Sandbox."""
    telemetry = cloud_sandbox.sample_telemetry()
    return {
        "mode": "simulator",
        "services": cloud_sandbox.services,
        "metrics": {s: [m.model_dump() for m in m_list] for s, m_list in telemetry.items()}
    }

@router.get("/agents/status")
def get_agent_status():
    """Returns the live status, active tasks, and role descriptions of the 4 specialized agents."""
    return {
        "agents": [
            {
                "name": "Detector",
                "role": "Anomaly Detection & Alerting",
                "status": "ONLINE",
                "description": "Monitors AWS CloudWatch / microservice metrics and log streams."
            },
            {
                "name": "Analyst",
                "role": "Contextual Diagnosis & RCA",
                "status": "ONLINE",
                "description": "Correlates telemetry, blast radius, and historical incident patterns."
            },
            {
                "name": "Responder",
                "role": "Action Planning & Execution",
                "status": "ONLINE",
                "description": "Evaluates risk policies, requests approval, and orchestrates AWS SSM runbooks."
            },
            {
                "name": "Reporter",
                "role": "Postmortem & Learning",
                "status": "ONLINE",
                "description": "Compiles post-incident timeline, action items, and updates knowledge base."
            }
        ]
    }

@router.post("/stop-all")
async def stop_all_active_pipelines(db: Session = Depends(get_db)):
    """
    Stops and cancels all currently active incident solving pipelines,
    canceling pending approval actions and notifying connected clients.
    """
    active_incidents = db.query(DBIncident).filter(
        DBIncident.status.notin_([
            IncidentStatus.RESOLVED.value,
            IncidentStatus.DOCUMENTED.value,
            IncidentStatus.CLOSED.value,
            IncidentStatus.CANCELLED.value
        ])
    ).all()

    now = datetime.now(timezone.utc)
    for inc in active_incidents:
        prev_status = inc.status
        inc.status = IncidentStatus.CANCELLED.value
        inc.resolved_at = now

        stop_evt = DBTimelineEvent(
            id=str(uuid.uuid4()),
            incident_id=inc.id,
            actor="Human Operator",
            event="Pipeline execution manually stopped and cancelled by operator.",
            state_before=prev_status,
            state_after=IncidentStatus.CANCELLED.value,
            timestamp=now
        )
        db.add(stop_evt)

        for act in inc.actions:
            if act.approval_status == ApprovalStatus.PENDING.value:
                act.approval_status = ApprovalStatus.REJECTED.value
                act.rejection_reason = "Pipeline stopped by operator."

    db.commit()
    await event_bus.publish("incident_cancelled", {"message": "All active pipelines stopped by operator."})
    return {
        "success": True,
        "stopped_count": len(active_incidents),
        "message": f"Stopped {len(active_incidents)} active incident solving pipelines."
    }

@router.post("/{incident_id}/stop")
async def stop_incident_pipeline(incident_id: str, db: Session = Depends(get_db)):
    """
    Stops and cancels the solving pipeline for a specific incident.
    """
    inc = db.query(DBIncident).filter(DBIncident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    now = datetime.now(timezone.utc)
    prev_status = inc.status
    inc.status = IncidentStatus.CANCELLED.value
    inc.resolved_at = now

    stop_evt = DBTimelineEvent(
        id=str(uuid.uuid4()),
        incident_id=inc.id,
        actor="Human Operator",
        event="Pipeline execution manually stopped and cancelled by operator.",
        state_before=prev_status,
        state_after=IncidentStatus.CANCELLED.value,
        timestamp=now
    )
    db.add(stop_evt)

    for act in inc.actions:
        if act.approval_status == ApprovalStatus.PENDING.value:
            act.approval_status = ApprovalStatus.REJECTED.value
            act.rejection_reason = "Pipeline stopped by operator."

    db.commit()
    await event_bus.publish("incident_cancelled", {"incident_id": incident_id, "message": f"Pipeline for {incident_id} stopped."})
    return {
        "success": True,
        "incident_id": incident_id,
        "message": f"Pipeline for incident {incident_id} stopped and cancelled."
    }

@router.post("/clear-all")
async def clear_all_incident_history(db: Session = Depends(get_db)):
    """
    Permanently clears all incident history, evidence, diagnoses, actions, timelines, and postmortems from the database.
    """
    db.query(DBPostmortem).delete()
    db.query(DBTimelineEvent).delete()
    db.query(DBAction).delete()
    db.query(DBDiagnosis).delete()
    db.query(DBEvidence).delete()
    db.query(DBAuditEvent).delete()
    db.query(DBIncident).delete()
    db.commit()

    await event_bus.publish("history_cleared", {"message": "All incident history cleared."})
    return {
        "success": True,
        "message": "All incident records, actions, and history successfully cleared."
    }

