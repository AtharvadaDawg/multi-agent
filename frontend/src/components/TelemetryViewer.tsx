import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine 
} from 'recharts';
import { Activity, Server, Database, ShieldAlert, Cpu } from 'lucide-react';
import { useIncidentContext } from '../context/IncidentContext';

export const TelemetryViewer: React.FC = () => {
  const { telemetry } = useIncidentContext();
  const [selectedService, setSelectedService] = useState<string>('order-service');
  const [history, setHistory] = useState<any[]>([]);

  const services = Object.keys(telemetry.services);
  const activeSvcData = telemetry.services[selectedService] || {
    status: 'HEALTHY',
    version: 'v1.0.0',
    replicas: 1,
    dependencies: [],
    db_pool_size: 50
  };

  const currentMetrics = telemetry.metrics[selectedService] || [];

  // Keep sliding window of latest 20 metric samples
  useEffect(() => {
    if (currentMetrics.length > 0) {
      const point: any = {
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
      currentMetrics.forEach(m => {
        point[m.metric_name] = m.value;
      });

      setHistory(prev => [...prev.slice(-19), point]);
    }
  }, [telemetry]);

  const cpuMetric = currentMetrics.find(m => m.metric_name === 'cpu_utilization')?.value || 0;
  const memMetric = currentMetrics.find(m => m.metric_name === 'memory_utilization')?.value || 0;
  const latMetric = currentMetrics.find(m => m.metric_name === 'latency_p99')?.value || 0;
  const errMetric = currentMetrics.find(m => m.metric_name === 'error_rate')?.value || 0;
  const dbConnMetric = currentMetrics.find(m => m.metric_name === 'db_connections')?.value || 0;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 mb-6">
      
      {/* Header & Service Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            Operational Telemetry Stream
          </h2>
          <p className="text-xs text-slate-400">Continuous metric sampling across cloud microservices</p>
        </div>

        <div className="flex items-center space-x-2">
          {services.map(svc => {
            const isDegraded = telemetry.services[svc]?.status === 'DEGRADED';
            return (
              <button
                key={svc}
                onClick={() => {
                  setSelectedService(svc);
                  setHistory([]);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition flex items-center gap-1.5 border ${
                  selectedService === svc
                    ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${isDegraded ? 'bg-red-400 animate-ping' : 'bg-emerald-400'}`} />
                {svc}
              </button>
            );
          })}
        </div>
      </div>

      {/* Real-time KPI Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        <div className={`p-3 rounded-lg border ${cpuMetric > 85 ? 'bg-red-950/30 border-red-500/50 text-red-300' : 'bg-slate-950/40 border-slate-800 text-slate-300'}`}>
          <div className="text-[11px] text-slate-400">CPU Load</div>
          <div className="text-xl font-bold font-mono mt-0.5">{cpuMetric}%</div>
          <div className="text-[10px] text-slate-500">Threshold: 85%</div>
        </div>

        <div className={`p-3 rounded-lg border ${memMetric > 85 ? 'bg-red-950/30 border-red-500/50 text-red-300' : 'bg-slate-950/40 border-slate-800 text-slate-300'}`}>
          <div className="text-[11px] text-slate-400">Memory Load</div>
          <div className="text-xl font-bold font-mono mt-0.5">{memMetric}%</div>
          <div className="text-[10px] text-slate-500">Threshold: 85%</div>
        </div>

        <div className={`p-3 rounded-lg border ${latMetric > 500 ? 'bg-amber-950/30 border-amber-500/50 text-amber-300' : 'bg-slate-950/40 border-slate-800 text-slate-300'}`}>
          <div className="text-[11px] text-slate-400">P99 Latency</div>
          <div className="text-xl font-bold font-mono mt-0.5">{latMetric} ms</div>
          <div className="text-[10px] text-slate-500">Threshold: 500ms</div>
        </div>

        <div className={`p-3 rounded-lg border ${errMetric > 5.0 ? 'bg-red-950/30 border-red-500/50 text-red-300' : 'bg-slate-950/40 border-slate-800 text-slate-300'}`}>
          <div className="text-[11px] text-slate-400">Error Rate (5xx)</div>
          <div className="text-xl font-bold font-mono mt-0.5">{errMetric}%</div>
          <div className="text-[10px] text-slate-500">Threshold: 5%</div>
        </div>

        <div className="p-3 rounded-lg border bg-slate-950/40 border-slate-800 text-slate-300">
          <div className="text-[11px] text-slate-400">DB Pool Connections</div>
          <div className="text-xl font-bold font-mono mt-0.5">{dbConnMetric}</div>
          <div className="text-[10px] text-slate-500">Pool Limit: {activeSvcData.db_pool_size || 50}</div>
        </div>
      </div>

      {/* Real-time Recharts Graph */}
      <div className="h-64 w-full bg-slate-950/50 rounded-lg p-3 border border-slate-800/80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
            <XAxis dataKey="time" stroke="#64748B" fontSize={10} />
            <YAxis stroke="#64748B" fontSize={10} domain={[0, 'auto']} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
              labelStyle={{ color: '#94A3B8' }}
            />
            <ReferenceLine y={85} stroke="#EF4444" strokeDasharray="4 4" label={{ value: 'CPU Crit', fill: '#EF4444', fontSize: 10 }} />
            <ReferenceLine y={500} stroke="#F59E0B" strokeDasharray="4 4" label={{ value: 'Latency Crit', fill: '#F59E0B', fontSize: 10 }} />
            
            <Line type="monotone" dataKey="cpu_utilization" name="CPU %" stroke="#818CF8" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="memory_utilization" name="Memory %" stroke="#38BDF8" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="latency_p99" name="Latency (ms)" stroke="#FBBF24" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="error_rate" name="Error Rate %" stroke="#F87171" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Service metadata footer */}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-400 font-mono">
        <div>Revision: <span className="text-slate-200">{activeSvcData.version}</span> | Replicas: <span className="text-slate-200">{activeSvcData.replicas}</span></div>
        <div>Dependencies: <span className="text-slate-300">{activeSvcData.dependencies?.join(', ') || 'None'}</span></div>
      </div>

    </div>
  );
};
