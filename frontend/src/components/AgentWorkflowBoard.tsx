import React from 'react';
import { 
  Radar, 
  BrainCircuit, 
  Wrench, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ArrowRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { Incident, IncidentStatus } from '../types';

interface AgentWorkflowBoardProps {
  incident: Incident | null;
  onOpenPostmortem: () => void;
  onOpenApproval: () => void;
}

export const AgentWorkflowBoard: React.FC<AgentWorkflowBoardProps> = ({
  incident,
  onOpenPostmortem,
  onOpenApproval
}) => {
  const status = incident?.status || 'CLOSED';

  // Determine stage states
  const getStageStatus = (stage: string) => {
    if (!incident) return { active: false, completed: false, stateText: 'IDLE' };

    switch (stage) {
      case 'detector':
        return {
          active: status === 'DETECTED',
          completed: status !== 'DETECTED',
          stateText: 'ANOMALY DETECTED'
        };
      case 'analyst':
        return {
          active: status === 'INVESTIGATING',
          completed: ['DIAGNOSED', 'ACTION_PROPOSED', 'AWAITING_APPROVAL', 'REMEDIATING', 'RESOLVED', 'DOCUMENTED', 'CLOSED'].includes(status),
          stateText: status === 'INVESTIGATING' ? 'REASONING & CORRELATING...' : (incident.diagnosis ? 'DIAGNOSIS COMPLETE' : 'WAITING')
        };
      case 'responder':
        return {
          active: ['ACTION_PROPOSED', 'AWAITING_APPROVAL', 'REMEDIATING'].includes(status),
          completed: ['RESOLVED', 'DOCUMENTED', 'CLOSED'].includes(status),
          stateText: status === 'AWAITING_APPROVAL' ? 'HUMAN APPROVAL REQUIRED' : (status === 'REMEDIATING' ? 'EXECUTING RUNBOOK...' : (status === 'RESOLVED' ? 'HEALED' : 'WAITING'))
        };
      case 'reporter':
        return {
          active: status === 'RESOLVED',
          completed: ['DOCUMENTED', 'CLOSED'].includes(status),
          stateText: status === 'DOCUMENTED' || status === 'CLOSED' ? 'POSTMORTEM GENERATED' : (status === 'RESOLVED' ? 'SYNTHESIZING REPORT...' : 'STANDBY')
        };
      default:
        return { active: false, completed: false, stateText: 'IDLE' };
    }
  };

  const detectorStage = getStageStatus('detector');
  const analystStage = getStageStatus('analyst');
  const responderStage = getStageStatus('responder');
  const reporterStage = getStageStatus('reporter');

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping"></span>
            Specialised Multi-Agent Lifecycle Orchestration
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Event-driven handoffs across specialized AI agents with deterministic safety gates
          </p>
        </div>

        {incident && (
          <div className="flex items-center space-x-3 text-xs">
            <span className="text-slate-400">Current Lifecycle State:</span>
            <span className={`px-2.5 py-1 rounded-md font-mono font-medium ${
              status === 'AWAITING_APPROVAL' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse' :
              status === 'REMEDIATING' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' :
              status === 'RESOLVED' || status === 'DOCUMENTED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
              'bg-slate-800 text-slate-300 border border-slate-700'
            }`}>
              {status}
            </span>
          </div>
        )}
      </div>

      {/* 4 Agent Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
        
        {/* Agent 1: Detector */}
        <div className={`p-4 rounded-xl border transition-all duration-300 ${
          detectorStage.active ? 'bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20' :
          detectorStage.completed ? 'bg-slate-900/90 border-slate-700/70' :
          'bg-slate-950/40 border-slate-800/40 opacity-60'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20">
              <Radar className="w-5 h-5" />
            </div>
            {detectorStage.completed ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : detectorStage.active ? (
              <Clock className="w-4 h-4 text-indigo-400 animate-spin" />
            ) : (
              <span className="text-[10px] text-slate-500 font-mono">READY</span>
            )}
          </div>
          <h3 className="font-semibold text-sm text-slate-100">1. Detector Agent</h3>
          <p className="text-[11px] text-slate-400 mt-1 mb-3">Statistical Anomaly & Threshold Evaluator</p>
          <div className="text-[11px] font-mono px-2 py-1 rounded bg-slate-950/60 border border-slate-800 text-slate-300 truncate">
            {detectorStage.stateText}
          </div>
        </div>

        {/* Agent 2: Analyst */}
        <div className={`p-4 rounded-xl border transition-all duration-300 ${
          analystStage.active ? 'bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/20' :
          analystStage.completed ? 'bg-slate-900/90 border-slate-700/70' :
          'bg-slate-950/40 border-slate-800/40 opacity-60'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 border border-purple-500/20">
              <BrainCircuit className="w-5 h-5" />
            </div>
            {analystStage.completed ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : analystStage.active ? (
              <Clock className="w-4 h-4 text-purple-400 animate-spin" />
            ) : (
              <span className="text-[10px] text-slate-500 font-mono">READY</span>
            )}
          </div>
          <h3 className="font-semibold text-sm text-slate-100">2. Analyst Agent</h3>
          <p className="text-[11px] text-slate-400 mt-1 mb-3">RCA, Context Synthesis & Memory RAG</p>
          <div className="text-[11px] font-mono px-2 py-1 rounded bg-slate-950/60 border border-slate-800 text-slate-300 truncate">
            {analystStage.stateText}
          </div>
        </div>

        {/* Agent 3: Responder */}
        <div className={`p-4 rounded-xl border transition-all duration-300 ${
          responderStage.active ? 'bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/20' :
          responderStage.completed ? 'bg-slate-900/90 border-slate-700/70' :
          'bg-slate-950/40 border-slate-800/40 opacity-60'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20">
              <Wrench className="w-5 h-5" />
            </div>
            {responderStage.completed ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : status === 'AWAITING_APPROVAL' ? (
              <UserCheck className="w-4 h-4 text-amber-400 animate-bounce" />
            ) : responderStage.active ? (
              <Clock className="w-4 h-4 text-amber-400 animate-spin" />
            ) : (
              <span className="text-[10px] text-slate-500 font-mono">READY</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-slate-100">3. Responder Agent</h3>
            {status === 'AWAITING_APPROVAL' && (
              <button
                onClick={onOpenApproval}
                className="text-[10px] px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded shadow transition"
              >
                Review Gate
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 mb-3">Risk Assessment & Runbook Execution</p>
          <div className="text-[11px] font-mono px-2 py-1 rounded bg-slate-950/60 border border-slate-800 text-slate-300 truncate">
            {responderStage.stateText}
          </div>
        </div>

        {/* Agent 4: Reporter */}
        <div className={`p-4 rounded-xl border transition-all duration-300 ${
          reporterStage.active ? 'bg-cyan-950/40 border-cyan-500 ring-2 ring-cyan-500/20' :
          reporterStage.completed ? 'bg-slate-900/90 border-slate-700/70' :
          'bg-slate-950/40 border-slate-800/40 opacity-60'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400 border border-cyan-500/20">
              <FileText className="w-5 h-5" />
            </div>
            {reporterStage.completed ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : reporterStage.active ? (
              <Clock className="w-4 h-4 text-cyan-400 animate-spin" />
            ) : (
              <span className="text-[10px] text-slate-500 font-mono">READY</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-slate-100">4. Reporter Agent</h3>
            {incident?.postmortem && (
              <button
                onClick={onOpenPostmortem}
                className="text-[10px] px-2 py-0.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-medium rounded border border-cyan-500/40 transition"
              >
                Read PM
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 mb-3">Postmortem & Memory Indexing</p>
          <div className="text-[11px] font-mono px-2 py-1 rounded bg-slate-950/60 border border-slate-800 text-slate-300 truncate">
            {reporterStage.stateText}
          </div>
        </div>

      </div>
    </div>
  );
};
