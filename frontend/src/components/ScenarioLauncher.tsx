import React from 'react';
import { Play, Flame, AlertCircle, Database, GitPullRequest, Unplug, ShieldAlert } from 'lucide-react';
import { useIncidentContext } from '../context/IncidentContext';

export const ScenarioLauncher: React.FC = () => {
  const { scenarios, triggerScenario, isLoading } = useIncidentContext();

  const getScenarioIcon = (id: string) => {
    switch (id) {
      case 'cpu_saturation':
        return <Flame className="w-4 h-4 text-orange-400" />;
      case 'error_spike':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'db_pool_exhaustion':
        return <Database className="w-4 h-4 text-cyan-400" />;
      case 'failed_deployment':
        return <GitPullRequest className="w-4 h-4 text-amber-400" />;
      case 'dependency_failure':
        return <Unplug className="w-4 h-4 text-purple-400" />;
      default:
        return <Play className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            Controlled Incident Scenario Simulator
          </h2>
          <p className="text-xs text-slate-400">
            Inject synthetic production faults into sandbox cloud to evaluate multi-agent response
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {scenarios.map(scen => (
          <div
            key={scen.id}
            className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                  {getScenarioIcon(scen.id)}
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  scen.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                  scen.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-indigo-500/20 text-indigo-400'
                }`}>
                  {scen.severity}
                </span>
              </div>
              <h3 className="text-xs font-semibold text-slate-100">{scen.title}</h3>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">Target: {scen.target_service}</div>
              <p className="text-[11px] text-slate-400 mt-2 line-clamp-2 leading-tight">
                {scen.description}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-mono">
                {scen.requires_human_approval ? 'Approval Gate' : 'Auto Remediate'}
              </span>
              <button
                onClick={() => triggerScenario(scen.id)}
                disabled={isLoading}
                className="flex items-center space-x-1 px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow transition"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Inject</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
