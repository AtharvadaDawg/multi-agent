import { Incident, Scenario, AgentStatusInfo, KnowledgeItem, TelemetryMetric, ServiceState } from '../types';

const API_BASE = '/api';

export async function fetchIncidents(): Promise<Incident[]> {
  const res = await fetch(`${API_BASE}/incidents`);
  if (!res.ok) throw new Error('Failed to fetch incidents');
  return res.json();
}

export async function fetchIncident(id: string): Promise<Incident> {
  const res = await fetch(`${API_BASE}/incidents/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch incident ${id}`);
  return res.json();
}

export async function stopIncidentPipeline(incidentId?: string): Promise<any> {
  const url = incidentId ? `${API_BASE}/incidents/${incidentId}/stop` : `${API_BASE}/incidents/stop-all`;
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to stop incident pipeline');
  return res.json();
}

export async function clearAllIncidents(): Promise<any> {
  const res = await fetch(`${API_BASE}/incidents/clear-all`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to clear incident history');
  return res.json();
}

export async function fetchLiveTelemetry(source?: string): Promise<{ mode?: string; services: Record<string, ServiceState>; metrics: Record<string, TelemetryMetric[]> }> {
  const url = source ? `${API_BASE}/incidents/telemetry/live?source=${encodeURIComponent(source)}` : `${API_BASE}/incidents/telemetry/live`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch live telemetry');
  return res.json();
}

export async function fetchSandboxTelemetry(): Promise<{ mode?: string; services: Record<string, ServiceState>; metrics: Record<string, TelemetryMetric[]> }> {
  const res = await fetch(`${API_BASE}/incidents/telemetry/sandbox`);
  if (!res.ok) throw new Error('Failed to fetch sandbox telemetry');
  return res.json();
}

export async function fetchAgentStatus(): Promise<{ agents: AgentStatusInfo[] }> {
  const res = await fetch(`${API_BASE}/incidents/agents/status`);
  if (!res.ok) throw new Error('Failed to fetch agent status');
  return res.json();
}

export async function fetchPendingApprovals(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/approvals/pending`);
  if (!res.ok) throw new Error('Failed to fetch pending approvals');
  return res.json();
}

export async function submitApproval(actionId: string, decision: 'APPROVE' | 'REJECT', operatorName = 'DevOps SRE Lead', notes = ''): Promise<any> {
  const res = await fetch(`${API_BASE}/approvals/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action_id: actionId,
      decision,
      operator_name: operatorName,
      notes
    })
  });
  if (!res.ok) throw new Error('Failed to submit approval decision');
  return res.json();
}

export async function fetchScenarios(): Promise<Scenario[]> {
  const res = await fetch(`${API_BASE}/scenarios`);
  if (!res.ok) throw new Error('Failed to fetch scenarios');
  return res.json();
}

export async function triggerScenario(scenarioId: string, mode?: string): Promise<any> {
  const url = mode ? `${API_BASE}/scenarios/${scenarioId}/trigger?mode=${encodeURIComponent(mode)}` : `${API_BASE}/scenarios/${scenarioId}/trigger`;
  const res = await fetch(url, {
    method: 'POST'
  });
  if (!res.ok) throw new Error(`Failed to trigger scenario ${scenarioId}`);
  return res.json();
}

export async function resetSandbox(): Promise<any> {
  const res = await fetch(`${API_BASE}/scenarios/reset`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to reset sandbox');
  return res.json();
}

export async function fetchBenchmarkSummary(): Promise<any> {
  const res = await fetch(`${API_BASE}/benchmark/summary`);
  if (!res.ok) throw new Error('Failed to fetch benchmark summary');
  return res.json();
}

export async function runBenchmarkEvaluation(scenarioId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/benchmark/run-evaluation?scenario_id=${scenarioId}`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to run benchmark evaluation');
  return res.json();
}

export async function fetchKnowledge(): Promise<KnowledgeItem[]> {
  const res = await fetch(`${API_BASE}/knowledge`);
  if (!res.ok) throw new Error('Failed to fetch knowledge records');
  return res.json();
}

export async function searchKnowledge(query: string, service?: string): Promise<KnowledgeItem[]> {
  const url = `${API_BASE}/knowledge/search?query=${encodeURIComponent(query)}${service ? `&service=${encodeURIComponent(service)}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to search knowledge base');
  return res.json();
}

export async function fetchAWSStatus(): Promise<{
  aws_connected: boolean;
  region: string;
  configured_instance_id: string;
  instance_metadata: any;
  latest_cloudwatch_cpu: number;
  cpu_threshold: number;
  telemetry_source: string;
}> {
  const res = await fetch(`${API_BASE}/scenarios/aws/status`);
  if (!res.ok) throw new Error('Failed to fetch AWS status');
  return res.json();
}

export async function triggerAWSCpuStress(durationSeconds = 180): Promise<any> {
  const res = await fetch(`${API_BASE}/scenarios/aws/stress?duration_seconds=${durationSeconds}`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to trigger AWS CPU stress');
  return res.json();
}

