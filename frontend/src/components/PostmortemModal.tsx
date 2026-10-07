import React from 'react';
import { FileText, CheckSquare, Lightbulb, Download, X } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 font-sans">
      <div className="bg-[#161823] border border-[#262A3D] max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-[#262A3D] bg-[#1A1D2B] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-purple-500/20 text-purple-300 font-semibold">
                  SLEUTHOPS NOTEBOOK • POSTMORTEM
                </span>
                <span className="text-[10px] font-mono text-slate-400">ID: {pm.incident_id}</span>
              </div>
              <h2 className="text-sm font-bold text-white mt-0.5 font-header">
                {pm.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-[#222638] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[calc(85vh-130px)] text-xs">
          
          {/* Key Incident Metrics Row */}
          <div className="grid grid-cols-3 gap-2.5 font-mono">
            <div className="p-2.5 bg-[#11131C] border border-[#262A3D]">
              <div className="text-[10px] text-slate-500">MTTD (Detection)</div>
              <div className="text-base font-bold text-[#00D084] mt-0.5">{incident.mttd_seconds || 1.2}s</div>
            </div>
            <div className="p-2.5 bg-[#11131C] border border-[#262A3D]">
              <div className="text-[10px] text-slate-500">MTTR (Resolution)</div>
              <div className="text-base font-bold text-[#00D084] mt-0.5">{incident.mttr_seconds || 45}s</div>
            </div>
            <div className="p-2.5 bg-[#11131C] border border-[#262A3D]">
              <div className="text-[10px] text-slate-500">Service</div>
              <div className="text-base font-bold text-purple-300 mt-0.5 truncate">{incident.service}</div>
            </div>
          </div>

          {/* Section 1: Executive Summary */}
          <div className="p-3.5 bg-[#11131C] border border-[#262A3D] space-y-1">
            <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              1. Executive Summary
            </div>
            <p className="text-slate-300 leading-relaxed font-sans">{pm.summary}</p>
          </div>

          {/* Section 2: Root Cause Analysis */}
          <div className="p-3.5 bg-[#11131C] border border-[#262A3D] space-y-1">
            <div className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-wider">
              2. Root Cause Analysis
            </div>
            <p className="text-slate-300 leading-relaxed font-sans">{pm.root_cause}</p>
          </div>

          {/* Section 3: Remediation Executed */}
          <div className="p-3.5 bg-[#11131C] border border-[#262A3D] space-y-1">
            <div className="text-[10px] font-mono font-bold text-[#00D084] uppercase tracking-wider">
              3. Remediation Executed
            </div>
            <p className="text-slate-300 leading-relaxed font-sans">{pm.remediation_summary}</p>
          </div>

          {/* Section 4: Action Items */}
          <div className="p-3.5 bg-[#11131C] border border-[#262A3D] space-y-2">
            <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              4. Preventive Action Items
            </div>
            <ul className="space-y-1.5 font-mono text-[11px]">
              {pm.action_items.map((item, idx) => (
                <li key={idx} className="flex items-start space-x-2 text-slate-300">
                  <CheckSquare className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Section 5: Lessons Learned */}
          <div className="p-3.5 bg-[#11131C] border border-[#262A3D] space-y-2">
            <div className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5" />
              5. Lessons Learned
            </div>
            <ul className="space-y-1.5 text-slate-300 font-sans">
              {pm.lessons_learned.map((lesson, idx) => (
                <li key={idx} className="flex items-start space-x-2">
                  <span className="text-purple-400">•</span>
                  <span>{lesson}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3.5 bg-[#141622] border-t border-[#262A3D] flex items-center justify-between">
          <div className="text-[10px] font-mono text-slate-500">
            Synthesized by Reporter Agent • Ingested into SleuthOps KB RAG
          </div>
          <button
            onClick={handleExportMarkdown}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#7C3AED] hover:bg-purple-600 text-white font-semibold text-xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Markdown</span>
          </button>
        </div>

      </div>
    </div>
  );
};
