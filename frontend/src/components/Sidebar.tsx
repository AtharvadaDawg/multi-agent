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
  Play,
  Layers,
  ChevronRight,
  Flame
} from 'lucide-react';
import { useIncidentContext } from '../context/IncidentContext';

export type ActiveTab = 'dashboard' | 'telemetry' | 'orchestration' | 'knowledge' | 'benchmark';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { isWsConnected, pendingApprovals, resetSandbox, scenarios, triggerScenario, incidents } = useIncidentContext();
  const [selectedScenario, setSelectedScenario] = React.useState<string>('cpu_saturation');

  const activeIncidents = incidents.filter(i => !['RESOLVED', 'DOCUMENTED', 'CLOSED'].includes(i.status));

  const navItems: { id: ActiveTab; label: string; description: string; icon: React.ReactNode; badge?: number }[] = [
    { 
      id: 'dashboard', 
      label: 'Incident Command', 
      description: 'Active overview & RCA',
      icon: <LayoutDashboard className="w-4 h-4" />,
      badge: pendingApprovals.length > 0 ? pendingApprovals.length : undefined
    },
    { 
      id: 'telemetry', 
      label: 'Telemetry & Logs', 
      description: 'Metrics & stdout stream',
      icon: <Activity className="w-4 h-4" /> 
    },
    { 
      id: 'orchestration', 
      label: 'Agent Orchestration', 
      description: '4-agent lifecycle board',
      icon: <BrainCircuit className="w-4 h-4" /> 
    },
    { 
      id: 'knowledge', 
      label: 'Knowledge Base', 
      description: 'Historical postmortems',
      icon: <BookOpen className="w-4 h-4" /> 
    },
    { 
      id: 'benchmark', 
      label: 'Research Evaluation', 
      description: 'Multi-agent vs baseline',
      icon: <FlaskConical className="w-4 h-4" /> 
    },
  ];

  return (
    <aside className="w-64 bg-[#0F172A] border-r border-slate-800 flex flex-col justify-between h-screen sticky top-0 z-40 select-none flex-shrink-0">
      
      {/* Top Branding */}
      <div>
        <div className="p-5 border-b border-slate-800/80 flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
              Multi-Agent DevOps
            </h1>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              Autonomous SRE Platform
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          <div className="px-3 py-2 text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider">
            Navigation
          </div>

          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition group ${
                  isActive
                    ? 'bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-900/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'}`}>
                    {item.icon}
                  </div>
                  <div className="text-left">
                    <div>{item.label}</div>
                    <div className={`text-[10px] font-normal ${isActive ? 'text-indigo-200' : 'text-slate-500'}`}>
                      {item.description}
                    </div>
                  </div>
                </div>

                {item.badge ? (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-slate-950 animate-pulse">
                    {item.badge}
                  </span>
                ) : (
                  <ChevronRight className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition ${isActive ? 'opacity-100' : ''}`} />
                )}
              </button>
            );
          })}
        </nav>

        {/* Failure Scenario Injector Panel */}
        <div className="px-3 py-2">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Flame className="w-3 h-3 text-orange-400" />
              Scenario Injector
            </div>
            <select
              value={selectedScenario}
              onChange={(e) => setSelectedScenario(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none font-mono"
            >
              {scenarios.map(s => (
                <option key={s.id} value={s.id} className="bg-slate-900 text-slate-200">
                  {s.title}
                </option>
              ))}
            </select>
            <button
              onClick={() => triggerScenario(selectedScenario)}
              className="w-full flex items-center justify-center space-x-1.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Inject Scenario</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Footer Status & Controls */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 space-y-3">
        
        {/* Reset Sandbox */}
        <button
          onClick={resetSandbox}
          className="w-full flex items-center justify-center space-x-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Environment</span>
        </button>

        {/* Realtime WebSocket Status */}
        <div className="flex items-center justify-between text-xs font-mono px-2 py-1 bg-slate-900 rounded-lg border border-slate-800 text-slate-400">
          <span>WebSocket Stream:</span>
          {isWsConnected ? (
            <span className="flex items-center space-x-1.5 text-emerald-400 font-bold">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>LIVE</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1 text-rose-400">
              <WifiOff className="w-3 h-3" />
              <span>OFFLINE</span>
            </span>
          )}
        </div>

      </div>

    </aside>
  );
};
