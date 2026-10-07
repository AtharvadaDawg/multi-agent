import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Incident, ServiceState, TelemetryMetric, Scenario, RemediationProposal } from '../types';
import * as api from '../services/api';

interface IncidentContextType {
  incidents: Incident[];
  selectedIncident: Incident | null;
  setSelectedIncidentId: (id: string | null) => void;
  telemetry: { services: Record<string, ServiceState>; metrics: Record<string, TelemetryMetric[]> };
  scenarios: Scenario[];
  pendingApprovals: any[];
  activeApprovalAction: RemediationProposal | null;
  setActiveApprovalAction: (act: RemediationProposal | null) => void;
  isWsConnected: boolean;
  isLoading: boolean;
  triggerScenario: (id: string, mode?: 'aws' | 'simulator') => Promise<void>;
  submitApproval: (actionId: string, decision: 'APPROVE' | 'REJECT', notes?: string) => Promise<void>;
  resetSandbox: () => Promise<void>;
  stopPipeline: (incidentId?: string) => Promise<void>;
  clearIncidentHistory: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const IncidentContext = createContext<IncidentContextType | undefined>(undefined);

export const IncidentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncidentId, setSelectedIncidentIdState] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState<{ services: Record<string, ServiceState>; metrics: Record<string, TelemetryMetric[]> }>({
    services: {},
    metrics: {}
  });
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [activeApprovalAction, setActiveApprovalAction] = useState<RemediationProposal | null>(null);
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshAll = useCallback(async () => {
    try {
      const [incList, scenList, apprList, telem] = await Promise.all([
        api.fetchIncidents(),
        api.fetchScenarios(),
        api.fetchPendingApprovals(),
        api.fetchLiveTelemetry()
      ]);
      setIncidents(incList);
      setScenarios(scenList);
      setPendingApprovals(apprList);
      setTelemetry(telem);
      
      // Auto-select first active or latest incident if none selected
      if (!selectedIncidentId && incList.length > 0) {
        setSelectedIncidentIdState(incList[0].id);
      }
    } catch (e) {
      console.error('Error refreshing incident state:', e);
    } finally {
      setIsLoading(false);
    }
  }, [selectedIncidentId]);

  // WebSocket Subscription
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;

      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'TELEMETRY_UPDATE') {
            setTelemetry(msg.data);
          } else if (msg.type === 'AGENT_EVENT' || msg.type === 'TIMELINE_EVENT') {
            // Trigger refresh to pick up latest state
            refreshAll();
          }
        } catch (err) {
          console.error('WebSocket parse error:', err);
        }
      };

      ws.onclose = () => {
        setIsWsConnected(false);
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = () => {
        setIsWsConnected(false);
      };
    };

    connectWebSocket();
    refreshAll();

    const interval = setInterval(refreshAll, 5000);

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(interval);
    };
  }, [refreshAll]);

  const triggerScenario = async (id: string, mode?: 'aws' | 'simulator') => {
    setIsLoading(true);
    try {
      const res = await api.triggerScenario(id, mode);
      if (res.incident_id) {
        setSelectedIncidentIdState(res.incident_id);
      }
      await refreshAll();
    } catch (e) {
      console.error('Error triggering scenario:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const submitApproval = async (actionId: string, decision: 'APPROVE' | 'REJECT', notes = '') => {
    try {
      await api.submitApproval(actionId, decision, 'DevOps SRE Lead', notes);
      setActiveApprovalAction(null);
      await refreshAll();
    } catch (e) {
      console.error('Error submitting approval:', e);
    }
  };

  const resetSandbox = async () => {
    try {
      await api.resetSandbox();
      await refreshAll();
    } catch (e) {
      console.error('Error resetting sandbox:', e);
    }
  };

  const stopPipeline = async (incidentId?: string) => {
    try {
      await api.stopIncidentPipeline(incidentId);
      setActiveApprovalAction(null);
      await refreshAll();
    } catch (e) {
      console.error('Error stopping pipeline:', e);
    }
  };

  const clearIncidentHistory = async () => {
    try {
      await api.clearAllIncidents();
      setSelectedIncidentIdState(null);
      setActiveApprovalAction(null);
      await refreshAll();
    } catch (e) {
      console.error('Error clearing incident history:', e);
    }
  };

  const selectedIncident = incidents.find(i => i.id === selectedIncidentId) || (incidents.length > 0 ? incidents[0] : null);

  return (
    <IncidentContext.Provider
      value={{
        incidents,
        selectedIncident,
        setSelectedIncidentId: setSelectedIncidentIdState,
        telemetry,
        scenarios,
        pendingApprovals,
        activeApprovalAction,
        setActiveApprovalAction,
        isWsConnected,
        isLoading,
        triggerScenario,
        submitApproval,
        resetSandbox,
        stopPipeline,
        clearIncidentHistory,
        refreshAll
      }}
    >
      {children}
    </IncidentContext.Provider>
  );
};

export const useIncidentContext = () => {
  const context = useContext(IncidentContext);
  if (!context) throw new Error('useIncidentContext must be used within an IncidentProvider');
  return context;
};
