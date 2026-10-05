import json
import logging
import uuid
from datetime import datetime
from typing import Dict, Any, List
from app.agents.base import BaseAgent
from app.core.models import (
    AgentName, IncidentStatus, AgentEventMessage, PostmortemModel
)
from app.core.database import SessionLocal, DBIncident, DBPostmortem, DBTimelineEvent
from app.core.event_bus import event_bus
from app.engine.knowledge_store import knowledge_store

logger = logging.getLogger("ReporterAgent")

SYSTEM_REPORTER_PROMPT = """You are an expert DevOps Incident Commander and Technical SRE Postmortem Writer.
Your role is to compile a thorough, blameless postmortem report for an operational incident that has just been resolved.

Postmortem Structure:
- Title: Clear description of the incident
- Summary: Executive summary of what happened, customer impact, and resolution
- Root Cause: In-depth technical breakdown of the underlying defect/trigger
- Impact: Services degraded, duration, business/user impact
- Remediation Summary: Actions executed to restore health
- Action Items: 3-5 concrete preventive engineering items (e.g. alerts, tests, runbook additions)
- Lessons Learned: 2-3 operational insights gained

Output format must be valid JSON:
{
  "title": "<title>",
  "summary": "<executive summary>",
  "root_cause": "<root cause>",
  "impact": "<impact>",
  "remediation_summary": "<remediation summary>",
  "action_items": ["item 1", "item 2", "item 3"],
  "lessons_learned": ["lesson 1", "lesson 2"]
}
"""

class ReporterAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name=AgentName.REPORTER,
            role_description="Synthesizes structured blameless postmortems and updates organizational incident memory."
        )

    async def handle_incident_resolved(self, event: AgentEventMessage):
        """Processes an incident_resolved event and generates postmortem documentation."""
        incident_id = event.incident_id
        payload = event.payload
        service = payload.get("service", "unknown-service")

        logger.info(f"[Reporter] Synthesizing postmortem for resolved incident {incident_id} on {service}...")

        # 1. Fetch full incident context and timeline from DB
        with SessionLocal() as db:
            inc = db.query(DBIncident).filter(DBIncident.id == incident_id).first()
            if not inc:
                logger.error(f"Incident {incident_id} not found for postmortem generation.")
                return

            diag_text = inc.diagnosis.root_cause if inc.diagnosis else "Underlying service degradation"
            diag_reasoning = inc.diagnosis.reasoning if inc.diagnosis else ""
            actions_summary = "; ".join([f"{a.title} ({a.action_type})" for a in inc.actions])
            
            timeline_items = db.query(DBTimelineEvent).filter(DBTimelineEvent.incident_id == incident_id).order_by(DBTimelineEvent.timestamp).all()
            timeline_str = "\n".join([f"- [{t.timestamp}] {t.actor}: {t.event}" for t in timeline_items])

            duration_sec = inc.mttr_seconds if inc.mttr_seconds else 60.0

        # 2. Call LLM to generate structured postmortem
        user_prompt = f"""
Incident ID: {incident_id}
Service: {service}
Severity: {inc.severity}
Incident Duration: {duration_sec} seconds
Diagnosed Root Cause: {diag_text}
Detailed Reasoning: {diag_reasoning}
Actions Taken: {actions_summary}

Chronological Timeline:
{timeline_str}
"""
        schema_hint = '{"title": "string", "summary": "string", "root_cause": "string", "impact": "string", "remediation_summary": "string", "action_items": ["item1"], "lessons_learned": ["lesson1"]}'
        llm_resp = await self.call_llm(SYSTEM_REPORTER_PROMPT, user_prompt, structured_schema_hint=schema_hint)

        # 3. Parse JSON response
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
            pm_title = parsed.get("title", f"Postmortem: {service} Service Incident")
            summary = parsed.get("summary", f"Degradation on {service} detected and resolved automatically.")
            root_cause = parsed.get("root_cause", diag_text)
            impact = parsed.get("impact", f"Temporary latency and error rate elevation on {service} for {duration_sec}s.")
            remediation_summary = parsed.get("remediation_summary", actions_summary)
            action_items = parsed.get("action_items", [
                f"Add automated canary verification tests for {service}",
                "Tune anomaly threshold alerts in monitoring dashboard",
                "Update standard runbook documentation"
            ])
            lessons_learned = parsed.get("lessons_learned", [
                "Early anomaly detection significantly reduces overall MTTR.",
                "Automated risk classification enables safe rapid remediation."
            ])
        except Exception as e:
            logger.warning(f"Failed to parse LLM postmortem JSON: {e}. Generating fallback postmortem.")
            pm_title = f"Postmortem: {service} Degradation Incident"
            summary = f"An incident on {service} was detected by telemetry monitoring, diagnosed, and resolved within {duration_sec}s."
            root_cause = diag_text
            impact = f"Elevated latency and error rates observed on {service}."
            remediation_summary = actions_summary
            action_items = [
                f"Review resource quotas and scaling thresholds for {service}",
                "Automate pre-deployment load test verification"
            ]
            lessons_learned = [
                "Event-driven agent collaboration reduces diagnostic time.",
                "Human approval gates safeguard production stability."
            ]

        # 4. Persist Postmortem to DB
        postmortem_id = f"PM-{uuid.uuid4().hex[:6].upper()}"
        with SessionLocal() as db:
            db_pm = DBPostmortem(
                id=postmortem_id,
                incident_id=incident_id,
                title=pm_title,
                summary=summary,
                root_cause=root_cause,
                impact=impact,
                remediation_summary=remediation_summary,
                action_items_json=json.dumps(action_items),
                lessons_learned_json=json.dumps(lessons_learned),
                created_at=datetime.utcnow()
            )
            db.add(db_pm)

            inc = db.query(DBIncident).filter(DBIncident.id == incident_id).first()
            if inc:
                inc.status = IncidentStatus.DOCUMENTED.value
            db.commit()

        # 5. Index into Knowledge Store for future similarity queries
        keywords = f"{service} {root_cause} {remediation_summary} " + " ".join(action_items)
        knowledge_store.store_incident(
            incident_id=incident_id,
            service=service,
            root_cause=root_cause,
            remediation=remediation_summary,
            lessons="; ".join(lessons_learned),
            keywords=keywords
        )

        # 6. Record Timeline & Publish postmortem_created
        await event_bus.record_timeline(
            incident_id=incident_id,
            actor=self.name,
            event=f"Postmortem documented: '{pm_title}'. Indexed into organizational knowledge base.",
            state_before=IncidentStatus.RESOLVED,
            state_after=IncidentStatus.DOCUMENTED,
            details={"postmortem_id": postmortem_id, "action_items_count": len(action_items)}
        )

        await event_bus.publish(
            incident_id=incident_id,
            event_type="postmortem_created",
            producer=self.name,
            payload={
                "incident_id": incident_id,
                "postmortem_id": postmortem_id,
                "title": pm_title,
                "summary": summary,
                "root_cause": root_cause,
                "impact": impact,
                "remediation_summary": remediation_summary,
                "action_items": action_items,
                "lessons_learned": lessons_learned
            }
        )

reporter_agent = ReporterAgent()
