from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db, DBKnowledgeItem, DBPostmortem
from app.engine.knowledge_store import knowledge_store

router = APIRouter(prefix="/knowledge", tags=["Incident Knowledge Base"])

@router.get("", response_model=List[Dict[str, Any]])
def list_knowledge_items(db: Session = Depends(get_db)):
    """Returns all historical incident knowledge records."""
    items = db.query(DBKnowledgeItem).order_by(DBKnowledgeItem.created_at.desc()).all()
    return [{
        "id": item.id,
        "incident_id": item.incident_id,
        "service": item.service,
        "root_cause": item.root_cause,
        "remediation": item.remediation,
        "lessons": item.lessons,
        "keywords": item.keywords,
        "created_at": item.created_at.isoformat() if item.created_at else ""
    } for item in items]

@router.get("/search", response_model=List[Dict[str, Any]])
def search_knowledge(
    query: str = Query(..., description="Symptom, error message, or service name"),
    service: Optional[str] = None,
    top_k: int = 5
):
    """Searches historical incident postmortems using similarity ranking."""
    return knowledge_store.search_similar(query=query, service=service, top_k=top_k)
