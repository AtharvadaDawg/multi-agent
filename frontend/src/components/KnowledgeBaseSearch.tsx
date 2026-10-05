import React, { useState, useEffect } from 'react';
import { BookOpen, Search, X, Layers, Lightbulb, Sparkles } from 'lucide-react';
import * as api from '../services/api';
import { KnowledgeItem } from '../types';

interface KnowledgeBaseSearchProps {
  onClose: () => void;
}

export const KnowledgeBaseSearch: React.FC<KnowledgeBaseSearchProps> = ({ onClose }) => {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);

  useEffect(() => {
    api.fetchKnowledge().then(setItems).catch(console.error);
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      api.fetchKnowledge().then(setItems).catch(console.error);
      return;
    }
    setIsSearching(true);
    try {
      const results = await api.searchKnowledge(searchQuery);
      setItems(results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold inline-block">
                INCIDENT MEMORY & POSTMORTEM RAG
              </div>
              <h2 className="text-base font-bold text-slate-100 mt-1">
                Historical Operational Knowledge Base
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

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/60">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search past root causes, runbooks, keywords (e.g. connection pool, cpu saturation, canary rollback)..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg shadow transition"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </form>
        </div>

        {/* Knowledge Records List */}
        <div className="p-6 overflow-y-auto space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500">
              No matching historical incidents found.
            </div>
          ) : (
            items.map(item => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {item.incident_id}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Service: <span className="text-slate-200">{item.service}</span>
                    </span>
                  </div>

                  {item.similarity_score !== undefined && (
                    <span className="text-[11px] font-mono text-emerald-400 font-bold">
                      Match: {Math.round(item.similarity_score * 100)}%
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-200 font-medium">
                  <span className="text-purple-400 font-semibold">Root Cause:</span> {item.root_cause}
                </div>

                <div className="text-xs text-slate-300">
                  <span className="text-emerald-400 font-semibold">Proven Remediation:</span> {item.remediation}
                </div>

                <div className="text-xs text-slate-400 flex items-start gap-1.5 pt-1 border-t border-slate-900">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <span>{item.lessons}</span>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};
