import pytest
import asyncio
from unittest.mock import MagicMock, patch, AsyncMock
from app.core.config import settings
from app.core.models import AgentName, IncidentStatus, RiskLevel, ApprovalStatus, TelemetryMetric
from app.engine.aws_client import AWSClientManager
from app.engine.aws_telemetry import AWSTelemetryService
from app.engine.aws_remediation import AWSRemediationService, ALLOWED_AWS_ACTIONS
from app.engine.approval_policy import ApprovalPolicyEngine
from app.engine.runbook_executor import RunbookExecutor

@pytest.fixture
def mock_aws_clients():
    with patch("app.engine.aws_client.aws_client_manager.get_session") as mock_get_sess:
        mock_sess = MagicMock()
        mock_get_sess.return_value = mock_sess

        mock_cw = MagicMock()
        mock_ec2 = MagicMock()
        mock_ssm = MagicMock()
        mock_sts = MagicMock()

        mock_sess.client.side_effect = lambda service, **kwargs: {
            "cloudwatch": mock_cw,
            "ec2": mock_ec2,
            "ssm": mock_ssm,
            "sts": mock_sts
        }.get(service, MagicMock())

        yield {
            "cw": mock_cw,
            "ec2": mock_ec2,
            "ssm": mock_ssm,
            "sts": mock_sts
        }

def test_aws_client_connectivity(mock_aws_clients):
    mock_aws_clients["sts"].get_caller_identity.return_value = {
        "Account": "123456789012",
        "Arn": "arn:aws:iam::123456789012:role/SleuthOpsSRE",
        "UserId": "AROAEXAMPLE"
    }
    client_mgr = AWSClientManager()
    with patch.object(client_mgr, "get_session", return_value=MagicMock(client=lambda svc, **kw: mock_aws_clients[svc])):
        res = client_mgr.check_connectivity()
        assert res["connected"] is True
        assert res["account"] == "123456789012"

@pytest.mark.asyncio
async def test_aws_telemetry_cpu_and_anomaly(mock_aws_clients):
    mock_aws_clients["cw"].get_metric_statistics.return_value = {
        "Datapoints": [
            {"Timestamp": "2026-10-07T00:00:00Z", "Average": 92.5, "Maximum": 96.0}
        ]
    }
    mock_aws_clients["ec2"].describe_instances.return_value = {
        "Reservations": [{
            "Instances": [{
                "InstanceId": "i-test123",
                "State": {"Name": "running"},
                "InstanceType": "t3.medium",
                "Tags": [{"Key": "Name", "Value": "prod-checkout-host"}]
            }]
        }]
    }

    telem_svc = AWSTelemetryService()
    with patch("app.engine.aws_telemetry.aws_client_manager.get_cloudwatch_client", return_value=mock_aws_clients["cw"]), \
         patch("app.engine.aws_telemetry.aws_client_manager.get_ec2_client", return_value=mock_aws_clients["ec2"]), \
         patch.object(settings, "AWS_EC2_INSTANCE_ID", "i-test123"), \
         patch.object(settings, "AWS_CPU_THRESHOLD_PERCENT", 80.0):

        samples = await telem_svc.sample_live_telemetry()
        assert "prod-checkout-host" in samples
        metrics = samples["prod-checkout-host"]
        cpu_m = next(m for m in metrics if m.metric_name == "cpu_utilization")

        assert cpu_m.value == 92.5
        assert cpu_m.is_anomaly is True
        assert cpu_m.anomaly_score >= 0.9

@pytest.mark.asyncio
async def test_aws_remediation_security_allowlist():
    rem_svc = AWSRemediationService()
    
    # 1. Allowed action should pass security gate
    assert rem_svc.is_action_allowed("restart_application_service") is True
    assert rem_svc.is_action_allowed("stop_runaway_process") is True

    # 2. Arbitrary / malicious action must be blocked
    assert rem_svc.is_action_allowed("rm -rf /") is False
    assert rem_svc.is_action_allowed("drop_database") is False
    assert rem_svc.is_action_allowed("arbitrary_exec") is False

    res = await rem_svc.execute_remediation(
        action_type="unauthorized_action_xyz",
        instance_id="i-12345"
    )
    assert res["success"] is False
    assert "Security Violation" in res["error"]

@pytest.mark.asyncio
async def test_aws_ssm_execution(mock_aws_clients):
    mock_aws_clients["ssm"].send_command.return_value = {
        "Command": {"CommandId": "cmd-998877"}
    }
    mock_aws_clients["ssm"].get_command_invocation.return_value = {
        "Status": "Success",
        "StandardOutputContent": "demo-app.service restarted successfully",
        "StandardErrorContent": ""
    }

    rem_svc = AWSRemediationService()
    with patch("app.engine.aws_remediation.aws_client_manager.get_ssm_client", return_value=mock_aws_clients["ssm"]):
        res = await rem_svc.execute_remediation(
            action_type="restart_application_service",
            instance_id="i-test123"
        )
        assert res["success"] is True
        assert res["command_id"] == "cmd-998877"
        assert res["ssm_status"] == "Success"

def test_approval_policy_aws_actions():
    # restart_application_service -> LOW risk, auto-approved
    risk, req_human, status = ApprovalPolicyEngine.evaluate("restart_application_service")
    assert risk == RiskLevel.LOW
    assert req_human is False
    assert status == ApprovalStatus.AUTO_APPROVED

    # reboot_ec2_instance -> HIGH risk, requires human approval
    risk, req_human, status = ApprovalPolicyEngine.evaluate("reboot_ec2_instance")
    assert risk == RiskLevel.HIGH
    assert req_human is True
    assert status == ApprovalStatus.PENDING

@pytest.mark.asyncio
async def test_recovery_verification_logic():
    telem_svc = AWSTelemetryService()
    with patch.object(telem_svc, "fetch_cloudwatch_cpu", side_effect=[90.0, 32.0]):
        verification = await telem_svc.verify_recovery(
            instance_id="i-test123",
            threshold=80.0,
            max_attempts=3,
            poll_interval=0.01
        )
        assert verification["verified_recovered"] is True
        assert verification["final_cpu"] == 32.0
        assert "Workload healthy" in verification["verification_message"]
