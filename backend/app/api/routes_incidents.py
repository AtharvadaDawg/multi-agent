import json
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db, DBIncident, DBEvidence, DBDiagnosis, DBAction, DBTimelineEvent, DBPostmortem
from app.core.models import IncidentModel, EvidenceItem, DiagnosisOutput, RemediationProposal, TimelineEventModel, PostmortemModel
from app.engine.sandbox_cloud import cloud_sandbox

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
def get_live_telemetry():
    """Returns real-time telemetry from all sandbox microservices."""
    telemetry = cloud_sandbox.sample_telemetry()
    return {
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
                "description": "Monitors multi-source metric thresholds and log patterns."
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
                "description": "Evaluates risk policies, requests approval, and orchestrates runbooks."
            },
            {
                "name": "Reporter",
                "role": "Postmortem & Learning",
                "status": "ONLINE",
                "description": "Compiles post-incident timeline, action items, and updates knowledge base."
            }
        ]
    }
