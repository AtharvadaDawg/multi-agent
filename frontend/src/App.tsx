import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Activity, 
  Clock, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  Cpu, 
  Database, 
  Server,
  FileText,
  UserCheck,
  ChevronRight,
  Flame,
  ArrowUpRight,
  Sparkles,
  BookOpen,
  FlaskConical,
  Lock
} from 'lucide-react';
import { useIncidentContext } from './context/IncidentContext';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { AgentWorkflowBoard } from './components/AgentWorkflowBoard';
import { TelemetryViewer } from './components/TelemetryViewer';
import { DiagnosisPanel } from './components/DiagnosisPanel';
import { LogStreamViewer } from './components/LogStreamViewer';
import { TimelineFeed } from './components/TimelineFeed';
import { ApprovalGateModal } from './components/ApprovalGateModal';
import { PostmortemModal } from './components/PostmortemModal';
import { BenchmarkEvaluationView } from './components/BenchmarkEvaluationView';
import { KnowledgeBaseSearch } from './components/KnowledgeBaseSearch';

export const App: React.FC = () => {
  const { 
    incidents, 
    selectedIncident, 
    setSelectedIncidentId, 
    pendingApprovals,
    activeApprovalAction,
    setActiveApprovalAction
  } = useIncidentContext();

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [showPostmortem, setShowPostmortem] = useState<boolean>(false);

  // Check for active pending approval for selected incident
  const currentPendingAction = selectedIncident?.actions?.find(
    a => a.approval_status === 'PENDING'
  ) || (pendingApprovals.length > 0 ? pendingApprovals[0] : null);

  return (
    <div className="flex h-screen bg-[#0B0F19] text-slate-100 overflow-hidden font-sans">
      
      {/* 1. LEFT SIDEBAR NAVIGATION */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* 2. MAIN PAGE CONTENT AREA */}
      <div className="flex-1 h-screen overflow-y-auto flex flex-col justify-between">
        
        <main className="p-8 space-y-6 max-w-7xl mx-auto w-full">

          {/* Pending Approval Banner */}
          {pendingApprovals.length > 0 && (
            <div className="bg-gradient-to-r from-amber-950/80 via-amber-900/60 to-slate-900 border border-amber-500/50 rounded-xl p-4 flex items-center justify-between shadow-xl animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/40">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                    Human Authorization Required ({pendingApprovals.length} Pending)
                  </div>
                  <div className="text-sm font-semibold text-white mt-0.5">
                    High-risk remediation action awaiting authorization for <span className="font-mono text-amber-300">{pendingApprovals[0].target_resource}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActiveApprovalAction(pendingApprovals[0])}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg shadow-lg transition"
              >
                Review Authorization Gate
              </button>
            </div>
          )}

          {/* PAGE 1: INCIDENT COMMAND CENTER (DASHBOARD) */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Visual 4-Agent Orchestration Board */}
              <AgentWorkflowBoard
                incident={selectedIncident}
                onOpenPostmortem={() => setShowPostmortem(true)}
                onOpenApproval={() => {
                  if (currentPendingAction) {
                    setActiveApprovalAction(currentPendingAction);
                  }
                }}
              />

              {/* 2-Column Split View */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column (2 Cols): Diagnosis & Telemetry Shortcut */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Primary AI Diagnosis */}
                  <DiagnosisPanel incident={selectedIncident} />

                  {/* Telemetry Page Shortcut Card */}
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                        <Activity className="w-4 h-4 text-indigo-400" />
                        Live Telemetry & Application Logs
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">View real-time P99 latency, CPU metrics, and searchable stdout logs</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('telemetry')}
                      className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition"
                    >
                      <span>Open Telemetry Page</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>

                {/* Right Column (1 Col): Incident Log List & Timeline */}
                <div className="space-y-6">
                  
                  {/* Incident Log List */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-indigo-400" />
                        Incident Log
                      </h2>
                      <span className="text-xs font-mono text-slate-500">
                        {incidents.length} Records
                      </span>
                    </div>

                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {incidents.length === 0 ? (
                        <div className="text-center py-6 text-xs text-slate-500">
                          No active incidents. Use the sidebar scenario injector to test!
                        </div>
                      ) : (
                        incidents.map(inc => {
                          const isSelected = selectedIncident?.id === inc.id;
                          const isResolved = ['RESOLVED', 'DOCUMENTED', 'CLOSED'].includes(inc.status);

                          return (
                            <button
                              key={inc.id}
                              onClick={() => setSelectedIncidentId(inc.id)}
                              className={`w-full text-left p-3 rounded-lg border transition flex items-start justify-between ${
                                isSelected
                                  ? 'bg-indigo-950/40 border-indigo-500/80 shadow-md ring-1 ring-indigo-500/20'
                                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                              }`}
                            >
                              <div className="min-w-0 flex-1 pr-2">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                                    {inc.id}
                                  </span>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                    inc.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                                    inc.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-400' :
                                    'bg-indigo-500/20 text-indigo-400'
                                  }`}>
                                    {inc.severity}
                                  </span>
                                </div>
                                <div className="text-xs font-medium text-slate-200 truncate">{inc.title}</div>
                                <div className="text-[11px] text-slate-400 font-mono mt-0.5">Service: {inc.service}</div>
                              </div>

                              <div className="flex flex-col items-end flex-shrink-0">
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-medium ${
                                  inc.status === 'AWAITING_APPROVAL' ? 'bg-amber-500/20 text-amber-400 animate-pulse' :
                                  isResolved ? 'bg-emerald-500/20 text-emerald-400' :
                                  'bg-indigo-500/20 text-indigo-400'
                                }`}>
                                  {inc.status}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono mt-2">
                                  {new Date(inc.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Audit Feed */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
                      <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                        <Clock className="w-4 h-4 text-cyan-400" />
                        Audit Log Feed
                      </h2>
                      {selectedIncident && (
                        <span className="text-[11px] font-mono text-slate-400">{selectedIncident.id}</span>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto pr-1">
                      <TimelineFeed timeline={selectedIncident?.timeline || []} />
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* PAGE 2: TELEMETRY & LOGS */}
          {activeTab === 'telemetry' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <TelemetryViewer />
              <LogStreamViewer incident={selectedIncident} />
            </div>
          )}

          {/* PAGE 3: AGENT ORCHESTRATION */}
          {activeTab === 'orchestration' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <AgentWorkflowBoard
                incident={selectedIncident}
                onOpenPostmortem={() => setShowPostmortem(true)}
                onOpenApproval={() => {
                  if (currentPendingAction) {
                    setActiveApprovalAction(currentPendingAction);
                  }
                }}
              />
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
                <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  Full Lifecycle Event Stream
                </h2>
                <TimelineFeed timeline={selectedIncident?.timeline || []} />
              </div>
            </div>
          )}

          {/* PAGE 4: KNOWLEDGE BASE */}
          {activeTab === 'knowledge' && (
            <div className="animate-in fade-in duration-200">
              <KnowledgeBaseSearch onClose={() => setActiveTab('dashboard')} />
            </div>
          )}

          {/* PAGE 5: RESEARCH BENCHMARK */}
          {activeTab === 'benchmark' && (
            <div className="animate-in fade-in duration-200">
              <BenchmarkEvaluationView onClose={() => setActiveTab('dashboard')} />
            </div>
          )}

        </main>

        {/* Footer */}
        <footer className="border-t border-slate-800/80 bg-[#070A12] py-4 px-8 text-center text-xs text-slate-500">
          Multi-Agent DevOps Incident Management System • UPES Major Project Report 2026
        </footer>

      </div>

      {/* MODALS */}
      {activeApprovalAction && (
        <ApprovalGateModal
          action={activeApprovalAction}
          onClose={() => setActiveApprovalAction(null)}
        />
      )}

      {showPostmortem && selectedIncident && (
        <PostmortemModal
          incident={selectedIncident}
          onClose={() => setShowPostmortem(false)}
        />
      )}

    </div>
  );
};
