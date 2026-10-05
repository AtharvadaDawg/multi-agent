import asyncio
import random
import time
from datetime import datetime
from typing import Dict, Any, List, Optional
from app.core.models import TelemetryMetric, LogEntry

class CloudSandbox:
    """
    Simulates a live multi-service cloud environment with real-time metrics,
    logs, microservices state, and remediation response.
    """
    def __init__(self):
        self.services = {
            "order-service": {
                "version": "v1.4.2",
                "replicas": 3,
                "status": "HEALTHY",
                "cpu_base": 24.0,
                "mem_base": 42.0,
                "latency_base": 45.0,
                "error_rate_base": 0.05,
                "db_pool_size": 20,
                "active_connections": 8,
                "active_anomaly": None,
                "dependencies": ["postgres-db", "payment-gateway", "auth-service"]
            },
            "payment-gateway": {
                "version": "v2.1.0",
                "replicas": 2,
                "status": "HEALTHY",
                "cpu_base": 18.0,
                "mem_base": 35.0,
                "latency_base": 80.0,
                "error_rate_base": 0.01,
                "db_pool_size": 15,
                "active_connections": 4,
                "active_anomaly": None,
                "dependencies": ["bank-api-upstream", "postgres-db"]
            },
            "auth-service": {
                "version": "v3.0.1",
                "replicas": 2,
                "status": "HEALTHY",
                "cpu_base": 15.0,
                "mem_base": 30.0,
                "latency_base": 25.0,
                "error_rate_base": 0.02,
                "db_pool_size": 30,
                "active_connections": 6,
                "active_anomaly": None,
                "dependencies": ["redis-cache", "postgres-db"]
            },
            "postgres-db": {
                "version": "v15.3",
                "replicas": 1,
                "status": "HEALTHY",
                "cpu_base": 28.0,
                "mem_base": 55.0,
                "latency_base": 12.0,
                "error_rate_base": 0.0,
                "db_pool_size": 100,
                "active_connections": 18,
                "active_anomaly": None,
                "dependencies": []
            }
        }
        self._recent_logs: List[LogEntry] = []
        self._listeners: List[Any] = []

    def inject_anomaly(self, service_name: str, anomaly_type: str, severity: str = "HIGH", details: Dict[str, Any] = None):
        """Injects a failure condition into a specific simulated service."""
        if service_name not in self.services:
            raise ValueError(f"Unknown service {service_name}")
        
        self.services[service_name]["active_anomaly"] = {
            "type": anomaly_type,
            "severity": severity,
            "injected_at": time.time(),
            "details": details or {}
        }
        self.services[service_name]["status"] = "DEGRADED"

    def remediate_anomaly(self, service_name: str, action_type: str, parameters: Dict[str, Any] = None) -> Dict[str, Any]:
        """Applies a remediation action to heal the simulated service."""
        if service_name not in self.services:
            return {"success": False, "message": f"Service {service_name} not found"}
        
        svc = self.services[service_name]
        prev_status = svc["status"]
        action_log = f"Applied {action_type} on {service_name} with params {parameters}"
        
        # Apply healing logic based on action
        if action_type == "scale_replicas":
            target = parameters.get("target_count", svc["replicas"] + 2)
            svc["replicas"] = target
            if svc["active_anomaly"] and svc["active_anomaly"]["type"] == "cpu_saturation":
                svc["active_anomaly"] = None
                svc["status"] = "HEALTHY"
        elif action_type == "rollback_deployment":
            target_version = parameters.get("target_version", "v1.4.1")
            svc["version"] = target_version
            if svc["active_anomaly"] and svc["active_anomaly"]["type"] in ["failed_deployment", "error_spike"]:
                svc["active_anomaly"] = None
                svc["status"] = "HEALTHY"
        elif action_type == "resize_db_pool":
            new_size = parameters.get("new_pool_size", 80)
            svc["db_pool_size"] = new_size
            if svc["active_anomaly"] and svc["active_anomaly"]["type"] == "db_pool_exhaustion":
                svc["active_anomaly"] = None
                svc["status"] = "HEALTHY"
        elif action_type == "enable_circuit_breaker":
            if svc["active_anomaly"] and svc["active_anomaly"]["type"] == "dependency_failure":
                svc["active_anomaly"] = None
                svc["status"] = "HEALTHY"
        elif action_type == "restart_service":
            # Temporary cure for memory leaks or rogue threads
            if svc["active_anomaly"]:
                svc["active_anomaly"] = None
                svc["status"] = "HEALTHY"

        return {
            "success": True,
            "previous_status": prev_status,
            "current_status": svc["status"],
            "service": service_name,
            "action_executed": action_type,
            "message": f"Successfully applied {action_type}. Service is now {svc['status']}."
        }

    def sample_telemetry(self) -> Dict[str, List[TelemetryMetric]]:
        """Generates real-time metrics for all simulated services."""
        now_iso = datetime.utcnow().isoformat()
        metrics_by_service = {}

        for name, data in self.services.items():
            anomaly = data["active_anomaly"]
            
            # Baseline with Gaussian noise
            cpu = max(5.0, data["cpu_base"] + random.gauss(0, 2.0))
            mem = max(10.0, data["mem_base"] + random.gauss(0, 1.5))
            latency = max(5.0, data["latency_base"] + random.gauss(0, 5.0))
            err_rate = max(0.0, data["error_rate_base"] + random.gauss(0, 0.01))
            connections = max(1, data["active_connections"] + int(random.gauss(0, 1)))

            # Anomaly mutations
            if anomaly:
                atype = anomaly["type"]
                if atype == "cpu_saturation":
                    cpu = min(100.0, 94.5 + random.uniform(0, 5.0))
                    latency += 450.0
                elif atype == "error_spike":
                    err_rate = min(1.0, 0.42 + random.uniform(0, 0.15)) # 42-57% 5xx errors
                    latency += 180.0
                elif atype == "db_pool_exhaustion":
                    connections = data["db_pool_size"] # pool full
                    latency += 2800.0 # severe query wait
                    err_rate = min(1.0, 0.35 + random.uniform(0, 0.1))
                elif atype == "failed_deployment":
                    err_rate = min(1.0, 0.68 + random.uniform(0, 0.12))
                    latency += 320.0
                elif atype == "dependency_failure":
                    latency += 4200.0 # gateway timeout
                    err_rate = min(1.0, 0.28 + random.uniform(0, 0.08))

            metrics_by_service[name] = [
                TelemetryMetric(
                    metric_name="cpu_utilization",
                    value=round(cpu, 1),
                    unit="%",
                    timestamp=now_iso,
                    source=name,
                    threshold=85.0,
                    is_anomaly=(cpu >= 85.0),
                    anomaly_score=round(max(0.0, (cpu - 50.0) / 50.0), 2)
                ),
                TelemetryMetric(
                    metric_name="memory_utilization",
                    value=round(mem, 1),
                    unit="%",
                    timestamp=now_iso,
                    source=name,
                    threshold=85.0,
                    is_anomaly=(mem >= 85.0),
                    anomaly_score=round(max(0.0, (mem - 50.0) / 50.0), 2)
                ),
                TelemetryMetric(
                    metric_name="latency_p99",
                    value=round(latency, 1),
                    unit="ms",
                    timestamp=now_iso,
                    source=name,
                    threshold=500.0,
                    is_anomaly=(latency >= 500.0),
                    anomaly_score=round(max(0.0, (latency - 100.0) / 400.0), 2)
                ),
                TelemetryMetric(
                    metric_name="error_rate",
                    value=round(err_rate * 100, 2),
                    unit="%",
                    timestamp=now_iso,
                    source=name,
                    threshold=5.0,
                    is_anomaly=((err_rate * 100) >= 5.0),
                    anomaly_score=round(min(1.0, err_rate * 2.0), 2)
                ),
                TelemetryMetric(
                    metric_name="db_connections",
                    value=float(connections),
                    unit="conn",
                    timestamp=now_iso,
                    source=name,
                    threshold=float(data["db_pool_size"]),
                    is_anomaly=(connections >= data["db_pool_size"]),
                    anomaly_score=round(connections / max(data["db_pool_size"], 1), 2)
                )
            ]
        return metrics_by_service

    def generate_recent_logs(self, service_name: str, count: int = 5) -> List[LogEntry]:
        """Generates representative logs according to current service state."""
        svc = self.services.get(service_name)
        if not svc:
            return []
        
        now_iso = datetime.utcnow().isoformat()
        anomaly = svc["active_anomaly"]
        logs = []

        if not anomaly:
            logs.append(LogEntry(
                log_id=f"log-{int(time.time()*1000)}-1",
                timestamp=now_iso,
                service=service_name,
                severity="INFO",
                message=f"HTTP GET /api/v1/healthcheck status=200 duration=4.2ms replicas={svc['replicas']}"
            ))
            logs.append(LogEntry(
                log_id=f"log-{int(time.time()*1000)}-2",
                timestamp=now_iso,
                service=service_name,
                severity="INFO",
                message=f"Processed incoming request payload_size=1.2KB db_connections={svc['active_connections']}/{svc['db_pool_size']}"
            ))
        else:
            atype = anomaly["type"]
            if atype == "cpu_saturation":
                logs.append(LogEntry(
                    log_id=f"log-{int(time.time()*1000)}-err1",
                    timestamp=now_iso,
                    service=service_name,
                    severity="ERROR",
                    message="Process worker thread starvation: ThreadPoolExecutor saturated, queue length 1420"
                ))
                logs.append(LogEntry(
                    log_id=f"log-{int(time.time()*1000)}-err2",
                    timestamp=now_iso,
                    service=service_name,
                    severity="FATAL",
                    message="High CPU threshold breach: 96.8% utilization across 3 worker containers"
                ))
            elif atype == "error_spike":
                logs.append(LogEntry(
                    log_id=f"log-{int(time.time()*1000)}-err1",
                    timestamp=now_iso,
                    service=service_name,
                    severity="ERROR",
                    message="Unhandled exception in route /api/checkout: AttributeError: 'NoneType' object has no attribute 'get_rate'"
                ))
                logs.append(LogEntry(
                    log_id=f"log-{int(time.time()*1000)}-err2",
                    timestamp=now_iso,
                    service=service_name,
                    severity="ERROR",
                    message="HTTP 500 Internal Server Error returned to upstream client. Error count > 450 req/min"
                ))
            elif atype == "db_pool_exhaustion":
                logs.append(LogEntry(
                    log_id=f"log-{int(time.time()*1000)}-err1",
                    timestamp=now_iso,
                    service=service_name,
                    severity="CRITICAL",
                    message=f"FATAL: remaining connection slots are reserved for non-replication superuser connections. Pool exhausted ({svc['db_pool_size']}/{svc['db_pool_size']})"
                ))
                logs.append(LogEntry(
                    log_id=f"log-{int(time.time()*1000)}-err2",
                    timestamp=now_iso,
                    service=service_name,
                    severity="ERROR",
                    message="Timeout waiting for connection pool lease after 30000ms: query 'SELECT * FROM orders FOR UPDATE' queued"
                ))
            elif atype == "failed_deployment":
                logs.append(LogEntry(
                    log_id=f"log-{int(time.time()*1000)}-err1",
                    timestamp=now_iso,
                    service=service_name,
                    severity="CRITICAL",
                    message=f"Deployment rollout failed for revision {svc['version']}: Container crashed with exit code 137 (OOM / Schema Mismatch)"
                ))
            elif atype == "dependency_failure":
                logs.append(LogEntry(
                    log_id=f"log-{int(time.time()*1000)}-err1",
                    timestamp=now_iso,
                    service=service_name,
                    severity="ERROR",
                    message="Downstream dependency 'bank-api-upstream' failed to respond in 5000ms: ConnectTimeout"
                ))
        return logs

cloud_sandbox = CloudSandbox()
