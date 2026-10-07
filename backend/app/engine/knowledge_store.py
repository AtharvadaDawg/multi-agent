import logging
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from app.core.database import SessionLocal, DBKnowledgeItem, Base, engine

logger = logging.getLogger("KnowledgeStore")

# Default historical seed incidents (to demonstrate retrieval out-of-the-box)
DEFAULT_SEEDS = [
    {
        "incident_id": "INC-HIST-001",
        "service": "payment-api",
        "root_cause": "Database connection pool starvation due to unindexed queries and high concurrent transactions.",
        "remediation": "Resized connection pool from 20 to 80 and added circuit breaker on payment timeout.",
        "lessons": "Ensure all database calls have connection timeout guards and keep pooling sized to 2x peak worker threads.",
        "keywords": "db pool connection exhaustion timeout database postgresql query starvation leak"
    },
    {
        "incident_id": "INC-HIST-002",
        "service": "auth-service",
        "root_cause": "CPU saturation caused by recursive JWT validation loop during certificate rotation.",
        "remediation": "Rolled back configuration changes and cleared auth token validation cache.",
        "lessons": "Add recursion limits to cryptographic key fetching and cache public keys locally.",
        "keywords": "cpu saturation 100% auth jwt high load spike loop starvation"
    },
    {
        "incident_id": "INC-HIST-003",
        "service": "frontend-web",
        "root_cause": "HTTP 500 spike triggered by breaking API schema change in v2.4.0 canary rollout.",
        "remediation": "Triggered automated canary rollback to stable version v2.3.9.",
        "lessons": "Enforce contract testing in CI pipeline before canary traffic shift.",
        "keywords": "500 error spike failed deployment canary release breaking change http 502 bad gateway"
    },
    {
        "incident_id": "INC-HIST-004",
        "service": "order-processor",
        "root_cause": "Downstream payment gateway latency spike (>5000ms) caused queue backup and thread pool depletion.",
        "remediation": "Enabled fallback circuit breaker to queue payments asynchronously in dead-letter-queue.",
        "lessons": "Always wrap external HTTP clients with short timeouts (max 1.5s) and bulkheading.",
        "keywords": "dependency failure 3rd party third party timeout payment gateway latency queue overflow"
    }
]

class IncidentKnowledgeStore:
    def ensure_seeded(self):
        """Ensures seed knowledge exists in the database."""
        try:
            Base.metadata.create_all(bind=engine)
            with SessionLocal() as db:
                count = db.query(DBKnowledgeItem).count()
                if count == 0:
                    for seed in DEFAULT_SEEDS:
                        item = DBKnowledgeItem(
                            id=str(uuid.uuid4()),
                            incident_id=seed["incident_id"],
                            service=seed["service"],
                            root_cause=seed["root_cause"],
                            remediation=seed["remediation"],
                            lessons=seed["lessons"],
                            keywords=seed["keywords"],
                            created_at=datetime.now(timezone.utc)
                        )
                        db.add(item)
                    db.commit()
                    logger.info("Seeded initial incident knowledge base.")
        except Exception as e:
            logger.debug(f"Knowledge store seeding notice: {e}")

    def store_incident(
        self,
        incident_id: str,
        service: str,
        root_cause: str,
        remediation: str,
        lessons: str,
        keywords: str
    ) -> str:
        """Stores a newly documented incident into the searchable knowledge base."""
        self.ensure_seeded()
        item_id = str(uuid.uuid4())
        try:
            with SessionLocal() as db:
                item = DBKnowledgeItem(
                    id=item_id,
                    incident_id=incident_id,
                    service=service,
                    root_cause=root_cause,
                    remediation=remediation,
                    lessons=lessons,
                    keywords=keywords,
                    created_at=datetime.now(timezone.utc)
                )
                db.add(item)
                db.commit()
                logger.info(f"Stored incident {incident_id} in knowledge base.")
                return item_id
        except Exception as e:
            logger.error(f"Failed to store knowledge item: {e}")
            return ""

    def search_similar(self, query: str, service: Optional[str] = None, top_k: int = 3) -> List[Dict[str, Any]]:
        """
        Retrieves top-k historical incident records matching the symptoms/keywords.
        """
        self.ensure_seeded()
        query_words = set(query.lower().replace("-", " ").replace("_", " ").split())
        results = []

        try:
            with SessionLocal() as db:
                items = db.query(DBKnowledgeItem).all()
                for item in items:
                    target_text = f"{item.service} {item.root_cause} {item.remediation} {item.keywords}".lower()
                    target_words = set(target_text.split())
                    
                    # Compute Jaccard / Overlap similarity
                    intersection = query_words.intersection(target_words)
                    if not intersection:
                        score = 0.0
                    else:
                        score = len(intersection) / max(len(query_words), 1)
                        if service and item.service.lower() == service.lower():
                            score += 0.5

                    if score > 0.05:
                        results.append({
                            "id": item.id,
                            "incident_id": item.incident_id,
                            "service": item.service,
                            "root_cause": item.root_cause,
                            "remediation": item.remediation,
                            "lessons": item.lessons,
                            "similarity_score": round(min(score, 1.0), 3),
                            "created_at": item.created_at.isoformat() if item.created_at else ""
                        })

                results.sort(key=lambda x: x["similarity_score"], reverse=True)
                return results[:top_k]
        except Exception as e:
            logger.error(f"Error querying knowledge store: {e}")
            return []

knowledge_store = IncidentKnowledgeStore()
