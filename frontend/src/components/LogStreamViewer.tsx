import React, { useState } from 'react';
import { Terminal, Filter, Search, Copy, Check } from 'lucide-react';
import { Incident } from '../types';

interface LogStreamViewerProps {
  incident: Incident | null;
}

export const LogStreamViewer: React.FC<LogStreamViewerProps> = ({ incident }) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const logEvidences = incident?.evidence.filter(e => e.type === 'log') || [];

  const filteredLogs = logEvidences.filter(e => {
    const payload = e.payload || {};
    const sev = payload.severity || 'INFO';
    const msg = (payload.message || e.reference || '').toLowerCase();
    
    if (filterSeverity !== 'ALL' && sev !== filterSeverity) return false;
    if (searchQuery && !msg.includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getSeverityStyle = (sev: string) => {
    switch (sev) {
      case 'FATAL':
      case 'CRITICAL':
        return 'text-red-400 bg-red-950/40 border-red-500/30';
      case 'ERROR':
        return 'text-rose-400 bg-rose-950/30 border-rose-500/30';
      case 'WARN':
        return 'text-amber-400 bg-amber-950/30 border-amber-500/30';
      default:
        return 'text-slate-400 bg-slate-900 border-slate-800';
    }
  };

  const handleCopyLogs = () => {
    const text = filteredLogs.map(l => `[${l.payload?.timestamp || ''}] [${l.payload?.severity || 'INFO'}] ${l.payload?.message || l.reference}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 mb-6">
      
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            Correlated Log Stream & Evidence
          </h2>
          <p className="text-xs text-slate-400">Application stdout/stderr collected and parsed by Detector & Analyst</p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Severity filter */}
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-xs rounded-lg px-2.5 py-1 text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Severities</option>
            <option value="ERROR">Errors Only</option>
            <option value="CRITICAL">Critical Only</option>
          </select>

          {/* Search box */}
          <input
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-xs rounded-lg px-2.5 py-1 text-slate-300 focus:outline-none w-32 focus:w-48 transition-all font-mono"
          />

          {/* Copy button */}
          <button
            onClick={handleCopyLogs}
            className="p-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-400 hover:text-slate-200 transition"
            title="Copy logs to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Log Console Window */}
      <div className="bg-[#070A12] border border-slate-800 rounded-lg p-3 font-mono text-xs max-h-56 overflow-y-auto space-y-1.5">
        {filteredLogs.length === 0 ? (
          <div className="text-slate-600 text-center py-6">
            {incident ? 'No high-severity logs recorded for this incident.' : 'No active incident selected.'}
          </div>
        ) : (
          filteredLogs.map((log, idx) => {
            const p = log.payload || {};
            const time = p.timestamp ? new Date(p.timestamp).toLocaleTimeString() : 'NOW';
            const sev = p.severity || 'INFO';
            const msg = p.message || log.reference;

            return (
              <div key={log.id || idx} className="flex items-start space-x-2 text-[11px] leading-relaxed hover:bg-slate-900/50 p-1 rounded">
                <span className="text-slate-500 select-none flex-shrink-0">{time}</span>
                <span className={`px-1.5 py-0.2 rounded border text-[10px] font-bold flex-shrink-0 ${getSeverityStyle(sev)}`}>
                  {sev}
                </span>
                <span className="text-slate-400 flex-shrink-0">[{p.service || incident?.service}]:</span>
                <span className="text-slate-200 break-all">{msg}</span>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
