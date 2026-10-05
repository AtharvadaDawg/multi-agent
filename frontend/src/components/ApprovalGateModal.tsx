import React, { useState } from 'react';
import { ShieldAlert, CheckCircle, XCircle, AlertTriangle, UserCheck, ArrowRight, RotateCcw } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className={`p-5 border-b ${isHighRisk ? 'bg-amber-950/30 border-amber-500/30' : 'bg-slate-800 border-slate-700'}`}>
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl ${isHighRisk ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-indigo-500/20 text-indigo-400'}`}>
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-slate-300">
                  {action.action_id}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                  action.risk === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/40' :
                  action.risk === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                  'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40'
                }`}>
                  {action.risk} RISK ACTION
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-100 mt-1">
                Human Authorization Gate Required
              </h2>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          
          {/* Action Title & Resource */}
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Proposed Action</div>
            <div className="text-sm font-semibold text-slate-100 mt-0.5">{action.title}</div>
            <p className="text-xs text-slate-300 mt-1">{action.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
              <span className="text-slate-500">Target Resource:</span>
              <div className="font-mono font-medium text-slate-200 mt-0.5">{action.target_resource}</div>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
              <span className="text-slate-500">Runbook Type:</span>
              <div className="font-mono font-medium text-slate-200 mt-0.5">{action.action_type}</div>
            </div>
          </div>

          {/* Rationale */}
          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-xs">
            <span className="text-slate-400 font-semibold block mb-0.5">SRE Responder Rationale:</span>
            <span className="text-slate-300">{action.rationale}</span>
          </div>

          {/* Rollback Safeguard */}
          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-xs flex items-start gap-2">
            <RotateCcw className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-slate-400 font-semibold">Automated Rollback Safeguard:</span>
              <p className="text-slate-300 mt-0.5">{action.rollback_plan}</p>
            </div>
          </div>

          {/* Operator Sign-off inputs */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Authorizing Engineer:</label>
              <input
                type="text"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Approval / Escalation Notes (Optional):</label>
              <input
                type="text"
                placeholder="e.g., Reviewed metrics, rollback snapshot verified."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 transition"
          >
            Cancel
          </button>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleDecision('REJECT')}
              disabled={isSubmitting}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 text-rose-300 text-xs font-semibold transition"
            >
              <XCircle className="w-4 h-4" />
              <span>Reject & Escalate</span>
            </button>

            <button
              onClick={() => handleDecision('APPROVE')}
              disabled={isSubmitting}
              className="flex items-center space-x-1.5 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/30 transition"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Authorize & Execute</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
