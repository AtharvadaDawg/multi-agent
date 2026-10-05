import json
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, Text, Boolean, DateTime, ForeignKey, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from app.core.config import settings

Base = declarative_base()

class DBIncident(Base):
    __tablename__ = "incidents"
    
    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    service = Column(String, index=True, nullable=False)
    severity = Column(String, nullable=False)
    status = Column(String, index=True, nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    mttd_seconds = Column(Float, nullable=True)
    mttr_seconds = Column(Float, nullable=True)
    initial_trigger = Column(Text, nullable=True)
    
    evidence = relationship("DBEvidence", back_populates="incident", cascade="all, delete-orphan")
    diagnosis = relationship("DBDiagnosis", back_populates="incident", uselist=False, cascade="all, delete-orphan")
    actions = relationship("DBAction", back_populates="incident", cascade="all, delete-orphan")
    timeline = relationship("DBTimelineEvent", back_populates="incident", cascade="all, delete-orphan")
    postmortem = relationship("DBPostmortem", back_populates="incident", uselist=False, cascade="all, delete-orphan")

class DBEvidence(Base):
    __tablename__ = "evidence"
    
    id = Column(String, primary_key=True, index=True)
    incident_id = Column(String, ForeignKey("incidents.id"), index=True)
    source = Column(String, nullable=False)
    type = Column(String, nullable=False)
    reference = Column(String, nullable=False)
    relevance = Column(Float, default=1.0)
    payload_json = Column(Text, default="{}")
    
    incident = relationship("DBIncident", back_populates="evidence")

class DBDiagnosis(Base):
    __tablename__ = "diagnoses"
    
    id = Column(String, primary_key=True, index=True)
    incident_id = Column(String, ForeignKey("incidents.id"), index=True)
    root_cause = Column(Text, nullable=False)
    confidence = Column(Float, nullable=False)
    blast_radius_json = Column(Text, default="[]")
    alternatives_json = Column(Text, default="[]")
    evidence_refs_json = Column(Text, default="[]")
    reasoning = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    incident = relationship("DBIncident", back_populates="diagnosis")

class DBAction(Base):
    __tablename__ = "actions"
    
    id = Column(String, primary_key=True, index=True)
    incident_id = Column(String, ForeignKey("incidents.id"), index=True)
    action_type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    risk = Column(String, nullable=False)
    requires_human_approval = Column(Boolean, default=False)
    rationale = Column(Text, nullable=False)
    rollback_plan = Column(Text, nullable=True)
    target_resource = Column(String, nullable=False)
    parameters_json = Column(Text, default="{}")
    approval_status = Column(String, default="NOT_REQUIRED")
    execution_result_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    incident = relationship("DBIncident", back_populates="actions")

class DBTimelineEvent(Base):
    __tablename__ = "timeline_events"
    
    id = Column(String, primary_key=True, index=True)
    incident_id = Column(String, ForeignKey("incidents.id"), index=True)
    actor = Column(String, nullable=False)
    event = Column(String, nullable=False)
    state_before = Column(String, nullable=True)
    state_after = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    details_json = Column(Text, default="{}")
    
    incident = relationship("DBIncident", back_populates="timeline")

class DBAgentEvent(Base):
    __tablename__ = "agent_events"
    
    id = Column(String, primary_key=True, index=True)
    incident_id = Column(String, index=True)
    event_type = Column(String, nullable=False)
    producer = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    correlation_id = Column(String, index=True)
    schema_version = Column(String, default="1.0")
    payload_json = Column(Text, default="{}")

class DBPostmortem(Base):
    __tablename__ = "postmortems"
    
    id = Column(String, primary_key=True, index=True)
    incident_id = Column(String, ForeignKey("incidents.id"), index=True)
    title = Column(String, nullable=False)
    summary = Column(Text, nullable=False)
    root_cause = Column(Text, nullable=False)
    impact = Column(Text, nullable=False)
    remediation_summary = Column(Text, nullable=False)
    action_items_json = Column(Text, default="[]")
    lessons_learned_json = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    incident = relationship("DBIncident", back_populates="postmortem")

class DBAuditEvent(Base):
    __tablename__ = "audit_events"
    
    id = Column(String, primary_key=True, index=True)
    actor = Column(String, nullable=False)
    object = Column(String, nullable=False)
    action = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    decision = Column(String, nullable=False)
    evidence_ref = Column(String, nullable=True)
    details_json = Column(Text, default="{}")

class DBKnowledgeItem(Base):
    __tablename__ = "knowledge_items"
    
    id = Column(String, primary_key=True, index=True)
    incident_id = Column(String, index=True)
    service = Column(String, index=True)
    root_cause = Column(Text, nullable=False)
    remediation = Column(Text, nullable=False)
    lessons = Column(Text, nullable=False)
    keywords = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class DBBenchmarkRun(Base):
    __tablename__ = "benchmark_runs"
    
    id = Column(String, primary_key=True, index=True)
    scenario_id = Column(String, nullable=False)
    approach = Column(String, nullable=False) # "multi_agent" or "single_agent"
    root_cause_accuracy = Column(Float, default=0.0)
    diagnosis_time_seconds = Column(Float, default=0.0)
    remediation_quality_score = Column(Float, default=0.0)
    token_usage = Column(Integer, default=0)
    safety_violations = Column(Integer, default=0)
    timestamp = Column(DateTime, default=datetime.utcnow)
    details_json = Column(Text, default="{}")

# Engine & Session setup
engine = create_engine(settings.SYNC_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
