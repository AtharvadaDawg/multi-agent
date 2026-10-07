import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Clock, 
  ChevronDown, 
  ShieldAlert, 
  Check, 
  Globe,
  FlaskConical,
  Flame
} from 'lucide-react';
import { useIncidentContext } from '../context/IncidentContext';
import { fetchAWSStatus } from '../services/api';

interface SleuthOpsHeaderProps {
  onOpenApproval?: () => void;
  onOpenSandbox?: () => void;
  isSandboxActive?: boolean;
  selectedTimeframe?: string;
  setSelectedTimeframe?: (tf: string) => void;
}

export const SleuthOpsHeader: React.FC<SleuthOpsHeaderProps> = ({
  onOpenApproval,
  onOpenSandbox,
  isSandboxActive = false,
  selectedTimeframe = 'Live (30s)',
  setSelectedTimeframe
}) => {
  const { 
    isWsConnected, 
    pendingApprovals, 
    setActiveApprovalAction,
    triggerScenario
  } = useIncidentContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [showTimeframeMenu, setShowTimeframeMenu] = useState(false);
  const [region, setRegion] = useState<string>('us-west-2');
  const [isSimulatingEC2, setIsSimulatingEC2] = useState<boolean>(false);

  const handleSimulateEC2 = async () => {
    setIsSimulatingEC2(true);
    try {
      await triggerScenario('aws_ec2_cpu_saturation', 'aws');
    } catch (e) {
      console.error('Error simulating EC2 saturation:', e);
    } finally {
      setIsSimulatingEC2(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetchAWSStatus()
      .then((data) => {
        if (isMounted && data?.region) {
          setRegion(data.region);
        }
      })
      .catch((err) => {
        console.debug('Using fallback region us-west-2:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const timeframes = ['Live (30s)', 'Past 15m', 'Past 1h', 'Past 4h', 'Past 1d'];

  return (
    <header className="h-14 bg-[#0B0C10] border-b border-[#1C1F2B] px-4 flex items-center justify-between text-xs text-slate-300 sticky top-0 z-50 select-none font-sans">
      
      {/* 1. Left: SleuthOps Logo, Region Indicator, EC2 Simulation, and Sandbox Toggle Button */}
      <div className="flex items-center space-x-3">
        {/* SleuthOps Brand Emblem & Typography */}
        <div className="flex items-center space-x-2.5 mr-2">
          {/* SleuthOps Investigation Emblem */}
          <div className="w-8 h-8 bg-[#7C3AED] flex items-center justify-center border border-purple-400/40 text-white font-extrabold text-sm">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L3 7v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7l-9-5z" />
              <circle cx="11" cy="11" r="3" />
              <path d="m14 14 3 3" />
            </svg>
          </div>
          <div>
            <div className="flex items-center space-x-1.5 leading-none">
              <span className="font-extrabold text-sm tracking-tight text-white uppercase font-header">
                SLEUTHOPS
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold">
                AI SRE
              </span>
            </div>
            <div className="text-[9px] text-slate-400 font-mono tracking-wider mt-0.5">
              AUTONOMOUS CLOUD APM & INCIDENT RESPONSE
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="h-6 w-px bg-[#1C1F2B]" />

        {/* Dynamic Current AWS Region Pill */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-[#141622] border border-[#1C1F2B] text-[11px] font-mono">
          <Globe className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-slate-500">region:</span>
          <span className="text-purple-300 font-semibold">{region}</span>
        </div>

        {/* Live EC2 CPU Saturation Simulate Option (Incident Command) */}
        {!isSandboxActive && (
          <button
            onClick={handleSimulateEC2}
            disabled={isSimulatingEC2}
            className="flex items-center space-x-1.5 px-3 py-1 bg-[#7C3AED] hover:bg-purple-600 text-white text-xs font-bold transition font-header disabled:opacity-50 shadow-sm"
            title="Simulate EC2 CPU Saturation & Thread Pool contention on live AWS workload"
          >
            <Flame className="w-3.5 h-3.5 text-orange-300" />
            <span>Simulate EC2 CPU Saturation</span>
            {isSimulatingEC2 && <span className="w-1.5 h-1.5 bg-yellow-300 animate-ping ml-1" />}
          </button>
        )}

        {/* Synthetic Sandbox Page Button */}
        {onOpenSandbox && (
          <button
            onClick={onOpenSandbox}
            className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-mono border transition ${
              isSandboxActive 
                ? 'bg-purple-600 text-white border-purple-400 font-bold' 
                : 'bg-[#141622] hover:bg-[#1C1F2B] text-purple-300 border-purple-500/40 hover:border-purple-400'
            }`}
            title="Open the Synthetic Cloud Sandbox with simulated microservices"
          >
            <FlaskConical className="w-3.5 h-3.5 text-purple-300" />
            <span>{isSandboxActive ? 'Offline Sandbox Mode' : 'Launch Synthetic Sandbox'}</span>
          </button>
        )}
      </div>

      {/* 2. Center: SleuthOps Global Omnisearch Bar */}
      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search metrics, services, monitors, logs... (⌘K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#11131C] border border-[#1C1F2B] focus:border-purple-500 focus:ring-1 focus:ring-purple-500/40 pl-9 pr-12 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none transition font-sans"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono px-1.5 py-0.5 bg-[#141622] border border-[#1C1F2B] text-slate-400">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* 3. Right: Pending Approvals, Timeframe, Live Sync, User Profile */}
      <div className="flex items-center space-x-3">
        
        {/* Human Authorization Required Alert Banner/Pill */}
        {pendingApprovals.length > 0 && (
          <button
            onClick={() => {
              if (pendingApprovals.length > 0) {
                setActiveApprovalAction(pendingApprovals[0]);
                onOpenApproval && onOpenApproval();
              }
            }}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 transition animate-pulse font-mono text-[11px]"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>GATE: {pendingApprovals.length} ACTION PENDING</span>
          </button>
        )}

        {/* Timeframe Selector */}
        <div className="relative">
          <button
            onClick={() => setShowTimeframeMenu(!showTimeframeMenu)}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-[#141622] hover:bg-[#1C1F2B] border border-[#1C1F2B] text-slate-300 font-mono text-[11px] transition"
          >
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{selectedTimeframe}</span>
            <ChevronDown className="w-3 h-3 text-slate-500" />
          </button>

          {showTimeframeMenu && (
            <div className="absolute right-0 top-full mt-1 w-36 bg-[#11131C] border border-[#1C1F2B] shadow-2xl py-1 z-50">
              {timeframes.map(tf => (
                <button
                  key={tf}
                  onClick={() => {
                    setSelectedTimeframe && setSelectedTimeframe(tf);
                    setShowTimeframeMenu(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs font-mono flex items-center justify-between hover:bg-[#1C1F2B] ${
                    selectedTimeframe === tf ? 'text-purple-300 font-bold bg-purple-500/10' : 'text-slate-300'
                  }`}
                >
                  <span>{tf}</span>
                  {selectedTimeframe === tf && <Check className="w-3.5 h-3.5 text-purple-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Live WebSocket Sync Pill */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-[#0B0C10] border border-[#1C1F2B]">
          {isWsConnected ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-mono font-semibold text-emerald-400">LIVE</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 bg-rose-500"></span>
              <span className="text-[10px] font-mono font-semibold text-rose-400">DISCONNECTED</span>
            </>
          )}
        </div>

        {/* User / Org Avatar */}
        <div className="flex items-center space-x-2 pl-2 border-l border-[#1C1F2B]">
          <div className="w-7 h-7 bg-[#7C3AED] flex items-center justify-center text-white font-bold text-xs border border-purple-400/40 font-header">
            SO
          </div>
          <div className="hidden xl:block text-left leading-tight">
            <div className="text-[11px] font-semibold text-slate-200 font-header">SleuthOps Platform</div>
            <div className="text-[9px] text-slate-400 font-mono">SRE Lead</div>
          </div>
        </div>

      </div>

    </header>
  );
};
