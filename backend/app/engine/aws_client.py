import logging
import boto3
from botocore.exceptions import ClientError, BotoCoreError, NoCredentialsError
from typing import Optional, Dict, Any
from app.core.config import settings

logger = logging.getLogger("AWSClient")

class AWSClientManager:
    """
    Manages boto3 client sessions using standard AWS credential resolution chain
    or explicit settings without hardcoding secrets.
    """
    def __init__(self):
        self._session: Optional[boto3.Session] = None

    def get_session(self) -> boto3.Session:
        if self._session is None:
            kwargs = {"region_name": settings.AWS_REGION}
            if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
                kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
                kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY
                if settings.AWS_SESSION_TOKEN:
                    kwargs["aws_session_token"] = settings.AWS_SESSION_TOKEN

            self._session = boto3.Session(**kwargs)
        return self._session

    def get_cloudwatch_client(self):
        return self.get_session().client("cloudwatch", region_name=settings.AWS_REGION)

    def get_ec2_client(self):
        return self.get_session().client("ec2", region_name=settings.AWS_REGION)

    def get_logs_client(self):
        return self.get_session().client("logs", region_name=settings.AWS_REGION)

    def get_ssm_client(self):
        return self.get_session().client("ssm", region_name=settings.AWS_REGION)

    def check_connectivity(self) -> Dict[str, Any]:
        """Validates AWS authentication and region access gracefully."""
        try:
            sts = self.get_session().client("sts", region_name=settings.AWS_REGION)
            identity = sts.get_caller_identity()
            return {
                "connected": True,
                "account": identity.get("Account"),
                "arn": identity.get("Arn"),
                "user_id": identity.get("UserId"),
                "region": settings.AWS_REGION
            }
        except NoCredentialsError:
            logger.warning("No AWS credentials detected in standard credential chain.")
            return {"connected": False, "error": "No AWS credentials found"}
        except ClientError as e:
            logger.error(f"AWS ClientError during connectivity check: {e}")
            return {"connected": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Unexpected error checking AWS connectivity: {e}")
            return {"connected": False, "error": str(e)}

aws_client_manager = AWSClientManager()
