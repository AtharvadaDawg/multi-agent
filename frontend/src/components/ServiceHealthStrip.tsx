import React from 'react';
import { Server } from 'lucide-react';
import { useIncidentContext } from '../context/IncidentContext';
import { ServiceState, TelemetryMetric } from '../types';

interface ServiceHealthStripProps {
  selectedService: string;
  onSelectService: (service: string) => void;
  telemetryOverride?: { services: Record<string, ServiceState>; metrics: Record<string, TelemetryMetric[]> };
}

export const ServiceHealthStrip: React.FC<ServiceHealthStripProps> = ({
  selectedService,
  onSelectService,
  telemetryOverride
}) => {
  const { telemetry: contextTelemetry } = useIncidentContext();
  const telemetry = telemetryOverride || contextTelemetry;
  const services = Object.keys(telemetry.services || {});

  if (services.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-[#E2E8F0] p-3.5 mb-6 font-sans shadow-sm">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-3 border-b border-[#E2E8F0] pb-2">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-purple-600 animate-pulse" />
          <span className="text-[11px] font-bold font-header tracking-wider text-slate-800 uppercase">
            SLEUTHOPS APM • SERVICE CATALOG & TOPOLOGY STATUS
          </span>
        </div>
        <div className="flex items-center space-x-3 text-[10px] font-mono text-slate-500">
          <span className="flex items-center gap-1 font-semibold">
            <span className="w-2 h-2 bg-[#00D084]" /> OK: {services.filter(s => telemetry.services[s]?.status === 'HEALTHY').length}
          </span>
          <span className="flex items-center gap-1 font-semibold">
            <span className="w-2 h-2 bg-[#FF4D4D]" /> ALERT: {services.filter(s => telemetry.services[s]?.status !== 'HEALTHY').length}
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500 font-semibold">Env: prod-mesh</span>
        </div>
      </div>

      {/* Grid of Microservices */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {services.map(svcName => {
          const svc = telemetry.services[svcName];
          const isSelected = selectedService === svcName;
          const isDegraded = svc?.status === 'DEGRADED';
          const metrics = telemetry.metrics[svcName] || [];

          const cpu = metrics.find(m => m.metric_name === 'cpu_utilization')?.value ?? Math.round(svc?.cpu_base || 30);
          const latency = metrics.find(m => m.metric_name === 'latency_p99')?.value ?? Math.round(svc?.latency_base || 120);
          const errRate = metrics.find(m => m.metric_name === 'error_rate')?.value ?? (svc?.error_rate_base || 0.1);

          return (
            <button
              key={svcName}
              onClick={() => onSelectService(svcName)}
              className={`text-left p-3 border transition-all relative ${
                isSelected
                  ? 'bg-purple-50/70 border-2 border-purple-600 shadow-sm'
                  : 'bg-[#F8F9FA] border-[#E2E8F0] hover:border-slate-300 hover:bg-[#F1F3F7]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2 truncate pr-1">
                  <Server className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                  <span className="text-xs font-bold text-slate-800 truncate font-mono">
                    {svcName}
                  </span>
                </div>

                {/* Monitor Status Badge */}
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 flex items-center gap-1 flex-shrink-0 ${
                  isDegraded 
                    ? 'bg-red-100 text-[#D32F2F] border border-red-300 animate-pulse' 
                    : 'bg-emerald-100 text-[#0E7A4C] border border-emerald-300'
                }`}>
                  <span className={`w-1.5 h-1.5 ${isDegraded ? 'bg-[#FF4D4D]' : 'bg-[#00D084]'}`} />
                  {isDegraded ? 'ALERT' : 'OK'}
                </span>
              </div>

              {/* Service Stats Row */}
              <div className="grid grid-cols-3 gap-1 text-[10px] font-mono border-t border-[#E2E8F0] pt-2 text-slate-600">
                <div>
                  <div className="text-slate-400 text-[9px]">P99</div>
                  <div className={`font-semibold ${latency > 400 ? 'text-[#D32F2F]' : 'text-slate-800'}`}>
                    {Math.round(latency)}ms
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 text-[9px]">ERR%</div>
                  <div className={`font-semibold ${errRate > 3 ? 'text-[#D32F2F]' : 'text-slate-800'}`}>
                    {errRate.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 text-[9px]">CPU</div>
                  <div className={`font-semibold ${cpu > 80 ? 'text-[#D32F2F]' : 'text-slate-800'}`}>
                    {Math.round(cpu)}%
                  </div>
                </div>
              </div>

              {/* Active tag / replica */}
              <div className="mt-2 flex items-center justify-between text-[9px] font-mono text-slate-400">
                <span>{svc?.version || 'v1.2.0'}</span>
                <span>{svc?.replicas || 1} pods</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
