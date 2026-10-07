import React from 'react';
import { 
  ShieldAlert, 
  BrainCircuit, 
  BookOpen, 
  FlaskConical, 
  RotateCcw,
  Play,
  Flame,
  ChevronRight,
  Trash2
} from 'lucide-react';
import { useIncidentContext } from '../context/IncidentContext';

export type ActiveTab = 'dashboard' | 'sandbox' | 'orchestration' | 'knowledge' | 'benchmark';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { 
    isWsConnected, 
    pendingApprovals, 
    resetSandbox, 
    scenarios, 
    triggerScenario, 
    incidents,
    clearIncidentHistory 
  } = useIncidentContext();
  const [selectedScenario, setSelectedScenario] = React.useState<string>('cpu_saturation');
  const [isResetting, setIsResetting] = React.useState<boolean>(false);
  const [isClearing, setIsClearing] = React.useState<boolean>(false);
  const [isSimulatingEC2, setIsSimulatingEC2] = React.useState<boolean>(false);

  const activeIncidents = incidents.filter(i => !['RESOLVED', 'DOCUMENTED', 'CLOSED'].includes(i.status));

  const handleSimulateEC2 = async () => {
    setIsSimulatingEC2(true);
    try {
      await triggerScenario('aws_ec2_cpu_saturation', 'aws');
    } catch (e) {
      console.error('Error simulating EC2 saturation:', e);
    } finally {
      setIsSimulatingEC2(false);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await resetSandbox();
    } catch (e) {
      console.error(e);
    } finally {
      setIsResetting(false);
    }
  };

  const handleClearHistory = async () => {
    if (window.confirm('Are you sure you want to permanently clear all incident history, diagnoses, and audit events?')) {
      setIsClearing(true);
      try {
        await clearIncidentHistory();
      } catch (e) {
        console.error(e);
      } finally {
        setIsClearing(false);
      }
    }
  };

  const navGroups = [
    {
      group: 'INCIDENTS & INVESTIGATIONS',
      items: [
        { 
          id: 'dashboard' as ActiveTab, 
          label: 'Incident Command', 
          tag: 'Live AWS SRE',
          icon: <ShieldAlert className="w-4 h-4" />,
          badge: pendingApprovals.length > 0 ? `${pendingApprovals.length} Gate` : (activeIncidents.length > 0 ? `${activeIncidents.length} Active` : undefined),
          badgeType: pendingApprovals.length > 0 ? 'warn' : 'alert'
        },
        { 
          id: 'sandbox' as ActiveTab, 
          label: 'Synthetic Sandbox', 
          tag: 'Offline 4-Service Suite',
          icon: <FlaskConical className="w-4 h-4 text-purple-400" />
        },
      ]
    },
    {
      group: 'WORKFLOW AUTOMATION',
      items: [
        { 
          id: 'orchestration' as ActiveTab, 
          label: 'Sleuth AI Orchestration', 
          tag: '4-Agent Pipeline',
          icon: <BrainCircuit className="w-4 h-4" /> 
        },
      ]
    },
    {
      group: 'SERVICE MEMORY & EVALUATION',
      items: [
        { 
          id: 'knowledge' as ActiveTab, 
          label: 'Knowledge Base & Runbooks', 
          tag: 'Postmortem RAG',
          icon: <BookOpen className="w-4 h-4" /> 
        },
        { 
          id: 'benchmark' as ActiveTab, 
          label: 'Research Benchmark', 
          tag: 'Agentic vs Baseline',
          icon: <FlaskConical className="w-4 h-4" /> 
        },
      ]
    }
  ];

  return (
    <aside className="w-64 bg-[#0B0C10] border-r border-[#1C1F2B] flex flex-col justify-between h-screen sticky top-0 z-40 select-none flex-shrink-0 font-sans">
      
      {/* Top Section */}
      <div className="flex-1 overflow-y-auto">
        
        {/* SleuthOps Product Header */}
        <div className="p-3.5 border-b border-[#1C1F2B] bg-[#0E1017] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-[#7C3AED] flex items-center justify-center text-white font-bold text-xs border border-purple-400/40 font-header">
              SO
            </div>
            <div>
              <div className="text-xs font-bold text-white tracking-wide font-header">
                SleuthOps Suite
              </div>
              <div className="text-[9px] font-mono text-purple-300">
                Autonomous DevOps APM
              </div>
            </div>
          </div>
          <span className="text-[9px] font-mono px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
            PROD
          </span>
        </div>

        {/* Navigation Categories */}
        <div className="p-3 space-y-4">
          {navGroups.map((grp, gIdx) => (
            <div key={gIdx} className="space-y-1">
              <div className="px-2 text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider">
                {grp.group}
              </div>

              {grp.items.map(item => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 text-xs transition group text-left ${
                      isActive
                        ? 'bg-[#7C3AED] text-white font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-[#1A1D2B]'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-purple-400'}`}>
                        {item.icon}
                      </div>
                      <div className="truncate">
                        <div className="truncate text-xs font-header">{item.label}</div>
                        <div className={`text-[10px] truncate ${isActive ? 'text-purple-200' : 'text-slate-500'}`}>
                          {item.tag}
                        </div>
                      </div>
                    </div>

                    {item.badge ? (
                      <span className={`px-1.5 py-0.5 text-[9px] font-mono font-bold ${
                        item.badgeType === 'warn'
                          ? 'bg-amber-400 text-slate-950 animate-pulse'
                          : 'bg-[#FF4D4D] text-white'
                      }`}>
                        {item.badge}
                      </span>
                    ) : (
                      <ChevronRight className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition text-slate-500 ${isActive ? 'opacity-100 text-white' : ''}`} />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* EC2 Simulation Widget in Sidebar (When in Incident Command / Live AWS) */}
        {activeTab === 'dashboard' && (
          <div className="px-3 pb-3">
            <div className="p-3 bg-[#11131C] border border-[#1C1F2B] space-y-2">
              <div className="text-[10px] font-mono font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-header">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  EC2 Simulation
                </span>
                <span className="text-[9px] text-purple-400 font-mono">AWS EC2</span>
              </div>

              <div className="text-[11px] text-slate-300 font-medium font-header">
                EC2 CPU Saturation &amp; Thread Pool
              </div>

              <p className="text-[10px] text-slate-400 font-mono leading-tight">
                Simulate runaway worker CPU spike &gt; 90% on live EC2 instance to test agent detection.
              </p>

              <button
                onClick={handleSimulateEC2}
                disabled={isSimulatingEC2}
                className="w-full flex items-center justify-center space-x-1.5 py-1.5 bg-[#7C3AED] hover:bg-purple-600 text-white text-xs font-semibold transition disabled:opacity-50"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Simulate EC2 Contention</span>
                {isSimulatingEC2 && <span className="w-1.5 h-1.5 bg-yellow-300 animate-ping ml-1" />}
              </button>
            </div>
          </div>
        )}

        {/* Quick Scenario Injector Widget in Sidebar (Only in Synthetic Sandbox) */}
        {activeTab === 'sandbox' && (
          <div className="px-3 pb-3">
            <div className="p-3 bg-[#11131C] border border-[#1C1F2B] space-y-2">
              <div className="text-[10px] font-mono font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-header">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  Chaos Injector
                </span>
                <span className="text-[9px] text-purple-400 font-mono">SANDBOX</span>
              </div>

              <select
                value={selectedScenario}
                onChange={(e) => setSelectedScenario(e.target.value)}
                className="w-full bg-[#0B0C10] border border-[#1C1F2B] text-[11px] px-2 py-1.5 text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
              >
                {scenarios.map(s => (
                  <option key={s.id} value={s.id} className="bg-[#0B0C10] text-slate-200">
                    {s.title}
                  </option>
                ))}
              </select>

              <button
                onClick={() => triggerScenario(selectedScenario, 'simulator')}
                className="w-full flex items-center justify-center space-x-1.5 py-1.5 bg-[#7C3AED] hover:bg-purple-600 text-white text-xs font-semibold transition"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Trigger Synthetic Failure</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Bottom Footer Status & Controls */}
      <div className="p-3 border-t border-[#1C1F2B] bg-[#0E1017] space-y-2.5">
        
        {/* SleuthOps Agent Live Status */}
        <div className="p-2.5 bg-[#0B0C10] border border-[#1C1F2B] flex items-center justify-between text-[10px] font-mono">
          <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 ${isWsConnected ? 'bg-[#00D084] animate-pulse' : 'bg-red-500'}`} />
            <span className="text-slate-300">SleuthOps Agent v2.4</span>
          </div>
          <span className={isWsConnected ? 'text-[#00D084]' : 'text-red-400'}>
            {isWsConnected ? 'CONNECTED' : 'DISCONNECTED'}
          </span>
        </div>

        {/* Flush Sandbox Button (Only in Synthetic Sandbox) */}
        {activeTab === 'sandbox' && (
          <button
            onClick={handleReset}
            disabled={isResetting}
            className="w-full flex items-center justify-center space-x-1.5 py-1.5 bg-[#141622] hover:bg-[#1C1F2B] border border-[#1C1F2B] text-slate-300 hover:text-white text-xs font-medium transition disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-slate-400 ${isResetting ? 'animate-spin' : ''}`} />
            <span>Reset Sandbox State</span>
          </button>
        )}

        {/* Clear Incident History Button */}
        <button
          onClick={handleClearHistory}
          disabled={isClearing}
          className="w-full flex items-center justify-center space-x-1.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 hover:text-red-200 text-xs font-medium transition disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-400" />
          <span>Clear Incident Records</span>
        </button>

        {/* User signature */}
        <div className="text-[10px] font-mono text-slate-500 text-center pt-1 border-t border-[#1C1F2B]/50">
          Org: <span className="text-slate-400">UPES DevOps AI Lab</span>
        </div>
      </div>

    </aside>
  );
};
