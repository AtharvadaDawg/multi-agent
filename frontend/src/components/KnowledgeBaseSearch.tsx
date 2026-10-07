import React, { useState, useEffect } from 'react';
import { BookOpen, Search, X, Lightbulb } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 font-sans">
      <div className="bg-[#161823] border border-[#262A3D] max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-[#262A3D] bg-[#1A1D2B] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-mono px-1.5 py-0.5 bg-purple-500/20 text-purple-300 font-semibold inline-block">
                SLEUTHOPS RAG NOTEBOOKS • INCIDENT MEMORY
              </div>
              <h2 className="text-sm font-bold text-white mt-0.5 font-header">
                Historical SRE Incident Knowledge Base & Vector Store
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

        {/* Search Bar */}
        <div className="p-4 border-b border-[#262A3D] bg-[#141622]">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Query historical postmortems, root causes, or runbook lessons... (e.g. 'cpu spike', 'db pool')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#11131C] border border-[#262A3D] focus:border-purple-500 pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none font-sans"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-4 py-2 bg-[#7C3AED] hover:bg-purple-600 text-white font-semibold text-xs transition disabled:opacity-50"
            >
              {isSearching ? 'Searching...' : 'Vector Search'}
            </button>
          </form>
        </div>

        {/* Results List */}
        <div className="p-4 space-y-3 overflow-y-auto max-h-[calc(75vh-150px)]">
          {items.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs font-mono">
              No historical incident knowledge records found.
            </div>
          ) : (
            items.map(item => (
              <div
                key={item.id}
                className="p-4 bg-[#11131C] border border-[#262A3D] hover:border-[#383E58] transition space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-[#161823] text-purple-300 border border-purple-500/30">
                      {item.service}
                    </span>
                    <span className="text-xs font-semibold text-slate-200 font-header">{item.root_cause}</span>
                  </div>
                  {item.similarity_score !== undefined && (
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      Score: {Math.round(item.similarity_score * 100)}%
                    </span>
                  )}
                </div>

                <div className="text-slate-300 text-[11px] leading-relaxed">
                  <span className="text-slate-500 font-mono">Remediation:</span> {item.remediation}
                </div>

                {item.lessons && (
                  <div className="p-2 bg-[#161823] border border-[#262A3D] text-[11px] text-amber-300/90 flex items-start gap-1.5 font-sans">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <span>{item.lessons}</span>
                  </div>
                )}

                <div className="text-[10px] font-mono text-slate-500 flex items-center justify-between pt-1">
                  <span>Incident ID: {item.incident_id}</span>
                  <span>Tags: {item.keywords}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#141622] border-t border-[#262A3D] flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>Vector Index: SRE Knowledge Embeddings</span>
          <span>{items.length} records available</span>
        </div>

      </div>
    </div>
  );
};
