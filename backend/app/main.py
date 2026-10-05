import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db
from app.core.event_bus import event_bus
from app.agents.analyst import analyst_agent
from app.agents.responder import responder_agent
from app.agents.reporter import reporter_agent
from app.engine.sandbox_cloud import cloud_sandbox
from app.api.routes_incidents import router as incidents_router
from app.api.routes_approvals import router as approvals_router
from app.api.routes_scenarios import router as scenarios_router
from app.api.routes_benchmark import router as benchmark_router
from app.api.routes_knowledge import router as knowledge_router
from app.api.websocket import router as ws_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("AppMain")

# Background Telemetry Stream Task
telemetry_task = None

async def telemetry_broadcast_loop():
    """Periodically samples cloud sandbox telemetry and broadcasts via WebSocket."""
    while True:
        try:
            telemetry = cloud_sandbox.sample_telemetry()
            services_info = cloud_sandbox.services
            await event_bus.broadcast_ws({
                "type": "TELEMETRY_UPDATE",
                "data": {
                    "services": services_info,
                    "metrics": {s: [m.model_dump() for m in m_list] for s, m_list in telemetry.items()}
                }
            })
        except Exception as e:
            logger.debug(f"Telemetry loop error: {e}")
        await asyncio.sleep(settings.TELEMETRY_INTERVAL_SECONDS)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize SQLite Database
    logger.info("Initializing incident database...")
    init_db()

    # 2. Register Agent Event Bus Subscriptions
    logger.info("Registering agent workflow subscriptions...")
    event_bus.subscribe("incident_detected", analyst_agent.handle_incident_detected)
    event_bus.subscribe("diagnosis_ready", responder_agent.handle_diagnosis_ready)
    event_bus.subscribe("incident_resolved", reporter_agent.handle_incident_resolved)

    # 3. Start Telemetry Background Task
    global telemetry_task
    telemetry_task = asyncio.create_task(telemetry_broadcast_loop())
    logger.info("Multi-Agent Incident Management System started successfully.")

    yield

    # Cleanup
    if telemetry_task:
        telemetry_task.cancel()
    logger.info("Application shutting down.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(incidents_router, prefix=settings.API_PREFIX)
app.include_router(approvals_router, prefix=settings.API_PREFIX)
app.include_router(scenarios_router, prefix=settings.API_PREFIX)
app.include_router(benchmark_router, prefix=settings.API_PREFIX)
app.include_router(knowledge_router, prefix=settings.API_PREFIX)
app.include_router(ws_router)

@app.get("/")
def health_check():
    return {
        "status": "ONLINE",
        "system": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "agents": ["Detector", "Analyst", "Responder", "Reporter"]
    }
