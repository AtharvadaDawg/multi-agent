import logging
from typing import Dict, Any, Tuple
from app.core.models import RiskLevel, ApprovalStatus

logger = logging.getLogger("ApprovalPolicy")

# Action risk matrix definition
ACTION_RISK_MATRIX: Dict[str, Tuple[RiskLevel, bool]] = {
    # action_type: (RiskLevel, requires_human_approval)
    # AWS Remediation Actions
    "restart_application_service": (RiskLevel.LOW, False),
    "stop_runaway_process": (RiskLevel.LOW, False),
    "reboot_ec2_instance": (RiskLevel.HIGH, True),
    
    # Generic / Sandbox Actions
    "scale_replicas": (RiskLevel.LOW, False),
    "clear_non_critical_cache": (RiskLevel.LOW, False),
    "enable_query_cache": (RiskLevel.LOW, False),
    "enable_circuit_breaker": (RiskLevel.MEDIUM, False),
    "increase_rate_limit": (RiskLevel.MEDIUM, False),
    "restart_service": (RiskLevel.MEDIUM, True),
    "rollback_deployment": (RiskLevel.HIGH, True),
    "resize_db_pool": (RiskLevel.HIGH, True),
    "failover_database": (RiskLevel.HIGH, True),
    "terminate_traffic_route": (RiskLevel.CRITICAL, True),
    "force_restart_database": (RiskLevel.CRITICAL, True),
}

class ApprovalPolicyEngine:
    @staticmethod
    def evaluate(action_type: str, parameters: Dict[str, Any] = None) -> Tuple[RiskLevel, bool, ApprovalStatus]:
        """
        Determines risk level and approval requirement based on action type and parameters.
        Returns: (RiskLevel, requires_human_approval, initial_approval_status)
        """
        if parameters is None:
            parameters = {}

        # Look up baseline policy
        base_risk, requires_human = ACTION_RISK_MATRIX.get(
            action_type, 
            (RiskLevel.HIGH, True) # Default unknown actions to HIGH risk
        )

        # Dynamic risk modifiers
        # E.g., scaling up by more than 5 instances escalates to HIGH
        if action_type == "scale_replicas":
            delta = parameters.get("delta", 1)
            target = parameters.get("target_count", 2)
            if delta > 3 or target > 5:
                base_risk = RiskLevel.MEDIUM
                requires_human = True

        # Database pool resize exceeding 200% escalates risk
        if action_type == "resize_db_pool":
            new_pool_size = parameters.get("new_pool_size", 50)
            if new_pool_size > 100:
                base_risk = RiskLevel.CRITICAL

        initial_status = ApprovalStatus.PENDING if requires_human else ApprovalStatus.AUTO_APPROVED
        return base_risk, requires_human, initial_status
