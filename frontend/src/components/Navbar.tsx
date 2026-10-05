import React from 'react';
import { 
  Activity, 
  ShieldAlert, 
  RotateCcw, 
  Cpu, 
  Wifi, 
  WifiOff, 
  Layers, 
  Clock, 
  BookOpen,
  FlaskConical
} from 'lucide-react';
import { useIncidentContext } from '../context/IncidentContext';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  openPostmortem: () => void;
  openBenchmark: () => void;
  openKnowledge: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  openPostmortem,
  openBenchmark,
  openKnowledge
}) => {
  const { incidents, telemetry, isWsConnected, pendingApprovals, resetSandbox } = useIncidentContext();

  const activeIncidents = incidents.filter(i => !['RESOLVED', 'DOCUMENTED', 'CLOSED'].includes(i.status));
  const degradedServices = Object.values(telemetry.services).filter(s => s.status !== 'HEALTHY');

  return (
    <header className="border-b border-gray-800 bg-[#0F172A]/90 backdrop-blur sticky top-0 z-40 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Left: Branding & Agent Status */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 rounded-lg text-indigo-400">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight text-white flex items-center gap-2">
                Multi-Agent DevOps
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                  Autonomous SRE
                </span>
              </h1>
              <p className="text-xs text-slate-400">Incident Management & Autonomous Remediation Layer</p>
            </div>
          </div>
        </div>

        {/* Center: Live Status Badges */}
        <div className="flex items-center space-x-6 text-xs">
          
          {/* Active Incidents */}
          <div className="flex items-center space-x-2 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
            <ShieldAlert className={`w-4 h-4 ${activeIncidents.length > 0 ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`} />
            <span className="text-slate-400">Active Incidents:</span>
            <span className={`font-semibold ${activeIncidents.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {activeIncidents.length}
            </span>
          </div>

          {/* Pending Human Approvals */}
          {pendingApprovals.length > 0 && (
            <div className="flex items-center space-x-2 bg-red-950/40 px-3 py-1.5 rounded-lg border border-red-500/30 animate-pulse">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-red-300 font-medium">Pending Approvals:</span>
              <span className="font-bold text-red-400">{pendingApprovals.length}</span>
            </div>
          )}

          {/* WebSocket Link Status */}
          <div className="flex items-center space-x-2 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
            {isWsConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-mono">LIVE SYNC</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-rose-400 font-mono">DISCONNECTED</span>
              </>
            )}
          </div>
        </div>

        {/* Right: Quick Action Buttons & Navigation */}
        <div className="flex items-center space-x-3">
          
          <button
            onClick={openBenchmark}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
            title="Research Evaluation & Comparison"
          >
            <FlaskConical className="w-3.5 h-3.5 text-purple-400" />
            <span>Benchmark Evaluation</span>
          </button>

          <button
            onClick={openKnowledge}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
            title="Incident Knowledge Base"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>Knowledge Base</span>
          </button>

          <button
            onClick={resetSandbox}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-medium border border-rose-800/40 transition"
            title="Reset sandbox cloud to healthy baseline"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Sandbox</span>
          </button>
        </div>

      </div>
    </header>
  );
};
