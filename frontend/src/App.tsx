import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Clock, 
  Lock,
  Trash2,
  Flame
} from 'lucide-react';
import { useIncidentContext } from './context/IncidentContext';
import { SleuthOpsHeader } from './components/SleuthOpsHeader';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { ServiceHealthStrip } from './components/ServiceHealthStrip';
import { AgentWorkflowBoard } from './components/AgentWorkflowBoard';
import { DiagnosisPanel } from './components/DiagnosisPanel';
import { TimelineFeed } from './components/TimelineFeed';
import { ApprovalGateModal } from './components/ApprovalGateModal';
import { PostmortemModal } from './components/PostmortemModal';
import { BenchmarkEvaluationView } from './components/BenchmarkEvaluationView';
import { KnowledgeBaseSearch } from './components/KnowledgeBaseSearch';
import { SyntheticSandboxView } from './components/SyntheticSandboxView';

export const App: React.FC = () => {
  const { 
    incidents, 
    selectedIncident, 
    setSelectedIncidentId, 
    pendingApprovals,
    activeApprovalAction,
    setActiveApprovalAction,
    stopPipeline,
    clearIncidentHistory,
    triggerScenario
  } = useIncidentContext();

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [showPostmortem, setShowPostmortem] = useState<boolean>(false);
  const [selectedService, setSelectedService] = useState<string>('order-service');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('Live (30s)');

  // Check for active pending approval for selected incident
  const currentPendingAction = selectedIncident?.actions?.find(
    a => a.approval_status === 'PENDING'
  ) || (pendingApprovals.length > 0 ? pendingApprovals[0] : null);

  return (
    <div className="flex h-screen bg-[#0D0E15] text-slate-900 overflow-hidden font-sans">
      
      {/* 1. LEFT SLEUTHOPS SIDEBAR NAVIGATION (BLACK BACKGROUND) */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* 2. RIGHT WORKSPACE AREA (WHITE/LIGHT MAIN PANEL BACKGROUND) */}
      <div className="flex-1 h-screen overflow-y-auto flex flex-col justify-between bg-[#F4F5F8]">
        
        <div>
          {/* TOP SLEUTHOPS GLOBAL HEADER (BLACK HEADBAR) */}
          {activeTab !== 'sandbox' && (
            <SleuthOpsHeader
              onOpenApproval={() => {
                if (currentPendingAction) {
                  setActiveApprovalAction(currentPendingAction);
                }
              }}
              onOpenSandbox={() => setActiveTab('sandbox')}
              isSandboxActive={false}
              selectedTimeframe={selectedTimeframe}
              setSelectedTimeframe={setSelectedTimeframe}
            />
          )}

          {/* MAIN PAGE CONTENT AREA (WHITE / LIGHT CANVAS) */}
          <main className="p-6 space-y-5 max-w-7xl mx-auto w-full">

            {/* TAB: SYNTHETIC CLOUD SANDBOX (OFFLINE 4-SERVICE SUITE) */}
            {activeTab === 'sandbox' && (
              <SyntheticSandboxView
                onBackToLiveAWS={() => setActiveTab('dashboard')}
                onOpenPostmortem={() => setShowPostmortem(true)}
                onOpenApproval={() => {
                  if (currentPendingAction) {
                    setActiveApprovalAction(currentPendingAction);
                  }
                }}
              />
            )}

            {/* TAB: INCIDENT COMMAND CENTER (LIVE AWS SRE WORKBENCH) */}
            {activeTab === 'dashboard' && (
              <>
                {/* Service Catalog Topology Strip */}
                <ServiceHealthStrip
                  selectedService={selectedService}
                  onSelectService={setSelectedService}
                />

                {/* Pending Human Approval Gate Banner */}
                {pendingApprovals.length > 0 && (
                  <div className="bg-amber-50 border border-amber-300 p-3.5 flex items-center justify-between shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-amber-100 text-amber-800 border border-amber-300">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[10px] font-mono font-bold text-amber-900 uppercase tracking-wider">
                          SleuthOps Human Authorization Gatekeeper ({pendingApprovals.length} Pending)
                        </div>
                        <div className="text-xs font-semibold text-slate-900 mt-0.5">
                          High-risk autonomous remediation action requires human sign-off for <span className="font-mono text-purple-700">{pendingApprovals[0].target_resource}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveApprovalAction(pendingApprovals[0])}
                      className="px-3.5 py-1.5 bg-[#FF9900] hover:bg-amber-500 text-slate-950 text-xs font-bold transition font-mono shadow-sm"
                    >
                      Review Action Gate
                    </button>
                  </div>
                )}

                <div className="space-y-5 animate-in fade-in duration-200">
                  
                  {/* Active Incident Header Banner (if incident selected) */}
                  {selectedIncident && (
                    <div className="bg-white border border-[#E2E8F0] p-4 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center space-x-3">
                          <span className={`text-[11px] font-mono font-bold px-2 py-0.5 ${
                            selectedIncident.severity === 'CRITICAL' ? 'bg-red-100 text-[#D32F2F] border border-red-300' :
                            selectedIncident.severity === 'HIGH' ? 'bg-amber-100 text-[#C27803] border border-amber-300' :
                            'bg-purple-100 text-purple-800 border border-purple-300'
                          }`}>
                            SEV-{selectedIncident.severity === 'CRITICAL' ? '1' : selectedIncident.severity === 'HIGH' ? '2' : '3'} ({selectedIncident.severity})
                          </span>
                          <div>
                            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-header">
                              <span>{selectedIncident.id}:</span>
                              <span>{selectedIncident.title}</span>
                            </h2>
                            <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                              Target: <span className="text-purple-700 font-semibold">{selectedIncident.service}</span> • Declared: {new Date(selectedIncident.started_at).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 text-xs font-mono">
                          <div className="text-right">
                            <div className="text-slate-500 text-[9px]">MTTD / MTTR</div>
                            <div className="text-slate-800 font-bold">{selectedIncident.mttd_seconds || 1.2}s / {selectedIncident.mttr_seconds || 45}s</div>
                          </div>
                          <div className="text-right">
                            <div className="text-slate-500 text-[9px]">COMMANDER</div>
                            <div className="text-purple-700 font-bold">Sleuth AI SRE</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 4-Agent Workflow Board */}
                  <AgentWorkflowBoard
                    incident={selectedIncident}
                    onOpenPostmortem={() => setShowPostmortem(true)}
                    onOpenApproval={() => {
                      if (currentPendingAction) {
                        setActiveApprovalAction(currentPendingAction);
                      }
                    }}
                    onStopPipeline={() => {
                      if (selectedIncident) {
                        stopPipeline(selectedIncident.id);
                      }
                    }}
                  />

                  {/* 2-Column Split View */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    
                    {/* Left Column (2 Cols): Diagnosis */}
                    <div className="lg:col-span-2 space-y-5">
                      <DiagnosisPanel incident={selectedIncident} />
                    </div>

                    {/* Right Column (1 Col): Incident Log List & Timeline */}
                    <div className="space-y-5">
                      
                      {/* SleuthOps Incident Records List */}
                      <div className="bg-white border border-[#E2E8F0] p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3 border-b border-[#E2E8F0] pb-2">
                          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 font-header">
                            <ShieldAlert className="w-3.5 h-3.5 text-purple-600" />
                            Monitored Incidents
                          </h2>
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-mono text-slate-500">
                              {incidents.length} Records
                            </span>
                            {incidents.length > 0 && (
                              <button
                                onClick={() => {
                                  if (window.confirm('Clear all incident records, diagnoses, and audit logs?')) {
                                    clearIncidentHistory();
                                  }
                                }}
                                className="flex items-center space-x-1 text-[10px] font-mono px-1.5 py-0.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition"
                                title="Clear all incident history"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                                <span>Clear</span>
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                          {incidents.length === 0 ? (
                            <div className="text-center py-6 px-3 text-xs text-slate-500 font-mono space-y-2.5">
                              <div>No active incidents on live AWS infrastructure. CloudWatch telemetry is healthy.</div>
                              <button
                                onClick={() => triggerScenario('aws_ec2_cpu_saturation', 'aws')}
                                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#7C3AED] hover:bg-purple-600 text-white text-xs font-semibold transition shadow-sm font-sans"
                              >
                                <Flame className="w-3.5 h-3.5 text-orange-300" />
                                <span>Simulate EC2 CPU Saturation</span>
                              </button>
                            </div>
                          ) : (
                            incidents.map(inc => {
                              const isSelected = selectedIncident?.id === inc.id;
                              const isResolved = ['RESOLVED', 'DOCUMENTED', 'CLOSED'].includes(inc.status);

                              return (
                                <button
                                  key={inc.id}
                                  onClick={() => setSelectedIncidentId(inc.id)}
                                  className={`w-full text-left p-2.5 border transition flex items-start justify-between ${
                                    isSelected
                                      ? 'bg-purple-50/80 border-purple-500 shadow-sm'
                                      : 'bg-[#F8F9FA] border-[#E2E8F0] hover:bg-[#F1F3F7] hover:border-slate-300'
                                  }`}
                                >
                                  <div className="min-w-0 flex-1 pr-2">
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <span className="text-[9px] font-mono font-semibold px-1 py-0.2 bg-white border border-[#E2E8F0] text-purple-700">
                                        {inc.id}
                                      </span>
                                      <span className={`text-[9px] font-mono font-bold px-1 py-0.2 ${
                                        inc.severity === 'CRITICAL' ? 'bg-red-100 text-[#D32F2F]' :
                                        inc.severity === 'HIGH' ? 'bg-amber-100 text-[#C27803]' :
                                        'bg-purple-100 text-purple-700'
                                      }`}>
                                        {inc.severity}
                                      </span>
                                    </div>
                                    <div className="text-xs font-semibold text-slate-800 truncate font-header">{inc.title}</div>
                                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">svc:{inc.service}</div>
                                  </div>

                                  <div className="flex flex-col items-end flex-shrink-0">
                                    <span className={`text-[9px] font-mono px-1.5 py-0.2 font-medium ${
                                      inc.status === 'AWAITING_APPROVAL' ? 'bg-amber-100 text-[#C27803] border border-amber-300 animate-pulse' :
                                      isResolved ? 'bg-emerald-100 text-[#0E7A4C]' :
                                      'bg-purple-100 text-purple-700'
                                    }`}>
                                      {inc.status}
                                    </span>
                                    <span className="text-[9px] text-slate-500 font-mono mt-2">
                                      {new Date(inc.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* SleuthOps Event Stream Audit Feed */}
                      <div className="bg-white border border-[#E2E8F0] p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3 border-b border-[#E2E8F0] pb-2">
                          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 font-header">
                            <Clock className="w-3.5 h-3.5 text-cyan-600" />
                            SleuthOps Event Stream
                          </h2>
                          {selectedIncident && (
                            <span className="text-[10px] font-mono text-purple-700 font-semibold">{selectedIncident.id}</span>
                          )}
                        </div>

                        <div className="max-h-80 overflow-y-auto pr-1">
                          <TimelineFeed timeline={selectedIncident?.timeline || []} />
                        </div>
                      </div>

                    </div>

                  </div>

                </div>
              </>
            )}

            {/* TAB: AGENT ORCHESTRATION */}
            {activeTab === 'orchestration' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <AgentWorkflowBoard
                  incident={selectedIncident}
                  onOpenPostmortem={() => setShowPostmortem(true)}
                  onOpenApproval={() => {
                    if (currentPendingAction) {
                      setActiveApprovalAction(currentPendingAction);
                    }
                  }}
                />
                <div className="bg-white border border-[#E2E8F0] p-4 shadow-sm">
                  <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2 font-header">
                    <Clock className="w-4 h-4 text-cyan-600" />
                    Full Lifecycle Agent Event Stream
                  </h2>
                  <TimelineFeed timeline={selectedIncident?.timeline || []} />
                </div>
              </div>
            )}

            {/* TAB: KNOWLEDGE BASE */}
            {activeTab === 'knowledge' && (
              <div className="animate-in fade-in duration-200">
                <KnowledgeBaseSearch onClose={() => setActiveTab('dashboard')} />
              </div>
            )}

            {/* TAB: RESEARCH BENCHMARK */}
            {activeTab === 'benchmark' && (
              <div className="animate-in fade-in duration-200">
                <BenchmarkEvaluationView onClose={() => setActiveTab('dashboard')} />
              </div>
            )}

          </main>
        </div>

        {/* SleuthOps Footer */}
        <footer className="border-t border-[#E2E8F0] bg-white py-3 px-6 text-center text-xs text-slate-500 font-mono">
          <div className="font-semibold text-slate-700 text-[11px]">
            SLEUTHOPS AUTONOMOUS SRE INCIDENT MANAGEMENT & RESPONSE PLATFORM
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Authored by: Atharva Sharma, Saurabh Nautiyal, Nikhil Kumar Singh, Kunal Pal • School of Computer Science, UPES Dehradun
          </div>
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
