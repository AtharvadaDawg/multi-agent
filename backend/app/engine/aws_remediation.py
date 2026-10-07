import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from botocore.exceptions import ClientError
from app.core.config import settings
from app.engine.aws_client import aws_client_manager

logger = logging.getLogger("AWSRemediation")

# Strict, predefined allowlist of permissible AWS remediation actions.
# The LLM and agents can ONLY select from this allowlist; arbitrary commands are strictly prohibited.
ALLOWED_AWS_ACTIONS = {
    "restart_application_service": {
        "title": "Restart Application Service on EC2",
        "description": "Restarts the demo application service / worker processes on the target EC2 instance via AWS Systems Manager.",
        "method": "ssm",
        "command": "sudo systemctl restart demo-app 2>/dev/null || sudo pkill -f 'stress-ng|stress|cpu_burn|python.*stress' || true",
        "reversible": True
    },
    "stop_runaway_process": {
        "title": "Terminate CPU Runaway Stress Process",
        "description": "Sends SIGTERM/SIGKILL to runaway CPU stress worker processes on the EC2 instance via AWS Systems Manager.",
        "method": "ssm",
        "command": "sudo pkill -f 'stress-ng|stress|cpu_burn|python.*stress' || sudo killall -9 stress-ng stress 2>/dev/null || true",
        "reversible": True
    },
    "reboot_ec2_instance": {
        "title": "Reboot AWS EC2 Instance",
        "description": "Initiates a clean OS reboot of the target EC2 instance via AWS EC2 API.",
        "method": "ec2_reboot",
        "reversible": False
    }
}

class AWSRemediationService:
    """
    Dedicated AWS remediation service that executes vetted, allowlisted actions
    against live AWS infrastructure using AWS Systems Manager (SSM) and EC2 APIs.
    """
    def is_action_allowed(self, action_type: str) -> bool:
        return action_type in ALLOWED_AWS_ACTIONS

    async def execute_remediation(
        self,
        action_type: str,
        instance_id: Optional[str] = None,
        parameters: Optional[Dict[str, Any]] = None,
        operator: str = "ResponderAgent"
    ) -> Dict[str, Any]:
        """
        Executes a pre-vetted AWS action from the allowlist against the target EC2 instance.
        """
        instance_id = instance_id or settings.AWS_EC2_INSTANCE_ID
        if not instance_id:
            return {
                "success": False,
                "error": "No AWS_EC2_INSTANCE_ID configured in settings or parameters.",
                "action_type": action_type
            }

        # 1. Strict Allowlist Security Check
        if not self.is_action_allowed(action_type):
            logger.error(f"[SECURITY ALERT] Attempted execution of unapproved action: '{action_type}'. Aborting.")
            return {
                "success": False,
                "error": f"Security Violation: Action '{action_type}' is not in the approved ALLOWED_AWS_ACTIONS allowlist.",
                "action_type": action_type
            }

        action_def = ALLOWED_AWS_ACTIONS[action_type]
        method = action_def.get("method")
        logger.info(f"[AWS Remediation] Executing allowlisted action '{action_type}' on instance {instance_id} via {method} by {operator}...")

        timestamp_start = datetime.now(timezone.utc).isoformat()

        # 2. Dispatch by Remediation Method
        try:
            if method == "ssm":
                result = await self._execute_ssm_command(instance_id, action_def["command"])
            elif method == "ec2_reboot":
                result = await self._execute_ec2_reboot(instance_id)
            else:
                return {"success": False, "error": f"Unsupported method {method}"}

            result["action_type"] = action_type
            result["instance_id"] = instance_id
            result["operator"] = operator
            result["started_at"] = timestamp_start
            result["completed_at"] = datetime.now(timezone.utc).isoformat()
            return result

        except Exception as e:
            logger.error(f"[AWS Remediation] Error executing {action_type} on {instance_id}: {e}", exc_info=True)
            return {
                "success": False,
                "action_type": action_type,
                "instance_id": instance_id,
                "error": str(e),
                "completed_at": datetime.now(timezone.utc).isoformat()
            }

    async def _execute_ssm_command(self, instance_id: str, shell_command: str) -> Dict[str, Any]:
        """Sends an AWS Systems Manager RunShellScript command and waits for completion."""
        ssm = aws_client_manager.get_ssm_client()

        logger.info(f"[AWS SSM] Sending command to {instance_id}: {shell_command}")
        send_resp = await asyncio.to_thread(
            ssm.send_command,
            InstanceIds=[instance_id],
            DocumentName=settings.AWS_SSM_DOCUMENT,
            Parameters={"commands": [shell_command]},
            Comment="SleuthOps Automated SRE Remediation"
        )

        command_id = send_resp["Command"]["CommandId"]
        logger.info(f"[AWS SSM] Command dispatched successfully. CommandId: {command_id}. Polling status...")

        # Poll for completion (up to 30s)
        for _ in range(15):
            await asyncio.sleep(2.0)
            try:
                inv_resp = await asyncio.to_thread(
                    ssm.get_command_invocation,
                    CommandId=command_id,
                    InstanceId=instance_id
                )
                status = inv_resp.get("Status")
                logger.info(f"[AWS SSM] Command {command_id} status: {status}")

                if status in ["Success", "Cancelled", "Failed", "TimedOut"]:
                    stdout = inv_resp.get("StandardOutputContent", "").strip()
                    stderr = inv_resp.get("StandardErrorContent", "").strip()
                    return {
                        "success": status == "Success",
                        "command_id": command_id,
                        "ssm_status": status,
                        "stdout": stdout,
                        "stderr": stderr,
                        "message": f"SSM Command '{command_id}' completed with status {status}."
                    }
            except ClientError as ce:
                # Invocation might take a second to register
                logger.debug(f"[AWS SSM] Waiting for invocation record: {ce}")

        return {
            "success": True, # Command sent asynchronously
            "command_id": command_id,
            "ssm_status": "InProgress",
            "message": f"SSM Command '{command_id}' dispatched and executing in background."
        }

    async def _execute_ec2_reboot(self, instance_id: str) -> Dict[str, Any]:
        """Issues an EC2 reboot call."""
        ec2 = aws_client_manager.get_ec2_client()
        logger.info(f"[AWS EC2] Rebooting instance {instance_id}...")
        await asyncio.to_thread(ec2.reboot_instances, InstanceIds=[instance_id])
        return {
            "success": True,
            "message": f"EC2 Instance '{instance_id}' reboot initiated."
        }

    async def trigger_cpu_stress_scenario(self, instance_id: Optional[str] = None, duration_seconds: int = 180) -> Dict[str, Any]:
        """
        Helper for live demo: Injects controlled CPU stress on the target EC2 instance via SSM.
        Command: starts stress-ng or python cpu_burn in background.
        """
        instance_id = instance_id or settings.AWS_EC2_INSTANCE_ID
        if not instance_id:
            return {"success": False, "error": "No AWS_EC2_INSTANCE_ID configured."}

        # Safe, controlled background stress injection script
        stress_cmd = f"""
which stress-ng >/dev/null 2>&1 && nohup stress-ng --cpu $(nproc) --timeout {duration_seconds}s >/tmp/stress.log 2>&1 &
which stress >/dev/null 2>&1 && nohup stress --cpu $(nproc) --timeout {duration_seconds}s >/tmp/stress.log 2>&1 &
which python3 >/dev/null 2>&1 && nohup python3 -c 'import time, multiprocessing; [multiprocessing.Process(target=lambda: [time.sleep(0.001) for _ in iter(int, 1)]).start() for _ in range(multiprocessing.cpu_count())]; time.sleep({duration_seconds})' >/tmp/cpu_burn.log 2>&1 &
echo 'CPU stress worker launched for {duration_seconds}s'
"""
        logger.info(f"[AWS Chaos Demo] Injecting CPU stress scenario on {instance_id} for {duration_seconds}s...")
        return await self._execute_ssm_command(instance_id, stress_cmd.strip())

aws_remediation_service = AWSRemediationService()
