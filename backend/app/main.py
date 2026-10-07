import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db, SessionLocal, DBIncident
from app.core.event_bus import event_bus
from app.core.models import IncidentStatus
from app.agents.detector import detector_agent
from app.agents.analyst import analyst_agent
from app.agents.responder import responder_agent
from app.agents.reporter import reporter_agent
from app.engine.sandbox_cloud import cloud_sandbox
from app.engine.aws_telemetry import aws_telemetry_service
from app.engine.aws_client import aws_client_manager
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
    """
    Periodically samples telemetry (from AWS CloudWatch or Cloud Sandbox)
    and broadcasts via WebSocket, feeding the Detector Agent if anomalies are observed.
    """
    is_aws = settings.TELEMETRY_SOURCE.lower() == "aws"
    logger.info(f"Starting Telemetry Broadcast Loop in mode: {'AWS CloudWatch' if is_aws else 'Cloud Sandbox'}")

    while True:
        try:
            if is_aws:
                telemetry = await aws_telemetry_service.sample_live_telemetry()
                services_info = aws_telemetry_service.get_services_topology()
                target_service = aws_telemetry_service.get_target_service_name()
                metrics = telemetry.get(target_service, [])

                # Broadcast via WebSocket to UI
                await event_bus.broadcast_ws({
                    "type": "TELEMETRY_UPDATE",
                    "data": {
                        "services": services_info,
                        "metrics": {s: [m.model_dump() for m in m_list] for s, m_list in telemetry.items()}
                    }
                })

                # Check if an anomaly occurred on the live AWS instance
                has_anomaly = any(m.is_anomaly for m in metrics)
                if has_anomaly:
                    # Check if there is already an active incident for this service to avoid duplicate triggers
                    with SessionLocal() as db:
                        active_inc = db.query(DBIncident).filter(
                            DBIncident.service == target_service,
                            DBIncident.status.in_([
                                IncidentStatus.DETECTED.value,
                                IncidentStatus.INVESTIGATING.value,
                                IncidentStatus.DIAGNOSED.value,
                                IncidentStatus.ACTION_PROPOSED.value,
                                IncidentStatus.AWAITING_APPROVAL.value,
                                IncidentStatus.REMEDIATING.value
                            ])
                        ).first()

                    if not active_inc:
                        instance_id = aws_telemetry_service.get_target_instance_id()
                        logs = await aws_telemetry_service.fetch_cloudwatch_logs(instance_id)
                        logger.info(f"[AWS Monitor] High CPU detected on {instance_id}. Triggering Detector Agent...")
                        await detector_agent.evaluate_telemetry_and_trigger(
                            service=target_service,
                            metrics=metrics,
                            logs=logs,
                            trigger_reason=f"CloudWatch CPUUtilization > {settings.AWS_CPU_THRESHOLD_PERCENT}% on {instance_id}"
                        )

            else:
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

        # In AWS mode, sleep 5s to avoid excessive CloudWatch rate limits; in simulator mode sleep interval
        sleep_dur = 5.0 if is_aws else settings.TELEMETRY_INTERVAL_SECONDS
        await asyncio.sleep(sleep_dur)

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

    # 3. Check AWS Connectivity if in AWS mode
    if settings.TELEMETRY_SOURCE.lower() == "aws":
        conn = aws_client_manager.check_connectivity()
        if conn.get("connected"):
            logger.info(f"AWS Credentials Verified. Account: {conn.get('account')}, Region: {conn.get('region')}")
        else:
            logger.warning(f"AWS Mode configured but connection check reported: {conn.get('error')}")

    # 4. Start Telemetry Background Task
    global telemetry_task
    telemetry_task = asyncio.create_task(telemetry_broadcast_loop())
    logger.info(f"SleuthOps Multi-Agent System started successfully (Telemetry Mode: {settings.TELEMETRY_SOURCE}).")

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
    is_aws = settings.TELEMETRY_SOURCE.lower() == "aws"
    return {
        "status": "ONLINE",
        "system": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "telemetry_source": settings.TELEMETRY_SOURCE,
        "aws_configured": bool(settings.AWS_EC2_INSTANCE_ID) if is_aws else False,
        "target_instance": settings.AWS_EC2_INSTANCE_ID if is_aws else None,
        "agents": ["Detector", "Analyst", "Responder", "Reporter"]
    }
