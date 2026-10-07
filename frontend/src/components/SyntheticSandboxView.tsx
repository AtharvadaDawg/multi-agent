import React, { useState, useEffect, useRef } from 'react';
import { 
  RotateCcw, 
  Server, 
  ShieldAlert, 
  Clock, 
  ArrowLeft,
  Flame,
  Database,
  Unplug,
  Trash2,
  ChevronDown,
  Search,
  Zap,
  Layers,
  AlertTriangle
} from 'lucide-react';
import { useIncidentContext } from '../context/IncidentContext';
import * as api from '../services/api';
import { ServiceHealthStrip } from './ServiceHealthStrip';
import { AgentWorkflowBoard } from './AgentWorkflowBoard';
import { DiagnosisPanel } from './DiagnosisPanel';
import { TimelineFeed } from './TimelineFeed';

interface SyntheticSandboxViewProps {
  onBackToLiveAWS: () => void;
  onOpenPostmortem: () => void;
  onOpenApproval: () => void;
}

export const SyntheticSandboxView: React.FC<SyntheticSandboxViewProps> = ({
  onBackToLiveAWS,
  onOpenPostmortem,
  onOpenApproval
}) => {
  const { 
    incidents, 
    selectedIncident, 
    setSelectedIncidentId,
    pendingApprovals,
    setActiveApprovalAction,
    stopPipeline,
    clearIncidentHistory
  } = useIncidentContext();

  const [selectedService, setSelectedService] = useState<string>('order-service');
  const [isInjecting, setIsInjecting] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [sandboxTelemetry, setSandboxTelemetry] = useState<any>({ services: {}, metrics: {} });
  const [showChaosMenu, setShowChaosMenu] = useState<boolean>(false);
  const [showEnvMenu, setShowEnvMenu] = useState<boolean>(false);
  const [showTimeframeMenu, setShowTimeframeMenu] = useState<boolean>(false);
  const [selectedEnv, setSelectedEnv] = useState<string>('production');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('Live (30s)');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const chaosMenuRef = useRef<HTMLDivElement>(null);

  const pollSandbox = async () => {
    try {
      const data = await api.fetchSandboxTelemetry();
      setSandboxTelemetry(data);
    } catch (e) {
      console.debug('Error polling sandbox telemetry:', e);
    }
  };

  useEffect(() => {
    pollSandbox();
    const interval = setInterval(pollSandbox, 3000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chaosMenuRef.current && !chaosMenuRef.current.contains(event.target as Node)) {
        setShowChaosMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTriggerSyntheticScenario = async (scenarioId: string) => {
    setIsInjecting(scenarioId);
    setShowChaosMenu(false);
    try {
      await api.triggerScenario(scenarioId, 'simulator');
      await pollSandbox();
    } catch (e) {
      console.error(e);
    } finally {
      setIsInjecting(null);
    }
  };

  const handleResetSandbox = async () => {
    setIsResetting(true);
    try {
      await api.resetSandbox();
      await pollSandbox();
    } catch (e) {
      console.error(e);
    } finally {
      setIsResetting(false);
    }
  };

  const currentPendingAction = selectedIncident?.actions?.find(
    a => a.approval_status === 'PENDING'
  ) || (pendingApprovals.length > 0 ? pendingApprovals[0] : null);

  const syntheticScenarios = [
    { 
      id: 'cpu_saturation', 
      title: 'CPU Saturation & Thread Pool Starvation', 
      target: 'order-service', 
      severity: 'HIGH',
      description: 'Runaway worker threads causing CPU spikes > 95% and blocking order checkout requests.',
      icon: <Flame className="w-3.5 h-3.5 text-orange-400" /> 
    },
    { 
      id: 'db_pool_exhaustion', 
      title: 'Database Connection Pool Exhaustion', 
      target: 'postgres-db', 
      severity: 'CRITICAL',
      description: 'PostgreSQL connection pool saturation (20/20 active) causing 30s query lease timeouts.',
      icon: <Database className="w-3.5 h-3.5 text-purple-400" /> 
    },
    { 
      id: 'dependency_failure', 
      title: 'Upstream Payment Gateway Latency & Timeout', 
      target: 'payment-gateway', 
      severity: 'HIGH',
      description: 'External banking partner API latency > 4500ms causing payment gateway thread stalls.',
      icon: <Unplug className="w-3.5 h-3.5 text-red-400" /> 
    },
    { 
      id: 'error_spike', 
      title: 'HTTP 500 Internal Server Error Surge', 
      target: 'order-service', 
      severity: 'CRITICAL',
      description: 'Release v2.4.0 introduced an unhandled exception in checkout path.',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> 
    },
    { 
      id: 'failed_deployment', 
      title: 'Failed Container Canary Rollout', 
      target: 'order-service', 
      severity: 'HIGH',
      description: 'New container canary release failing health checks with exit code 137.',
      icon: <Layers className="w-3.5 h-3.5 text-amber-400" /> 
    }
  ];

  const currentSvc = sandboxTelemetry.services?.[selectedService] || {
    version: 'v1.4.2',
    replicas: 3,
    status: 'HEALTHY',
    cpu_base: 24.0,
    mem_base: 42.0,
    latency_base: 45.0,
    error_rate_base: 0.05,
    db_pool_size: 20,
    active_connections: 8,
    dependencies: ['postgres-db', 'payment-gateway', 'auth-service']
  };

  const currentMetrics = sandboxTelemetry.metrics?.[selectedService] || [];
  const svcLatency = currentMetrics.find((m: any) => m.metric_name === 'latency_p99')?.value ?? currentSvc.latency_base;
  const svcErrRate = currentMetrics.find((m: any) => m.metric_name === 'error_rate')?.value ?? (currentSvc.error_rate_base * 100);
  const svcCpu = currentMetrics.find((m: any) => m.metric_name === 'cpu_utilization')?.value ?? currentSvc.cpu_base;
  const svcMem = currentMetrics.find((m: any) => m.metric_name === 'memory_utilization')?.value ?? currentSvc.mem_base;

  return (
    <div className="space-y-5 animate-in fade-in duration-200 font-sans">
      
      {/* 1. TOPBAR MATCHING INITIAL DESIGN WITH CHAOS SIMULATOR, REGION, CLUSTER, ENV (BLACK HEADBAR) */}
      <div className="bg-[#0B0C10] border border-[#1C1F2B] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
        
        {/* Brand & Context Identifiers */}
        <div className="flex items-center space-x-3">
          
          {/* Back to Live AWS button */}
          <button
            onClick={onBackToLiveAWS}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-[#141622] hover:bg-[#1C1F2B] border border-[#1C1F2B] text-slate-300 hover:text-white text-xs font-mono transition"
            title="Return to real AWS CloudWatch monitoring"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Live AWS</span>
          </button>

          {/* SleuthOps Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 bg-[#7C3AED] flex items-center justify-center border border-purple-400/40 text-white font-extrabold text-xs">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L3 7v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7l-9-5z" />
                <circle cx="11" cy="11" r="3" />
                <path d="m14 14 3 3" />
              </svg>
            </div>
            <div>
              <div className="flex items-center space-x-1.5 leading-none">
                <span className="font-extrabold text-xs tracking-tight text-white uppercase font-header">
                  SLEUTHOPS
                </span>
                <span className="text-[9px] font-mono px-1 py-0.2 bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold">
                  AI SRE
                </span>
              </div>
              <div className="text-[8px] text-slate-400 font-mono tracking-wider">
                AUTONOMOUS CLOUD APM & INCIDENT RESPONSE
              </div>
            </div>
          </div>

          <div className="h-5 w-px bg-[#1C1F2B]" />

          {/* env: production selector */}
          <div className="relative">
            <button
              onClick={() => setShowEnvMenu(!showEnvMenu)}
              className="flex items-center space-x-1.5 px-2.5 py-1 bg-[#141622] border border-[#1C1F2B] text-[11px] font-mono hover:border-slate-500 transition"
            >
              <span className="text-slate-500">env:</span>
              <span className="text-purple-300 font-semibold">{selectedEnv}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {showEnvMenu && (
              <div className="absolute left-0 mt-1 w-32 bg-[#11131C] border border-[#1C1F2B] shadow-xl z-50 py-1 font-mono text-[11px]">
                {['production', 'staging', 'synthetic-sandbox'].map(e => (
                  <button
                    key={e}
                    onClick={() => { setSelectedEnv(e); setShowEnvMenu(false); }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-[#1C1F2B] ${selectedEnv === e ? 'text-purple-300 font-bold' : 'text-slate-300'}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* region: us-east-1 */}
          <div className="flex items-center space-x-1 px-2.5 py-1 bg-[#141622] border border-[#1C1F2B] text-[11px] font-mono">
            <span className="text-slate-500">region:</span>
            <span className="text-slate-200">us-east-1</span>
          </div>

          {/* cluster: k8s-prod-mesh */}
          <div className="hidden lg:flex items-center space-x-1 px-2.5 py-1 bg-[#141622] border border-[#1C1F2B] text-[11px] font-mono">
            <span className="text-slate-500">cluster:</span>
            <span className="text-slate-200">k8s-prod-mesh</span>
          </div>

        </div>

        {/* Center Search bar */}
        <div className="flex-1 max-w-xs mx-2 hidden xl:block">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search metrics, services... (⌘K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#11131C] border border-[#1C1F2B] focus:border-purple-500 pl-8 pr-9 py-1 text-xs text-slate-200 placeholder-slate-500 outline-none font-sans"
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-mono px-1 py-0.2 bg-[#141622] border border-[#1C1F2B] text-slate-400">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right Controls: Purple Chaos Simulator Button, Timeframe, Live Pill, Avatar */}
        <div className="flex items-center space-x-2.5">
          
          {/* PURPLE CHAOS SIMULATOR BUTTON WITH DROPDOWN */}
          <div className="relative" ref={chaosMenuRef}>
            <button
              onClick={() => setShowChaosMenu(!showChaosMenu)}
              className="flex items-center space-x-2 px-3.5 py-1.5 bg-[#7C3AED] hover:bg-purple-600 text-white text-xs font-bold transition shadow-md font-header"
            >
              <Zap className="w-3.5 h-3.5 fill-current text-yellow-300" />
              <span>Chaos Simulator</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-80" />
            </button>

            {/* Dropdown Menu of Synthetic Scenarios */}
            {showChaosMenu && (
              <div className="absolute right-0 mt-1.5 w-80 bg-[#11131C] border border-[#1C1F2B] shadow-2xl z-50 p-2 space-y-1 font-sans animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2 py-1.5 border-b border-[#1C1F2B] flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-purple-300 uppercase tracking-wider">
                    Controlled Failure Injection
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">4 Services</span>
                </div>

                <div className="space-y-1 max-h-72 overflow-y-auto pt-1">
                  {syntheticScenarios.map((scen) => (
                    <button
                      key={scen.id}
                      onClick={() => handleTriggerSyntheticScenario(scen.id)}
                      disabled={isInjecting !== null}
                      className="w-full text-left p-2 hover:bg-[#1C1F2B] border border-transparent hover:border-purple-500/40 transition group flex items-start space-x-2.5"
                    >
                      <div className="p-1 bg-[#0B0C10] border border-[#1C1F2B] group-hover:border-purple-500/50 mt-0.5">
                        {scen.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-semibold text-white group-hover:text-purple-300 truncate font-header">
                            {scen.title}
                          </div>
                          <span className={`text-[9px] font-mono px-1 py-0.2 ${
                            scen.severity === 'CRITICAL' ? 'bg-red-500/20 text-[#FF4D4D]' : 'bg-amber-500/20 text-[#FF9900]'
                          }`}>
                            {scen.severity}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                          {scen.description}
                        </p>
                        <div className="text-[9px] font-mono text-purple-300/80 mt-1">
                          target: {scen.target}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="pt-1.5 border-t border-[#1C1F2B]">
                  <button
                    onClick={handleResetSandbox}
                    disabled={isResetting}
                    className="w-full flex items-center justify-center space-x-1.5 py-1.5 bg-[#141622] hover:bg-[#1C1F2B] text-slate-300 hover:text-white text-xs font-mono transition"
                  >
                    <RotateCcw className={`w-3 h-3 text-slate-400 ${isResetting ? 'animate-spin' : ''}`} />
                    <span>Flush & Reset Sandbox State</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Timeframe Selector */}
          <div className="relative">
            <button
              onClick={() => setShowTimeframeMenu(!showTimeframeMenu)}
              className="flex items-center space-x-1.5 px-2.5 py-1 bg-[#141622] border border-[#1C1F2B] text-[11px] font-mono hover:border-slate-500 transition"
            >
              <Clock className="w-3 h-3 text-slate-400" />
              <span>{selectedTimeframe}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {showTimeframeMenu && (
              <div className="absolute right-0 mt-1 w-32 bg-[#11131C] border border-[#1C1F2B] shadow-xl z-50 py-1 font-mono text-[11px]">
                {['Live (30s)', 'Past 15m', 'Past 1h', 'Past 4h', 'Past 1d'].map(tf => (
                  <button
                    key={tf}
                    onClick={() => { setSelectedTimeframe(tf); setShowTimeframeMenu(false); }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-[#1C1F2B] ${selectedTimeframe === tf ? 'text-purple-300 font-bold' : 'text-slate-300'}`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Live Status Pill */}
          <div className="flex items-center space-x-1.5 px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold">
            <span className="w-2 h-2 bg-[#00D084] animate-pulse" />
            <span>LIVE</span>
          </div>

          {/* User Profile Avatar */}
          <div className="flex items-center space-x-2 pl-1 border-l border-[#1C1F2B]">
            <div className="w-6 h-6 bg-[#7C3AED] text-white flex items-center justify-center font-bold text-[10px] font-mono">
              SO
            </div>
            <div className="hidden 2xl:block text-left">
              <div className="text-[10px] font-bold text-white font-header leading-tight">SleuthOps Platform</div>
              <div className="text-[9px] text-purple-300 font-mono">SRE Lead</div>
            </div>
          </div>

        </div>

      </div>

      {/* 2. SYNTHETIC SERVICE CATALOG TOPOLOGY STRIP (4 MICROSERVICES: order-service, payment-gateway, auth-service, postgres-db) */}
      <ServiceHealthStrip
        selectedService={selectedService}
        onSelectService={setSelectedService}
        telemetryOverride={sandboxTelemetry}
      />

      {/* 3. SELECTED MICROSERVICE TELEMETRY & DIAGNOSTICS INSPECTOR */}
      <div className="bg-white border border-[#E2E8F0] p-4 font-sans shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 border-b border-[#E2E8F0] pb-2.5">
          <div className="flex items-center space-x-2.5">
            <Server className="w-4 h-4 text-purple-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-header">
              Microservice Inspector • <span className="text-purple-700 font-mono">{selectedService}</span>
            </h3>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 font-bold ${
              currentSvc.status === 'DEGRADED' ? 'bg-red-100 text-[#D32F2F] border border-red-300' : 'bg-emerald-100 text-[#0E7A4C] border border-emerald-300'
            }`}>
              {currentSvc.status}
            </span>
          </div>

          <div className="flex items-center space-x-3 text-[10px] font-mono text-slate-500">
            <span>Version: <strong className="text-slate-800">{currentSvc.version || 'v1.4.2'}</strong></span>
            <span>Replicas: <strong className="text-slate-800">{currentSvc.replicas || 3} Pods</strong></span>
            <span>DB Pool: <strong className="text-slate-800">{currentSvc.active_connections || 8}/{currentSvc.db_pool_size || 20}</strong></span>
          </div>
        </div>

        {/* 4 Stat Cards for Selected Service */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
          <div className="bg-[#F8F9FA] border border-[#E2E8F0] p-3">
            <div className="text-[10px] text-slate-500">P99 LATENCY</div>
            <div className={`text-base font-bold mt-1 ${svcLatency > 400 ? 'text-[#D32F2F]' : 'text-slate-800'}`}>
              {Math.round(svcLatency)} ms
            </div>
            <div className="text-[9px] text-slate-400 mt-0.5">Threshold: 500ms</div>
          </div>

          <div className="bg-[#F8F9FA] border border-[#E2E8F0] p-3">
            <div className="text-[10px] text-slate-500">ERROR RATE</div>
            <div className={`text-base font-bold mt-1 ${svcErrRate > 5 ? 'text-[#D32F2F]' : 'text-slate-800'}`}>
              {svcErrRate.toFixed(2)} %
            </div>
            <div className="text-[9px] text-slate-400 mt-0.5">Threshold: 5.0%</div>
          </div>

          <div className="bg-[#F8F9FA] border border-[#E2E8F0] p-3">
            <div className="text-[10px] text-slate-500">CPU UTILIZATION</div>
            <div className={`text-base font-bold mt-1 ${svcCpu > 80 ? 'text-[#D32F2F]' : 'text-slate-800'}`}>
              {Math.round(svcCpu)} %
            </div>
            <div className="w-full bg-slate-200 h-1.5 mt-1 overflow-hidden">
              <div className={`h-full ${svcCpu > 80 ? 'bg-[#D32F2F]' : 'bg-purple-600'}`} style={{ width: `${Math.min(svcCpu, 100)}%` }} />
            </div>
          </div>

          <div className="bg-[#F8F9FA] border border-[#E2E8F0] p-3">
            <div className="text-[10px] text-slate-500">MEMORY UTILIZATION</div>
            <div className={`text-base font-bold mt-1 ${svcMem > 80 ? 'text-[#D32F2F]' : 'text-slate-800'}`}>
              {Math.round(svcMem)} %
            </div>
            <div className="w-full bg-slate-200 h-1.5 mt-1 overflow-hidden">
              <div className={`h-full ${svcMem > 80 ? 'bg-[#D32F2F]' : 'bg-cyan-600'}`} style={{ width: `${Math.min(svcMem, 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* 4. ACTIVE INCIDENT HEADER BANNER (if incident selected) */}
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

      {/* 5. 4-AGENT WORKFLOW BOARD */}
      <AgentWorkflowBoard
        incident={selectedIncident}
        onOpenPostmortem={onOpenPostmortem}
        onOpenApproval={() => {
          if (currentPendingAction) {
            setActiveApprovalAction(currentPendingAction);
            onOpenApproval();
          }
        }}
        onStopPipeline={() => {
          if (selectedIncident) {
            stopPipeline(selectedIncident.id);
          }
        }}
      />

      {/* 6. 2-COLUMN SPLIT VIEW: DIAGNOSIS & INCIDENT LOG LIST */}
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
                Simulated Incidents
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
                <div className="text-center py-6 text-xs text-slate-500 font-mono">
                  No active incidents. Use the Chaos Simulator button above to inject failures!
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
                Agent Timeline Stream
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
  );
};
