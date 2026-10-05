import React from 'react';
import { Clock, CheckCircle2, User, Bot, Wrench, Shield, FileText } from 'lucide-react';
import { TimelineEvent } from '../types';

interface TimelineFeedProps {
  timeline: TimelineEvent[];
}

export const TimelineFeed: React.FC<TimelineFeedProps> = ({ timeline }) => {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="text-center py-8 text-xs text-slate-500">
        No timeline events recorded yet.
      </div>
    );
  }

  const getActorIcon = (actor: string) => {
    switch (actor.toLowerCase()) {
      case 'detector':
        return <Shield className="w-3.5 h-3.5 text-indigo-400" />;
      case 'analyst':
        return <Bot className="w-3.5 h-3.5 text-purple-400" />;
      case 'responder':
        return <Wrench className="w-3.5 h-3.5 text-amber-400" />;
      case 'reporter':
        return <FileText className="w-3.5 h-3.5 text-cyan-400" />;
      case 'human operator':
        return <User className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {timeline.map((event, idx) => {
          const isLast = idx === timeline.length - 1;
          const timeFormatted = new Date(event.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });

          return (
            <li key={event.id || idx}>
              <div className="relative pb-6">
                {!isLast && (
                  <span
                    className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-800"
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex space-x-3 items-start">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 border border-slate-700 ring-4 ring-[#0B0F19]">
                    {getActorIcon(event.actor)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">{event.actor}</span>
                      <span className="font-mono text-[11px] text-slate-500">{timeFormatted}</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{event.event}</p>
                    
                    {event.state_after && (
                      <div className="mt-1.5 inline-flex items-center space-x-1.5 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-slate-400">
                        <span>State:</span>
                        <span className="text-indigo-400 font-semibold">{event.state_after}</span>
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
