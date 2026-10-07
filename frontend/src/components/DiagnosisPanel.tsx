import React from 'react';
import { Sparkles, AlertCircle, Layers, HelpCircle, History } from 'lucide-react';
import { Incident } from '../types';

interface DiagnosisPanelProps {
  incident: Incident | null;
}

export const DiagnosisPanel: React.FC<DiagnosisPanelProps> = ({ incident }) => {
  if (!incident || !incident.diagnosis) {
    return (
      <div className="bg-white border border-[#E2E8F0] p-6 mb-6 text-center py-10 font-sans shadow-sm">
        <div className="w-10 h-10 bg-purple-50 border border-purple-200 flex items-center justify-center mx-auto mb-3">
          <Sparkles className="w-5 h-5 text-purple-600 animate-pulse" />
        </div>
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-header">
          Awaiting Sleuth AI Diagnostic Reasoning...
        </h3>
        <p className="text-xs text-slate-500 mt-1 font-mono">
          Correlating APM traces, system metrics, and stdout logs across service mesh
        </p>
      </div>
    );
  }

  const { diagnosis, evidence } = incident;
  const confidencePercent = Math.round(diagnosis.confidence * 100);
  const historicalEvidence = evidence.filter(e => e.type === 'historical_incident');

  return (
    <div className="bg-white border border-[#E2E8F0] overflow-hidden mb-6 font-sans shadow-sm">
      
      {/* Sleuth AI Investigation Header */}
      <div className="bg-[#F8F9FA] px-4 py-3 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 bg-[#7C3AED] text-white border border-purple-400/40">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider font-header">
                SLEUTH AI ROOT CAUSE ANALYSIS
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-purple-100 text-purple-800 border border-purple-300 font-semibold">
                APM CORRELATION
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
              Automated causal inference model trained on SRE runbooks & historical telemetry
            </p>
          </div>
        </div>

        {/* Confidence Meter Badge */}
        <div className="flex items-center space-x-3 bg-white px-3 py-1.5 border border-[#E2E8F0]">
          <span className="text-[11px] font-mono text-slate-500">Diagnosis Confidence:</span>
          <span className={`text-xs font-mono font-bold ${
            confidencePercent >= 90 ? 'text-[#0E7A4C]' : confidencePercent >= 70 ? 'text-[#C27803]' : 'text-[#D32F2F]'
          }`}>
            {confidencePercent}%
          </span>
          <div className="w-20 h-2 bg-slate-100 border border-slate-200 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${confidencePercent >= 90 ? 'bg-[#00D084]' : 'bg-[#FF9900]'}`}
              style={{ width: `${confidencePercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        
        {/* Primary Diagnosed Root Cause Hero Box */}
        <div className="p-4 bg-purple-50/70 border border-purple-200">
          <div className="text-[10px] font-mono font-bold text-purple-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-purple-600" />
            Diagnosed Root Cause Attribution
          </div>
          <div className="text-sm font-bold text-slate-900 leading-snug font-header">
            {diagnosis.root_cause}
          </div>
          {diagnosis.reasoning && (
            <div className="text-xs text-slate-700 mt-2 font-mono bg-white p-2.5 border border-purple-200 leading-relaxed">
              {diagnosis.reasoning}
            </div>
          )}
        </div>

        {/* 2-Column: Blast Radius & Alternative Hypotheses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          
          {/* Estimated Blast Radius */}
          <div className="p-3.5 bg-[#F8F9FA] border border-[#E2E8F0]">
            <div className="text-[10px] font-mono font-semibold text-slate-700 mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-600" />
              Impacted Service Topology (Blast Radius)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {diagnosis.blast_radius.map(svc => (
                <span key={svc} className="text-[11px] font-mono px-2 py-0.5 bg-purple-100 text-purple-800 border border-purple-300 font-semibold">
                  service:{svc}
                </span>
              ))}
            </div>
          </div>

          {/* Alternative Hypotheses Evaluated */}
          <div className="p-3.5 bg-[#F8F9FA] border border-[#E2E8F0]">
            <div className="text-[10px] font-mono font-semibold text-slate-700 mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
              Alternative Hypotheses Evaluated & Dismissed
            </div>
            <ul className="text-xs text-slate-600 space-y-1.5 font-mono text-[11px]">
              {diagnosis.alternatives.map((alt, i) => (
                <li key={i} className="flex items-start gap-2 text-slate-600">
                  <span className="text-purple-600 font-bold">›</span>
                  <span>{alt}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Correlated Historical Runbooks & Evidence */}
        {historicalEvidence.length > 0 && (
          <div className="p-3 bg-[#F8F9FA] border border-[#E2E8F0]">
            <div className="text-[10px] font-mono font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-cyan-600" />
              Correlated Historical Incidents & Playbooks (RAG Match)
            </div>
            <div className="space-y-1.5">
              {historicalEvidence.map(ev => (
                <div key={ev.id} className="text-xs bg-white p-2.5 border border-[#E2E8F0] flex items-center justify-between shadow-xs">
                  <div>
                    <div className="font-bold text-slate-800 font-header">{ev.reference}</div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">{ev.payload?.summary}</div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-cyan-50 text-cyan-800 border border-cyan-200 font-semibold">
                    Match {Math.round(ev.relevance * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
