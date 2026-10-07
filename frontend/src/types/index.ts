export type IncidentStatus = 
  | 'DETECTED'
  | 'INVESTIGATING'
  | 'DIAGNOSED'
  | 'ACTION_PROPOSED'
  | 'AWAITING_APPROVAL'
  | 'REMEDIATING'
  | 'RESOLVED'
  | 'DOCUMENTED'
  | 'CLOSED'
  | 'CANCELLED'
  | 'FAILED_ESCALATED';

export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ApprovalStatus = 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'AUTO_APPROVED';

export interface TelemetryMetric {
  metric_name: string;
  value: number;
  unit: string;
  timestamp: string;
  source: string;
  threshold?: number;
  is_anomaly: boolean;
  anomaly_score: number;
}

export interface ServiceState {
  version: string;
  replicas: number;
  status: 'HEALTHY' | 'DEGRADED' | 'OUTAGE';
  cpu_base: number;
  mem_base: number;
  latency_base: number;
  error_rate_base: number;
  db_pool_size: number;
  active_connections: number;
  active_anomaly: {
    type: string;
    severity: string;
    injected_at: number;
    details: Record<string, any>;
  } | null;
  dependencies: string[];
}

export interface EvidenceItem {
  id: string;
  incident_id: string;
  source: string;
  type: string;
  reference: string;
  relevance: number;
  payload: Record<string, any>;
}

export interface DiagnosisOutput {
  incident_id: string;
  root_cause: string;
  confidence: number;
  blast_radius: string[];
  alternatives: string[];
  evidence_ids: string[];
  reasoning: string;
  timestamp: string;
}

export interface RemediationProposal {
  action_id: string;
  incident_id: string;
  action_type: string;
  title: string;
  description: string;
  risk: RiskLevel;
  requires_human_approval: boolean;
  rationale: string;
  rollback_plan: string;
  target_resource: string;
  parameters: Record<string, any>;
  approval_status: ApprovalStatus;
  execution_result?: Record<string, any>;
  created_at: string;
}

export interface TimelineEvent {
  id: string;
  incident_id: string;
  actor: string;
  event: string;
  state_before?: IncidentStatus | null;
  state_after?: IncidentStatus | null;
  timestamp: string;
  details: Record<string, any>;
}

export interface Postmortem {
  id: string;
  incident_id: string;
  title: string;
  summary: string;
  root_cause: string;
  impact: string;
  remediation_summary: string;
  action_items: string[];
  lessons_learned: string[];
  created_at: string;
}

export interface Incident {
  id: string;
  title: string;
  service: string;
  severity: SeverityLevel;
  status: IncidentStatus;
  started_at: string;
  resolved_at?: string | null;
  mttd_seconds?: number | null;
  mttr_seconds?: number | null;
  initial_trigger: string;
  evidence: EvidenceItem[];
  diagnosis?: DiagnosisOutput | null;
  actions: RemediationProposal[];
  timeline: TimelineEvent[];
  postmortem?: Postmortem | null;
}

export interface Scenario {
  id: string;
  title: string;
  target_service: string;
  anomaly_type: string;
  severity: string;
  description: string;
  expected_root_cause: string;
  expected_remediation: string;
  risk_level: string;
  requires_human_approval: boolean;
}

export interface AgentStatusInfo {
  name: string;
  role: string;
  status: string;
  description: string;
}

export interface KnowledgeItem {
  id: string;
  incident_id: string;
  service: string;
  root_cause: string;
  remediation: string;
  lessons: string;
  keywords: string;
  created_at: string;
  similarity_score?: number;
}
