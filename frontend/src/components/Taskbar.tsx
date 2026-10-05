import React from 'react';
import { 
  LayoutDashboard, 
  Activity, 
  BrainCircuit, 
  BookOpen, 
  FlaskConical, 
  Wifi, 
  WifiOff, 
  RotateCcw,
  ShieldAlert,
  Play
} from 'lucide-react';
import { useIncidentContext } from '../context/IncidentContext';

export type ActiveTab = 'dashboard' | 'telemetry' | 'orchestration' | 'knowledge' | 'benchmark';

interface TaskbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Taskbar: React.FC<TaskbarProps> = ({ activeTab, setActiveTab }) => {
  const { isWsConnected, pendingApprovals, resetSandbox, scenarios, triggerScenario } = useIncidentContext();
  const [selectedScenario, setSelectedScenario] = React.useState<string>('cpu_saturation');

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { 
      id: 'dashboard', 
      label: 'Incident Command', 
      icon: <LayoutDashboard className="w-4 h-4" />,
      badge: pendingApprovals.length > 0 ? pendingApprovals.length : undefined
    },
    { 
      id: 'telemetry', 
      label: 'Live Telemetry & Logs', 
      icon: <Activity className="w-4 h-4" /> 
    },
    { 
      id: 'orchestration', 
      label: 'Agent Orchestration', 
      icon: <BrainCircuit className="w-4 h-4" /> 
    },
    { 
      id: 'knowledge', 
      label: 'Knowledge Base', 
      icon: <BookOpen className="w-4 h-4" /> 
    },
    { 
      id: 'benchmark', 
      label: 'Research Benchmark', 
      icon: <FlaskConical className="w-4 h-4" /> 
    },
  ];

  return (
    <header className="bg-[#0F172A] border-b border-slate-800 sticky top-0 z-50 shadow-lg">
      
      {/* Top Main Taskbar Row */}
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Left: Brand Identity */}
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 rounded-lg text-indigo-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-white flex items-center gap-2">
              Multi-Agent DevOps
              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                Autonomous SRE
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Incident Management & Remediation Platform</p>
          </div>
        </div>

        {/* Center: Main Taskbar Tab Switcher */}
        <nav className="flex items-center space-x-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition relative ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>

                {item.badge && (
                  <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-500 text-slate-950 animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: Quick Action Controls & Live Status */}
        <div className="flex items-center space-x-3">
          
          {/* Quick Scenario Injector */}
          <div className="flex items-center space-x-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
            <select
              value={selectedScenario}
              onChange={(e) => setSelectedScenario(e.target.value)}
              className="bg-transparent text-xs font-mono text-slate-300 focus:outline-none cursor-pointer"
            >
              {scenarios.map(s => (
                <option key={s.id} value={s.id} className="bg-slate-900 text-slate-200">
                  ⚡ {s.title}
                </option>
              ))}
            </select>
            <button
              onClick={() => triggerScenario(selectedScenario)}
              className="p-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs transition"
              title="Inject selected scenario"
            >
              <Play className="w-3 h-3 fill-current" />
            </button>
          </div>

          {/* Reset Button */}
          <button
            onClick={resetSandbox}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition"
            title="Reset simulated environment to healthy baseline"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Real-time Link Pill */}
          <div className="flex items-center space-x-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono">
            {isWsConnected ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-400 font-bold">REALTIME</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-rose-400">CONNECTING...</span>
              </>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};
