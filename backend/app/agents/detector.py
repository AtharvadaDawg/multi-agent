import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List
from app.agents.base import BaseAgent
from app.core.models import AgentName, IncidentStatus, SeverityLevel, TelemetryMetric, LogEntry
from app.core.database import SessionLocal, DBIncident, DBEvidence
from app.core.event_bus import event_bus

logger = logging.getLogger("DetectorAgent")

class DetectorAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name=AgentName.DETECTOR,
            role_description="Identifies operational threshold breaches and statistical anomalies in telemetry and logs."
        )

    async def evaluate_telemetry_and_trigger(
        self,
        service: str,
        metrics: List[TelemetryMetric],
        logs: List[LogEntry],
        trigger_reason: str = "Automated Anomaly Detection"
    ) -> str:
        """
        Evaluates metrics for anomalies and raises a structured incident if breached.
        Returns: incident_id
        """
        # 1. Determine severity based on metric breach magnitude
        anomaly_metrics = [m for m in metrics if m.is_anomaly]
        if not anomaly_metrics and not any(l.severity in ["CRITICAL", "FATAL"] for l in logs):
            return "" # No breach

        severity = SeverityLevel.MEDIUM
        if any(m.anomaly_score >= 0.8 for m in anomaly_metrics) or any(l.severity == "CRITICAL" for l in logs):
            severity = SeverityLevel.HIGH
        if any(m.anomaly_score >= 0.95 for m in anomaly_metrics):
            severity = SeverityLevel.CRITICAL

        incident_id = f"INC-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        title = f"Degradation detected in {service}: {trigger_reason}"

        logger.info(f"[Detector] Triggered incident {incident_id} ({severity.value}) for service {service}")

        # 2. Persist Incident to DB
        with SessionLocal() as db:
            db_incident = DBIncident(
                id=incident_id,
                title=title,
                service=service,
                severity=severity.value,
                status=IncidentStatus.DETECTED.value,
                started_at=datetime.now(timezone.utc),
                initial_trigger=trigger_reason
            )
            db.add(db_incident)

            # Record Evidence items
            for m in anomaly_metrics:
                ev = DBEvidence(
                    id=str(uuid.uuid4()),
                    incident_id=incident_id,
                    source="CloudWatch/Prometheus",
                    type="metric",
                    reference=f"{m.metric_name}={m.value}{m.unit}",
                    relevance=float(m.anomaly_score),
                    payload_json=m.model_dump_json()
                )
                db.add(ev)

            for l in logs:
                if l.severity in ["ERROR", "CRITICAL", "FATAL"]:
                    ev = DBEvidence(
                        id=str(uuid.uuid4()),
                        incident_id=incident_id,
                        source="AppLogs",
                        type="log",
                        reference=f"[{l.severity}] {l.message[:80]}...",
                        relevance=0.9,
                        payload_json=l.model_dump_json()
                    )
                    db.add(ev)

            db.commit()

        # 3. Record Timeline & Publish Event
        await event_bus.record_timeline(
            incident_id=incident_id,
            actor=self.name,
            event=f"Anomaly detected: {trigger_reason}",
            state_before=None,
            state_after=IncidentStatus.DETECTED,
            details={"service": service, "severity": severity.value, "metric_count": len(anomaly_metrics)}
        )

        await event_bus.publish(
            incident_id=incident_id,
            event_type="incident_detected",
            producer=self.name,
            payload={
                "incident_id": incident_id,
                "service": service,
                "severity": severity.value,
                "title": title,
                "anomalous_metrics": [m.model_dump() for m in anomaly_metrics],
                "recent_logs": [l.model_dump() for l in logs]
            }
        )

        return incident_id

detector_agent = DetectorAgent()
