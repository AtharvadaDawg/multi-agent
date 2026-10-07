import React from 'react';
import { Clock, User, Wrench, Shield, FileText, Sparkles } from 'lucide-react';
import { TimelineEvent } from '../types';

interface TimelineFeedProps {
  timeline: TimelineEvent[];
}

export const TimelineFeed: React.FC<TimelineFeedProps> = ({ timeline }) => {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="text-center py-8 text-xs text-slate-500 font-mono">
        No SleuthOps timeline events recorded for this incident.
      </div>
    );
  }

  const getActorMeta = (actor: string) => {
    switch (actor.toLowerCase()) {
      case 'detector':
        return {
          icon: <Shield className="w-3.5 h-3.5 text-purple-700" />,
          color: 'bg-purple-100 border-purple-300'
        };
      case 'analyst':
        return {
          icon: <Sparkles className="w-3.5 h-3.5 text-indigo-700" />,
          color: 'bg-indigo-100 border-indigo-300'
        };
      case 'responder':
        return {
          icon: <Wrench className="w-3.5 h-3.5 text-amber-800" />,
          color: 'bg-amber-100 border-amber-300'
        };
      case 'reporter':
        return {
          icon: <FileText className="w-3.5 h-3.5 text-cyan-800" />,
          color: 'bg-cyan-100 border-cyan-300'
        };
      case 'human operator':
      case 'devops sre lead':
        return {
          icon: <User className="w-3.5 h-3.5 text-[#0E7A4C]" />,
          color: 'bg-emerald-100 border-emerald-300'
        };
      default:
        return {
          icon: <Clock className="w-3.5 h-3.5 text-slate-600" />,
          color: 'bg-slate-100 border-slate-300'
        };
    }
  };

  return (
    <div className="flow-root font-sans">
      <ul className="-mb-6">
        {timeline.map((event, idx) => {
          const isLast = idx === timeline.length - 1;
          const timeFormatted = new Date(event.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
          const meta = getActorMeta(event.actor);

          return (
            <li key={event.id || idx}>
              <div className="relative pb-5">
                {!isLast && (
                  <span
                    className="absolute top-3 left-3.5 -ml-px h-full w-0.5 bg-[#E2E8F0]"
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex space-x-3 items-start">
                  {/* Actor Badge Avatar */}
                  <div className={`flex h-7 w-7 items-center justify-center border ${meta.color} flex-shrink-0 bg-white shadow-xs`}>
                    {meta.icon}
                  </div>

                  <div className="flex-1 min-w-0 bg-[#F8F9FA] border border-[#E2E8F0] p-2.5">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-slate-800 font-mono flex items-center gap-1.5">
                        <span className="text-purple-700">@</span>{event.actor}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500">{timeFormatted}</span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed font-sans">{event.event}</p>
                    
                    {event.state_after && (
                      <div className="mt-2 inline-flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 bg-white border border-[#E2E8F0] text-slate-600">
                        <span className="text-slate-400">status:</span>
                        <span className="text-purple-700 font-semibold">{event.state_after}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
