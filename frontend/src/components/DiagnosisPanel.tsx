import React from 'react';
import { Brain, ShieldAlert, Layers, HelpCircle, History, Sparkles, AlertCircle } from 'lucide-react';
import { Incident } from '../types';

interface DiagnosisPanelProps {
  incident: Incident | null;
}

export const DiagnosisPanel: React.FC<DiagnosisPanelProps> = ({ incident }) => {
  if (!incident || !incident.diagnosis) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 mb-6 text-center py-10">
        <Brain className="w-8 h-8 text-slate-600 mx-auto mb-2 animate-pulse" />
        <h3 className="text-sm font-medium text-slate-400">Awaiting Analyst Agent Diagnosis...</h3>
        <p className="text-xs text-slate-500 mt-1">Telemetry correlation and root cause reasoning in progress</p>
      </div>
    );
  }

  const { diagnosis, evidence } = incident;
  const confidencePercent = Math.round(diagnosis.confidence * 100);

  const historicalEvidence = evidence.filter(e => e.type === 'historical_incident');

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 mb-6">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 border border-purple-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
              Analyst Diagnostic Reasoning
            </h2>
            <p className="text-xs text-slate-400">Contextual root-cause attribution & blast radius assessment</p>
          </div>
        </div>

        {/* Confidence Gauge */}
        <div className="flex items-center space-x-2 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
          <span className="text-xs text-slate-400">Diagnosis Confidence:</span>
          <span className={`text-xs font-mono font-bold ${
            confidencePercent >= 90 ? 'text-emerald-400' : confidencePercent >= 70 ? 'text-amber-400' : 'text-rose-400'
          }`}>
            {confidencePercent}%
          </span>
          <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${confidencePercent >= 90 ? 'bg-emerald-400' : 'bg-amber-400'}`}
              style={{ width: `${confidencePercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Root Cause Hero Banner */}
      <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 mb-4">
        <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" />
          Primary Diagnosed Root Cause
        </div>
        <div className="text-base font-medium text-slate-100 leading-snug">
          {diagnosis.root_cause}
        </div>
      </div>

      {/* Grid: Blast Radius & Alternative Hypotheses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        
        {/* Blast Radius */}
        <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800">
          <div className="text-xs text-slate-400 mb-2 flex items-center gap-1.5 font-medium">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            Estimated Blast Radius
          </div>
          <div className="flex flex-wrap gap-2">
            {diagnosis.blast_radius.map(svc => (
              <span key={svc} className="text-xs font-mono px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                {svc}
              </span>
            ))}
          </div>
        </div>

        {/* Alternative Hypotheses */}
        <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800">
          <div className="text-xs text-slate-400 mb-2 flex items-center gap-1.5 font-medium">
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            Alternative Hypotheses Evaluated
          </div>
          <ul className="text-xs text-slate-300 space-y-1">
            {diagnosis.alternatives.map((alt, i) => (
              <li key={i} className="flex items-start gap-1.5 text-slate-400">
                <span className="text-slate-600">•</span>
                <span>{alt}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Historical Knowledge Retrieval Context (RAG Evidence) */}
      {historicalEvidence.length > 0 && (
        <div className="p-3.5 rounded-lg bg-slate-950/60 border border-cyan-500/20 mb-4">
          <div className="text-xs text-cyan-400 mb-2 flex items-center gap-1.5 font-medium">
            <History className="w-3.5 h-3.5" />
            Correlated Historical Incident Memory (Knowledge Base RAG)
          </div>
          <div className="space-y-2">
            {historicalEvidence.map(ev => {
              const hist = ev.payload || {};
              return (
                <div key={ev.id} className="text-xs p-2.5 rounded bg-cyan-950/20 border border-cyan-500/20 text-slate-300">
                  <div className="flex items-center justify-between font-mono text-[11px] text-cyan-300 mb-1">
                    <span>{hist.incident_id || ev.reference}</span>
                    <span>Similarity: {Math.round((ev.relevance || 0.8) * 100)}%</span>
                  </div>
                  <div className="text-slate-200 font-medium">{hist.root_cause || ev.reference}</div>
                  {hist.remediation && (
                    <div className="text-slate-400 text-[11px] mt-1">
                      <span className="text-cyan-400">Historical Fix:</span> {hist.remediation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reasoning Narrative */}
      <div className="p-3.5 rounded-lg bg-slate-950/40 border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans">
        <div className="text-slate-400 font-semibold mb-1">Detailed Correlative Reasoning:</div>
        {diagnosis.reasoning}
      </div>

    </div>
  );
};
