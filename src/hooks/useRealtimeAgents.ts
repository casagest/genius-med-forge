// Custom hook for WebSocket connection to AI Agents
import { useEffect, useRef, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface RealtimeMessage {
  type: string;
  data?: any;
  message?: string;
  timestamp?: string;
}

interface KPIData {
  casesLast24h: number;
  avgCostPerCase: number;
  criticalAlerts: number;
  labEfficiency: number;
  materialConsumption: Array<{ sku: string; amount: number }>;
  predictiveAccuracy: number;
}

interface ProcurementAlert {
  low_stock_items: any[];
  recent_orders: any[];
}

interface RealtimeState {
  isConnected: boolean;
  isConnecting: boolean;
  kpis: KPIData | null;
  procurementAlerts: ProcurementAlert | null;
  labQueue: any[];
  activeProcedures: any[];
}

type ClientRole = 'CEO' | 'LAB' | 'MEDIC';

export function useRealtimeAgents(role: ClientRole = 'CEO') {
  const [state, setState] = useState<RealtimeState>({
    isConnected: false,
    isConnecting: false,
    kpis: null,
    procurementAlerts: null,
    labQueue: [],
    activeProcedures: []
  });

  const wsRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const clientIdRef = useRef<string>(`${role.toLowerCase()}_${Date.now()}`);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: RealtimeMessage = JSON.parse(event.data);
      console.log('📨 Received WebSocket message:', message);

      switch (message.type) {
        case 'auth_success':
          setState(prev => ({ ...prev, isConnected: true, isConnecting: false }));
          toast({
            title: "Connected",
            description: `Connected to AI Agents as ${role}`,
          });
          break;

        case 'initial_data':
          if (message.data) {
            setState(prev => ({
              ...prev,
              kpis: message.data.kpis || prev.kpis,
              procurementAlerts: message.data.procurement_alerts || prev.procurementAlerts,
              labQueue: message.data.production_queue || prev.labQueue,
              activeProcedures: message.data.active_procedures || prev.activeProcedures
            }));
          }
          break;

        case 'kpi_update':
          setState(prev => ({ ...prev, kpis: message.data }));
          break;

        case 'lab_status_update':
          if (message.data) {
            setState(prev => ({
              ...prev,
              labQueue: message.data.production_queue || prev.labQueue
            }));
          }
          break;

        case 'forecast_triggered':
          toast({
            title: "Forecast Triggered",
            description: "Inventory forecast analysis started",
          });
          break;

        case 'forecast_update':
          setState(prev => ({ 
            ...prev, 
            procurementAlerts: message.data || prev.procurementAlerts 
          }));
          break;

        case 'job_status_changed':
          setState(prev => ({
            ...prev,
            labQueue: prev.labQueue.map(job => 
              job.id === message.data?.id ? message.data : job
            )
          }));
          break;

        case 'procedure_event':
          // Handle real-time procedure events
          if (message.data) {
            toast({
              title: "Procedure Event",
              description: `${message.data.event_type} - ${message.data.case_id}`,
              variant: message.data.event_type.includes('complication') ? 'destructive' : 'default'
            });
          }
          break;

        case 'error':
          console.error('WebSocket error:', message.message);
          toast({
            title: "Connection Error",
            description: message.message || "Unknown error occurred",
            variant: "destructive"
          });
          break;

        default:
          console.log('Unhandled message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }, [role, toast]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true }));
    
    // Use the correct Supabase project URL for WebSocket
    const wsUrl = `wss://sosiozakhzrnapvxrtrb.supabase.co/functions/v1/realtime-agents`;
    
    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('🔌 WebSocket connected to AI Agents');
        
        // Authenticate with the server
        wsRef.current?.send(JSON.stringify({
          type: 'auth',
          clientId: clientIdRef.current,
          role: role
        }));
      };

      wsRef.current.onmessage = handleMessage;

      wsRef.current.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        setState(prev => ({ ...prev, isConnected: false, isConnecting: false }));
        
        // Reconnect after delay if not manually closed
        if (event.code !== 1000) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('🔄 Attempting to reconnect...');
            connect();
          }, 3000);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setState(prev => ({ ...prev, isConnecting: false }));
        
        toast({
          title: "Connection Failed",
          description: "Failed to connect to AI Agents",
          variant: "destructive"
        });
      };

    } catch (error) {
      console.error('❌ Failed to create WebSocket:', error);
      setState(prev => ({ ...prev, isConnecting: false }));
    }
  }, [role, handleMessage, toast]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    
    setState(prev => ({ ...prev, isConnected: false, isConnecting: false }));
  }, []);

  // Message sending functions
  const requestKPIs = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'request_kpis' }));
    }
  }, []);

  const requestLabStatus = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'request_lab_status' }));
    }
  }, []);

  const triggerForecast = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'trigger_forecast' }));
    }
  }, []);

  const updateJobStatus = useCallback((jobId: string, status: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'update_job_status',
        data: { jobId, status }
      }));
    }
  }, []);

  const sendProcedureEvent = useCallback((eventData: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'procedure_event',
        data: eventData
      }));
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Periodic KPI refresh for CEO role
  useEffect(() => {
    if (role === 'CEO' && state.isConnected) {
      const interval = setInterval(() => {
        requestKPIs();
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [role, state.isConnected, requestKPIs]);

  return {
    ...state,
    connect,
    disconnect,
    requestKPIs,
    requestLabStatus,
    triggerForecast,
    updateJobStatus,
    sendProcedureEvent
  };
}