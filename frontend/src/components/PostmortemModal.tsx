import React from 'react';
import { FileText, CheckSquare, Lightbulb, Download, X, Clock, ShieldCheck } from 'lucide-react';
import { Postmortem, Incident } from '../types';

interface PostmortemModalProps {
  incident: Incident | null;
  onClose: () => void;
}

export const PostmortemModal: React.FC<PostmortemModalProps> = ({ incident, onClose }) => {
  if (!incident || !incident.postmortem) return null;

  const pm = incident.postmortem;

  const handleExportMarkdown = () => {
    const md = `# ${pm.title}
**Incident ID:** ${pm.incident_id}  
**Date:** ${pm.created_at}  
**MTTD:** ${incident.mttd_seconds || 1.2}s | **MTTR:** ${incident.mttr_seconds || 45}s  

---

## 1. Executive Summary
${pm.summary}

## 2. Root Cause Analysis
${pm.root_cause}

## 3. Impact Assessment
${pm.impact}

## 4. Remediation Executed
${pm.remediation_summary}

## 5. Preventive Action Items
${pm.action_items.map(item => `- [ ] ${item}`).join('\n')}

## 6. Lessons Learned
${pm.lessons_learned.map(lesson => `- ${lesson}`).join('\n')}
`;

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `postmortem-${pm.incident_id}.md`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-400 font-semibold">
                  {pm.id}
                </span>
                <span className="text-xs text-slate-500">
                  Target Service: <span className="text-slate-300 font-mono">{incident.service}</span>
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-100 mt-1">
                {pm.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300 leading-relaxed">
          
          {/* Executive Summary */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="text-slate-400 font-semibold uppercase tracking-wider text-[11px] mb-1">
              Executive Summary
            </div>
            <p className="text-slate-200 text-sm">{pm.summary}</p>
          </div>

          {/* Root Cause & Impact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-purple-400 font-semibold text-[11px] uppercase tracking-wider mb-1">
                Technical Root Cause
              </div>
              <p>{pm.root_cause}</p>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-amber-400 font-semibold text-[11px] uppercase tracking-wider mb-1">
                Blast Radius & Impact
              </div>
              <p>{pm.impact}</p>
            </div>
          </div>

          {/* Remediation Summary */}
          <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="text-emerald-400 font-semibold text-[11px] uppercase tracking-wider mb-1">
              Remediation Actions Executed
            </div>
            <p>{pm.remediation_summary}</p>
          </div>

          {/* Action Items Checklist */}
          <div>
            <div className="text-slate-200 font-semibold text-xs flex items-center gap-1.5 mb-2">
              <CheckSquare className="w-4 h-4 text-indigo-400" />
              Preventive Engineering Action Items
            </div>
            <div className="space-y-1.5">
              {pm.action_items.map((item, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/80">
                  <input type="checkbox" className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-0" />
                  <span className="text-slate-300">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Lessons Learned */}
          <div>
            <div className="text-slate-200 font-semibold text-xs flex items-center gap-1.5 mb-2">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              Operational Lessons Learned
            </div>
            <ul className="space-y-1.5 list-disc pl-4 text-slate-300">
              {pm.lessons_learned.map((lesson, i) => (
                <li key={i}>{lesson}</li>
              ))}
            </ul>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-slate-500 text-[11px]">
            Indexed into Organizational Knowledge Base RAG
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleExportMarkdown}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition"
            >
              <Download className="w-4 h-4" />
              <span>Export Markdown</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
