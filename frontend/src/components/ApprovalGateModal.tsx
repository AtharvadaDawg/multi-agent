import React, { useState } from 'react';
import { UserCheck, Lock, X } from 'lucide-react';
import { RemediationProposal } from '../types';
import { useIncidentContext } from '../context/IncidentContext';

interface ApprovalGateModalProps {
  action: RemediationProposal | null;
  onClose: () => void;
}

export const ApprovalGateModal: React.FC<ApprovalGateModalProps> = ({ action, onClose }) => {
  const { submitApproval } = useIncidentContext();
  const [operatorName, setOperatorName] = useState('Atharva Sharma (SRE Lead)');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!action) return null;

  const handleDecision = async (decision: 'APPROVE' | 'REJECT') => {
    setIsSubmitting(true);
    try {
      await submitApproval(action.action_id, decision, notes);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isHighRisk = action.risk === 'HIGH' || action.risk === 'CRITICAL';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 font-sans">
      <div className="bg-[#161823] border border-[#262A3D] max-w-xl w-full shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className={`p-4 border-b ${isHighRisk ? 'bg-amber-950/40 border-amber-500/40' : 'bg-[#1A1D2B] border-[#262A3D]'} flex items-center justify-between`}>
          <div className="flex items-center space-x-3">
            <div className={`p-2 ${isHighRisk ? 'bg-amber-500/20 text-[#FF9900] border border-amber-500/40' : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'}`}>
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#11131C] border border-[#262A3D] text-slate-300">
                  {action.action_id}
                </span>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 ${
                  action.risk === 'CRITICAL' ? 'bg-red-500/20 text-[#FF4D4D] border border-red-500/40' :
                  action.risk === 'HIGH' ? 'bg-amber-500/20 text-[#FF9900] border border-amber-500/40' :
                  'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                }`}>
                  {action.risk} RISK ACTION GATE
                </span>
              </div>
              <h2 className="text-sm font-bold text-white mt-1 font-header">
                SleuthOps Incident Authorization Gate
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-[#222638] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          
          {/* Action Title & Resource */}
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Proposed Automated Runbook</div>
            <div className="text-sm font-bold text-slate-100 mt-0.5 font-header">{action.title}</div>
            <p className="text-xs text-slate-300 mt-1">{action.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
            <div className="p-2.5 bg-[#11131C] border border-[#262A3D]">
              <span className="text-slate-500 text-[10px]">Target Resource:</span>
              <div className="font-semibold text-purple-300 mt-0.5 truncate">{action.target_resource}</div>
            </div>
            <div className="p-2.5 bg-[#11131C] border border-[#262A3D]">
              <span className="text-slate-500 text-[10px]">Action Type:</span>
              <div className="font-semibold text-slate-200 mt-0.5">{action.action_type}</div>
            </div>
          </div>

          {/* Rationale & Rollback */}
          <div className="space-y-2 text-xs">
            <div className="p-3 bg-[#11131C] border border-[#262A3D]">
              <div className="text-[10px] font-mono font-semibold text-purple-400 uppercase mb-1">AI Agent Rationale</div>
              <p className="text-slate-300 leading-relaxed text-[11px]">{action.rationale}</p>
            </div>

            <div className="p-3 bg-[#11131C] border border-[#262A3D]">
              <div className="text-[10px] font-mono font-semibold text-amber-400 uppercase mb-1">Automated Rollback Safeguard</div>
              <p className="text-slate-300 font-mono text-[11px]">{action.rollback_plan}</p>
            </div>
          </div>

          {/* Operator Sign-off inputs */}
          <div className="space-y-2 border-t border-[#262A3D] pt-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase">Authorizing SRE Commander</label>
                <input
                  type="text"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  className="w-full bg-[#11131C] border border-[#262A3D] px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-purple-500 mt-1"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase">Approval Notes / Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Verified database connection exhaustion"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-[#11131C] border border-[#262A3D] px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-purple-500 mt-1"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Footer Decision Buttons */}
        <div className="p-4 bg-[#141622] border-t border-[#262A3D] flex items-center justify-end space-x-3">
          <button
            onClick={() => handleDecision('REJECT')}
            disabled={isSubmitting}
            className="px-4 py-2 bg-red-950/40 hover:bg-red-900/60 text-[#FF4D4D] border border-red-500/40 text-xs font-bold transition disabled:opacity-50"
          >
            Reject & Abort Runbook
          </button>
          <button
            onClick={() => handleDecision('APPROVE')}
            disabled={isSubmitting}
            className="px-5 py-2 bg-[#7C3AED] hover:bg-purple-600 text-white text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Authorize & Execute Action</span>
          </button>
        </div>

      </div>
    </div>
  );
};
