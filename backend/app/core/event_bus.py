import asyncio
import json
import logging
import uuid
from datetime import datetime
from typing import Callable, Dict, List, Any, Awaitable
from app.core.models import AgentEventMessage, TimelineEventModel, AgentName, IncidentStatus
from app.core.database import SessionLocal, DBAgentEvent, DBTimelineEvent

logger = logging.getLogger("EventBus")

class AsyncEventBus:
    def __init__(self):
        self._subscribers: Dict[str, List[Callable[[AgentEventMessage], Awaitable[None]]]] = {}
        self._ws_listeners: List[Callable[[Dict[str, Any]], Awaitable[None]]] = []
        self._lock = asyncio.Lock()

    def subscribe(self, event_type: str, handler: Callable[[AgentEventMessage], Awaitable[None]]):
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        self._subscribers[event_type].append(handler)

    def register_ws_listener(self, listener: Callable[[Dict[str, Any]], Awaitable[None]]):
        if listener not in self._ws_listeners:
            self._ws_listeners.append(listener)

    def unregister_ws_listener(self, listener: Callable[[Dict[str, Any]], Awaitable[None]]):
        if listener in self._ws_listeners:
            self._ws_listeners.remove(listener)

    async def broadcast_ws(self, message: Dict[str, Any]):
        for ws in list(self._ws_listeners):
            try:
                await ws(message)
            except Exception as e:
                logger.error(f"Error sending message to websocket listener: {e}")

    async def publish(
        self,
        incident_id: str,
        event_type: str,
        producer: AgentName,
        payload: Dict[str, Any],
        correlation_id: str = None
    ) -> AgentEventMessage:
        if correlation_id is None:
            correlation_id = str(uuid.uuid4())
            
        event_msg = AgentEventMessage(
            event_id=str(uuid.uuid4()),
            incident_id=incident_id,
            event_type=event_type,
            producer=producer,
            timestamp=datetime.utcnow().isoformat(),
            correlation_id=correlation_id,
            payload=payload
        )

        # 1. Persist Agent Event to DB
        try:
            with SessionLocal() as db:
                db_event = DBAgentEvent(
                    id=event_msg.event_id,
                    incident_id=incident_id,
                    event_type=event_type,
                    producer=producer.value if hasattr(producer, 'value') else str(producer),
                    timestamp=datetime.utcnow(),
                    correlation_id=correlation_id,
                    schema_version=event_msg.schema_version,
                    payload_json=json.dumps(payload)
                )
                db.add(db_event)
                db.commit()
        except Exception as e:
            logger.error(f"Failed to persist agent event to database: {e}")

        # 2. Broadcast to UI over WebSockets
        await self.broadcast_ws({
            "type": "AGENT_EVENT",
            "data": event_msg.model_dump()
        })

        # 3. Notify Python Subscribers
        handlers = self._subscribers.get(event_type, [])
        handlers_all = self._subscribers.get("*", [])
        
        all_handlers = handlers + handlers_all
        if all_handlers:
            async def run_handlers():
                for handler in all_handlers:
                    try:
                        await handler(event_msg)
                    except Exception as e:
                        logger.error(f"Error in event handler for {event_type}: {e}", exc_info=True)
            asyncio.create_task(run_handlers())

        return event_msg

    async def record_timeline(
        self,
        incident_id: str,
        actor: AgentName,
        event: str,
        state_before: IncidentStatus = None,
        state_after: IncidentStatus = None,
        details: Dict[str, Any] = None
    ):
        if details is None:
            details = {}
            
        timeline_id = str(uuid.uuid4())
        timestamp_str = datetime.utcnow().isoformat()
        
        # Persist to DB
        try:
            with SessionLocal() as db:
                db_timeline = DBTimelineEvent(
                    id=timeline_id,
                    incident_id=incident_id,
                    actor=actor.value if hasattr(actor, 'value') else str(actor),
                    event=event,
                    state_before=state_before.value if state_before else None,
                    state_after=state_after.value if state_after else None,
                    timestamp=datetime.utcnow(),
                    details_json=json.dumps(details)
                )
                db.add(db_timeline)
                db.commit()
        except Exception as e:
            logger.error(f"Failed to persist timeline event: {e}")

        # Broadcast Timeline Event
        await self.broadcast_ws({
            "type": "TIMELINE_EVENT",
            "data": {
                "id": timeline_id,
                "incident_id": incident_id,
                "actor": actor.value if hasattr(actor, 'value') else str(actor),
                "event": event,
                "state_before": state_before.value if state_before else None,
                "state_after": state_after.value if state_after else None,
                "timestamp": timestamp_str,
                "details": details
            }
        })

event_bus = AsyncEventBus()
