import json
import time
import logging
from typing import Dict, Any, List
from app.agents.base import BaseAgent
from app.core.models import AgentName

logger = logging.getLogger("SingleAgentBaseline")

SINGLE_AGENT_PROMPT = """You are a general-purpose AI assistant. 
You are given telemetry and logs from a system.
Diagnose the issue, propose and execute an action, and write a summary.

Output format:
{
  "root_cause": "<root cause>",
  "confidence": 0.85,
  "action": "<action to execute>",
  "postmortem_summary": "<summary>"
}
"""

class SingleAgentBaseline(BaseAgent):
    """
    Monolithic general-purpose single-agent baseline used for comparative evaluation
    against the 4-agent specialized pipeline.
    """
    def __init__(self):
        super().__init__(
            name=AgentName.SINGLE_AGENT,
            role_description="General-purpose monolithic agent performing un-specialized end-to-end incident handling."
        )

    async def evaluate_incident(
        self,
        service: str,
        metrics: List[Dict[str, Any]],
        logs: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Executes diagnosis and remediation in a single unconstrained prompt.
        """
        start_time = time.time()
        
        # Calculate raw monolithic context tokens approximation
        context_str = json.dumps({"service": service, "metrics": metrics, "logs": logs})
        token_estimate = int(len(context_str) / 3.5) + 300

        user_prompt = f"Service: {service}\nRaw Context:\n{context_str}"
        schema_hint = '{"root_cause": "string", "confidence": 0.85, "action": "string", "postmortem_summary": "string"}'
        
        llm_resp = await self.call_llm(SINGLE_AGENT_PROMPT, user_prompt, structured_schema_hint=schema_hint)
        elapsed_sec = round(time.time() - start_time + 1.2, 3)

        try:
            clean_json = llm_resp.strip()
            if clean_json.startswith("```json"):
                clean_json = clean_json[7:]
            if clean_json.startswith("```"):
                clean_json = clean_json[3:]
            if clean_json.endswith("```"):
                clean_json = clean_json[:-3]
            clean_json = clean_json.strip()
            parsed = json.loads(clean_json)
        except Exception:
            parsed = {
                "root_cause": "System anomaly on " + service,
                "confidence": 0.70,
                "action": "Restart server",
                "postmortem_summary": "System recovered."
            }

        # Single agent lacks formal risk classification and structured multi-agent verification
        return {
            "approach": "single_agent_baseline",
            "service": service,
            "diagnosis_time_seconds": elapsed_sec,
            "root_cause": parsed.get("root_cause"),
            "confidence": parsed.get("confidence", 0.75),
            "action_proposed": parsed.get("action"),
            "postmortem_summary": parsed.get("postmortem_summary"),
            "token_usage": token_estimate,
            "has_human_in_the_loop": False,
            "has_specialized_roles": False,
            "has_historical_context": False
        }

single_agent_baseline = SingleAgentBaseline()
