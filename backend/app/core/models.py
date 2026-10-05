import enum
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class IncidentStatus(str, enum.Enum):
    DETECTED = "DETECTED"
    INVESTIGATING = "INVESTIGATING"
    DIAGNOSED = "DIAGNOSED"
    ACTION_PROPOSED = "ACTION_PROPOSED"
    AWAITING_APPROVAL = "AWAITING_APPROVAL"
    REMEDIATING = "REMEDIATING"
    RESOLVED = "RESOLVED"
    DOCUMENTED = "DOCUMENTED"
    CLOSED = "CLOSED"
    FAILED_ESCALATED = "FAILED_ESCALATED"

class SeverityLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class RiskLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class ApprovalStatus(str, enum.Enum):
    NOT_REQUIRED = "NOT_REQUIRED"
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    AUTO_APPROVED = "AUTO_APPROVED"

class AgentName(str, enum.Enum):
    DETECTOR = "Detector"
    ANALYST = "Analyst"
    RESPONDER = "Responder"
    REPORTER = "Reporter"
    HUMAN_OPERATOR = "Human Operator"
    SYSTEM = "System"
    SINGLE_AGENT = "SingleAgentBaseline"

# Pydantic Schemas for API & Events

class TelemetryMetric(BaseModel):
    metric_name: str
    value: float
    unit: str = ""
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    source: str
    threshold: Optional[float] = None
    is_anomaly: bool = False
    anomaly_score: float = 0.0

class LogEntry(BaseModel):
    log_id: str
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    service: str
    severity: str = "INFO"
    message: str
    pattern: Optional[str] = None

class EvidenceItem(BaseModel):
    id: str
    incident_id: str
    source: str
    type: str # metric, log, deployment, topology, historical
    reference: str
    relevance: float = 1.0 # 0.0 to 1.0
    payload: Dict[str, Any] = {}

class DiagnosisOutput(BaseModel):
    incident_id: str
    root_cause: str
    confidence: float
    blast_radius: List[str]
    alternatives: List[str] = []
    evidence_ids: List[str] = []
    reasoning: str
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class RemediationProposal(BaseModel):
    action_id: str
    incident_id: str
    action_type: str # restart_service, rollback_deployment, scale_out, resize_db_pool, circuit_breaker
    title: str
    description: str
    risk: RiskLevel
    requires_human_approval: bool
    rationale: str
    rollback_plan: str
    target_resource: str
    parameters: Dict[str, Any] = {}
    approval_status: ApprovalStatus = ApprovalStatus.NOT_REQUIRED
    execution_result: Optional[Dict[str, Any]] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class TimelineEventModel(BaseModel):
    id: str
    incident_id: str
    actor: AgentName
    event: str
    state_before: Optional[IncidentStatus] = None
    state_after: Optional[IncidentStatus] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    details: Dict[str, Any] = {}

class PostmortemModel(BaseModel):
    id: str
    incident_id: str
    title: str
    summary: str
    root_cause: str
    impact: str
    remediation_summary: str
    action_items: List[str]
    lessons_learned: List[str]
    timeline: List[TimelineEventModel] = []
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class IncidentModel(BaseModel):
    id: str
    title: str
    service: str
    severity: SeverityLevel
    status: IncidentStatus
    started_at: str
    resolved_at: Optional[str] = None
    mttd_seconds: Optional[float] = None
    mttr_seconds: Optional[float] = None
    initial_trigger: str
    evidence: List[EvidenceItem] = []
    diagnosis: Optional[DiagnosisOutput] = None
    actions: List[RemediationProposal] = []
    timeline: List[TimelineEventModel] = []
    postmortem: Optional[PostmortemModel] = None

class AgentEventMessage(BaseModel):
    event_id: str
    incident_id: str
    event_type: str # incident_detected, context_enriched, diagnosis_ready, action_proposed, action_executed, incident_resolved, postmortem_created
    producer: AgentName
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    correlation_id: str
    schema_version: str = "1.0"
    payload: Dict[str, Any]

class AuditEventModel(BaseModel):
    id: str
    actor: str
    object: str
    action: str
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    decision: str
    evidence_ref: Optional[str] = None
    details: Dict[str, Any] = {}

class ApprovalDecisionRequest(BaseModel):
    action_id: str
    decision: str # "APPROVE", "REJECT", "REVISE"
    operator_name: str = "DevOps Engineer"
    notes: Optional[str] = None
