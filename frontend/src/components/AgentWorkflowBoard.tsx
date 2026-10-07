import React from 'react';
import { 
  Radar, 
  BrainCircuit, 
  Wrench, 
  FileText, 
  CheckCircle2,
  Square,
  XCircle
} from 'lucide-react';
import { Incident } from '../types';

interface AgentWorkflowBoardProps {
  incident: Incident | null;
  onOpenPostmortem: () => void;
  onOpenApproval: () => void;
  onStopPipeline?: () => void;
}

export const AgentWorkflowBoard: React.FC<AgentWorkflowBoardProps> = ({
  incident,
  onOpenPostmortem,
  onOpenApproval,
  onStopPipeline
}) => {
  const status = incident?.status || 'CLOSED';

  // Determine stage states
  const getStageStatus = (stage: string) => {
    if (!incident) return { active: false, completed: false, stateText: 'STANDBY' };

    switch (stage) {
      case 'detector':
        return {
          active: status === 'DETECTED',
          completed: !['DETECTED', 'CANCELLED'].includes(status),
          stateText: status === 'CANCELLED' ? 'PIPELINE CANCELLED' : 'ANOMALY DETECTED'
        };
      case 'analyst':
        return {
          active: status === 'INVESTIGATING',
          completed: ['DIAGNOSED', 'ACTION_PROPOSED', 'AWAITING_APPROVAL', 'REMEDIATING', 'RESOLVED', 'DOCUMENTED', 'CLOSED'].includes(status),
          stateText: status === 'CANCELLED' ? 'STOPPED' : (status === 'INVESTIGATING' ? 'CORRELATING APM TRACES...' : (incident.diagnosis ? 'RCA COMPLETE' : 'WAITING'))
        };
      case 'responder':
        return {
          active: ['ACTION_PROPOSED', 'AWAITING_APPROVAL', 'REMEDIATING'].includes(status),
          completed: ['RESOLVED', 'DOCUMENTED', 'CLOSED'].includes(status),
          stateText: status === 'CANCELLED' ? 'STOPPED' : (status === 'AWAITING_APPROVAL' ? 'HUMAN APPROVAL REQUIRED' : (status === 'REMEDIATING' ? 'EXECUTING RUNBOOK...' : (status === 'RESOLVED' ? 'HEALED & VERIFIED' : 'WAITING')))
        };
      case 'reporter':
        return {
          active: status === 'RESOLVED',
          completed: ['DOCUMENTED', 'CLOSED'].includes(status),
          stateText: status === 'CANCELLED' ? 'STOPPED' : (status === 'DOCUMENTED' || status === 'CLOSED' ? 'POSTMORTEM GENERATED' : (status === 'RESOLVED' ? 'SYNTHESIZING REPORT...' : 'STANDBY'))
        };
      default:
        return { active: false, completed: false, stateText: 'STANDBY' };
    }
  };

  const detectorStage = getStageStatus('detector');
  const analystStage = getStageStatus('analyst');
  const responderStage = getStageStatus('responder');
  const reporterStage = getStageStatus('reporter');

  const isActiveRunning = incident && !['RESOLVED', 'DOCUMENTED', 'CLOSED', 'CANCELLED'].includes(status);

  return (
    <div className="bg-white border border-[#E2E8F0] p-4 mb-6 font-sans shadow-sm">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-[#E2E8F0] pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 ${isActiveRunning ? 'bg-purple-600 animate-ping' : 'bg-slate-400'}`} />
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider font-header">
              SLEUTHOPS WORKFLOW AUTOMATION • 4-AGENT PIPELINE
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
            Event-driven handoffs across specialized AI agents with deterministic safety gates
          </p>
        </div>

        {incident && (
          <div className="flex items-center space-x-2.5 text-xs font-mono">
            <span className="text-slate-500">Pipeline State:</span>
            <span className={`px-2 py-0.5 text-[11px] font-bold ${
              status === 'AWAITING_APPROVAL' ? 'bg-amber-100 text-[#C27803] border border-amber-300 animate-pulse' :
              status === 'REMEDIATING' ? 'bg-purple-100 text-purple-700 border border-purple-300' :
              status === 'CANCELLED' ? 'bg-rose-100 text-[#D32F2F] border border-red-300' :
              ['RESOLVED', 'DOCUMENTED', 'CLOSED'].includes(status) ? 'bg-emerald-100 text-[#0E7A4C] border border-emerald-300' :
              'bg-slate-100 text-slate-700 border border-slate-200'
            }`}>
              {status}
            </span>

            {/* Stop Pipeline Button when running */}
            {isActiveRunning && onStopPipeline && (
              <button
                onClick={onStopPipeline}
                className="flex items-center space-x-1 px-2.5 py-0.5 bg-red-50 hover:bg-red-100 text-[#D32F2F] border border-red-300 text-[11px] font-bold transition font-mono ml-1"
                title="Stop and cancel active agent solving workflow"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Stop Pipeline</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4 Agent Pipeline Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 relative">
        
        {/* Agent 1: Detector Agent */}
        <div className={`p-3.5 border transition-all duration-300 ${
          detectorStage.active 
            ? 'bg-purple-50/80 border-2 border-purple-600 shadow-sm' 
            : detectorStage.completed 
            ? 'bg-[#F8F9FA] border-[#E2E8F0]' 
            : 'bg-white border-[#E2E8F0] opacity-60'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-purple-100 text-purple-700 border border-purple-300">
                <Radar className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 font-header">1. Detector Agent</div>
                <div className="text-[9px] font-mono text-purple-700 font-semibold">Watchdog Engine</div>
              </div>
            </div>
            {detectorStage.completed ? (
              <CheckCircle2 className="w-4 h-4 text-[#00D084]" />
            ) : detectorStage.active ? (
              <span className="w-2 h-2 bg-purple-600 animate-ping" />
            ) : null}
          </div>

          <div className="text-[11px] text-slate-800 mt-2 font-mono bg-[#F1F3F7] p-2 border border-[#E2E8F0]">
            <div className="text-slate-500 text-[9px]">ACTION:</div>
            <div className="font-semibold">{detectorStage.stateText}</div>
          </div>

          <div className="mt-2 text-[10px] text-slate-500">
            Monitors Z-Score spikes, SLO error budgets, and P99 threshold violations.
          </div>
        </div>

        {/* Agent 2: Analyst Agent */}
        <div className={`p-3.5 border transition-all duration-300 ${
          analystStage.active 
            ? 'bg-purple-50/80 border-2 border-purple-600 shadow-sm' 
            : analystStage.completed 
            ? 'bg-[#F8F9FA] border-[#E2E8F0]' 
            : 'bg-white border-[#E2E8F0] opacity-60'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-indigo-100 text-indigo-700 border border-indigo-300">
                <BrainCircuit className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 font-header">2. Analyst Agent</div>
                <div className="text-[9px] font-mono text-indigo-700 font-semibold">Sleuth AI RCA</div>
              </div>
            </div>
            {analystStage.completed ? (
              <CheckCircle2 className="w-4 h-4 text-[#00D084]" />
            ) : analystStage.active ? (
              <span className="w-2 h-2 bg-indigo-600 animate-ping" />
            ) : null}
          </div>

          <div className="text-[11px] text-slate-800 mt-2 font-mono bg-[#F1F3F7] p-2 border border-[#E2E8F0]">
            <div className="text-slate-500 text-[9px]">ACTION:</div>
            <div className="font-semibold">{analystStage.stateText}</div>
          </div>

          <div className="mt-2 text-[10px] text-slate-500">
            Correlates logs, isolates blast radius, and queries historical postmortem embeddings.
          </div>
        </div>

        {/* Agent 3: Responder Agent */}
        <div className={`p-3.5 border transition-all duration-300 ${
          responderStage.active 
            ? 'bg-amber-50/80 border-2 border-amber-500 shadow-sm' 
            : responderStage.completed 
            ? 'bg-[#F8F9FA] border-[#E2E8F0]' 
            : 'bg-white border-[#E2E8F0] opacity-60'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-amber-100 text-amber-800 border border-amber-300">
                <Wrench className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 font-header">3. Responder Agent</div>
                <div className="text-[9px] font-mono text-amber-800 font-semibold">Safety Gatekeeper</div>
              </div>
            </div>
            {responderStage.completed ? (
              <CheckCircle2 className="w-4 h-4 text-[#00D084]" />
            ) : responderStage.active ? (
              <span className="w-2 h-2 bg-amber-500 animate-ping" />
            ) : null}
          </div>

          <div className="text-[11px] text-slate-800 mt-2 font-mono bg-[#F1F3F7] p-2 border border-[#E2E8F0]">
            <div className="text-slate-500 text-[9px]">ACTION:</div>
            <div className="font-semibold">{responderStage.stateText}</div>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] text-slate-500 font-mono">Automated Runbook</span>
            {status === 'AWAITING_APPROVAL' && (
              <button
                onClick={onOpenApproval}
                className="text-[10px] font-bold font-mono px-2 py-0.5 bg-amber-500 text-slate-950 hover:bg-amber-400 transition shadow-sm"
              >
                Review Gate
              </button>
            )}
          </div>
        </div>

        {/* Agent 4: Reporter Agent */}
        <div className={`p-3.5 border transition-all duration-300 ${
          reporterStage.active 
            ? 'bg-emerald-50/80 border-2 border-emerald-500 shadow-sm' 
            : reporterStage.completed 
            ? 'bg-[#F8F9FA] border-[#E2E8F0]' 
            : 'bg-white border-[#E2E8F0] opacity-60'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-cyan-100 text-cyan-800 border border-cyan-300">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 font-header">4. Reporter Agent</div>
                <div className="text-[9px] font-mono text-cyan-800 font-semibold">Postmortem Gen</div>
              </div>
            </div>
            {reporterStage.completed ? (
              <CheckCircle2 className="w-4 h-4 text-[#00D084]" />
            ) : reporterStage.active ? (
              <span className="w-2 h-2 bg-cyan-600 animate-ping" />
            ) : null}
          </div>

          <div className="text-[11px] text-slate-800 mt-2 font-mono bg-[#F1F3F7] p-2 border border-[#E2E8F0]">
            <div className="text-slate-500 text-[9px]">ACTION:</div>
            <div className="font-semibold">{reporterStage.stateText}</div>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] text-slate-500 font-mono">Postmortem RAG</span>
            {incident?.postmortem && (
              <button
                onClick={onOpenPostmortem}
                className="text-[10px] font-bold font-mono px-2 py-0.5 bg-cyan-600 hover:bg-cyan-500 text-white transition shadow-sm"
              >
                View Postmortem
              </button>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
