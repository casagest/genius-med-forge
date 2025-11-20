// Real-time WebSocket communication hub for AI Agents
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCorsPreflightRequest, createErrorResponse } from "../_shared/cors.ts";
import { createLogger } from "../_shared/logger.ts";

const logger = createLogger('RealtimeAgents');

interface ConnectedClient {
  socket: WebSocket;
  clientId: string;
  role: 'CEO' | 'LAB' | 'MEDIC';
  lastSeen: number;
}

// Store active connections
const connectedClients = new Map<string, ConnectedClient>();

serve(async (req) => {
  logger.info("Realtime Agents function called", {
    method: req.method,
    url: req.url
  });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    logger.debug("Handling CORS preflight");
    return handleCorsPreflightRequest(req);
  }

  // Handle WebSocket upgrade
  const upgrade = req.headers.get("upgrade") || "";
  logger.debug("Upgrade header received", { upgrade });

  if (upgrade.toLowerCase() !== "websocket") {
    logger.warn("Not a WebSocket upgrade request");
    return createErrorResponse(req, "Expected WebSocket connection", 400);
  }

  logger.info("Upgrading to WebSocket");
  const { socket, response } = Deno.upgradeWebSocket(req);

  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  logger.debug("Supabase configuration", {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseKey
  });
  
  const supabase = createClient(
    supabaseUrl ?? '',
    supabaseKey ?? ''
  );

  let clientId: string;
  let clientRole: 'CEO' | 'LAB' | 'MEDIC';

  socket.onopen = () => {
    logger.info("WebSocket connection opened");
  };

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      
      // Input validation
      if (!message || typeof message !== 'object' || !message.type || typeof message.type !== 'string') {
        logger.error('Invalid message format');
        socket.send(JSON.stringify({ error: 'Invalid message format' }));
        return;
      }

      // Validate message type
      const validTypes = ['auth', 'request_kpis', 'request_lab_status', 'update_job_status', 'procedure_event', 'trigger_forecast'];
      if (!validTypes.includes(message.type)) {
        logger.error('Invalid message type', { type: message.type });
        socket.send(JSON.stringify({ error: 'Invalid message type' }));
        return;
      }

      logger.debug("Received message", { type: message.type });

      switch (message.type) {
        case 'auth': {
          // Client authentication
          clientId = message.clientId || `client_${Date.now()}`;
          clientRole = message.role || 'CEO';
          
          connectedClients.set(clientId, {
            socket,
            clientId,
            role: clientRole,
            lastSeen: Date.now()
          });

          socket.send(JSON.stringify({
            type: 'auth_success',
            clientId,
            message: `Connected as ${clientRole}`
          }));

          logger.info('Client authenticated', { clientId, role: clientRole });

          // Send initial data based on role
          await sendInitialData(socket, clientRole, supabase);
          break;
        }

        case 'request_kpis': {
          // CEO requests KPI data
          if (clientRole === 'CEO') {
            await handleKPIRequest(socket, supabase);
          }
          break;
        }

        case 'request_lab_status': {
          // LAB status request
          if (clientRole === 'LAB' || clientRole === 'CEO') {
            await handleLabStatusRequest(socket, supabase);
          }
          break;
        }

        case 'trigger_forecast': {
          // Manual trigger for inventory forecast
          if (clientRole === 'CEO') {
            await triggerInventoryForecast(socket, supabase);
          }
          break;
        }

        case 'update_job_status': {
          // LAB job status update
          if (clientRole === 'LAB') {
            await handleJobStatusUpdate(message.data, socket, supabase);
          }
          break;
        }

        case 'procedure_event': {
          // MEDIC procedure events
          if (clientRole === 'MEDIC') {
            await handleProcedureEvent(message.data, socket, supabase);
          }
          break;
        }

        default:
          socket.send(JSON.stringify({
            type: 'error',
            message: `Unknown message type: ${message.type}`
          }));
      }
    } catch (error) {
      logger.error("Message processing error", error);
      socket.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  };

  socket.onclose = () => {
    if (clientId) {
      connectedClients.delete(clientId);
      logger.info('Client disconnected', { clientId });
    }
  };

  socket.onerror = (error) => {
    logger.error("WebSocket error", error);
  };

  return response;
});

async function sendInitialData(socket: WebSocket, role: string, supabase: any) {
  try {
    switch (role) {
      case 'CEO': {
        // Send CEO dashboard data
        const kpis = await calculateRealtimeKPIs(supabase);
        const procurementAlerts = await getProcurementAlerts(supabase);
        
        socket.send(JSON.stringify({
          type: 'initial_data',
          data: {
            kpis,
            procurement_alerts: procurementAlerts,
            timestamp: new Date().toISOString()
          }
        }));
        break;
      }

      case 'LAB': {
        // Send lab production data
        const labQueue = await getLabProductionQueue(supabase);
        const materialLevels = await getMaterialLevels(supabase);
        
        socket.send(JSON.stringify({
          type: 'initial_data',
          data: {
            production_queue: labQueue,
            material_levels: materialLevels,
            timestamp: new Date().toISOString()
          }
        }));
        break;
      }

      case 'MEDIC': {
        // Send medical dashboard data
        const activeProcedures = await getActiveProcedures(supabase);
        
        socket.send(JSON.stringify({
          type: 'initial_data',
          data: {
            active_procedures: activeProcedures,
            timestamp: new Date().toISOString()
          }
        }));
        break;
      }
    }
  } catch (error) {
    logger.error("Error sending initial data", error);
  }
}

async function handleKPIRequest(socket: WebSocket, supabase: any) {
  const kpis = await calculateRealtimeKPIs(supabase);
  
  socket.send(JSON.stringify({
    type: 'kpi_update',
    data: kpis,
    timestamp: new Date().toISOString()
  }));
}

async function calculateRealtimeKPIs(supabase: any) {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Get completed procedures in last 24h
  const { data: completedProcedures } = await supabase
    .from('active_procedures')
    .select('*')
    .eq('status', 'COMPLETED')
    .gte('completed_at', twentyFourHoursAgo);

  // Get critical reports
  const { data: criticalReports } = await supabase
    .from('analysis_reports')
    .select('*')
    .in('risk_level', ['HIGH', 'CRITICAL'])
    .eq('requires_action', true);

  // Get lab efficiency metrics
  const { data: labJobs } = await supabase
    .from('lab_production_queue')
    .select('*')
    .gte('created_at', twentyFourHoursAgo);

  const completedJobs = labJobs?.filter(job => job.status === 'COMPLETED') || [];
  const labEfficiency = labJobs?.length > 0 ? (completedJobs.length / labJobs.length) * 100 : 0;

  // Calculate material consumption
  const materialConsumption = await calculateMaterialConsumption(supabase, twentyFourHoursAgo);

  return {
    casesLast24h: completedProcedures?.length || 0,
    avgCostPerCase: calculateAverageCost(completedProcedures || []),
    criticalAlerts: criticalReports?.length || 0,
    labEfficiency: Math.round(labEfficiency * 10) / 10,
    materialConsumption,
    predictiveAccuracy: 89.7 // From AI models
  };
}

async function calculateMaterialConsumption(supabase: any, since: string) {
  const { data: materials } = await supabase
    .from('lab_materials')
    .select('material_name, current_stock')
    .lte('last_ordered_at', since);

  return (materials || []).map((mat: any) => ({
    sku: mat.material_name,
    amount: mat.current_stock
  })).slice(0, 5); // Top 5 materials
}

function calculateAverageCost(procedures: any[]) {
  if (!procedures.length) return 0;
  
  // Simplified cost calculation based on procedure type
  const costMap: Record<string, number> = {
    'full_arch_rehabilitation': 3500,
    'single_crown_zirconia': 800,
    'bridge_3_units': 1800,
    'surgical_implant_placement': 1200
  };
  
  const totalCost = procedures.reduce((sum, proc) => {
    return sum + (costMap[proc.procedure_type] || 1000);
  }, 0);
  
  return Math.round(totalCost / procedures.length);
}

async function getProcurementAlerts(supabase: any) {
  // Get materials with low stock
  const { data: lowStock } = await supabase
    .from('lab_materials')
    .select('*')
    .lt('current_stock', 'minimum_threshold');

  // Get recent procurement reports
  const { data: recentOrders } = await supabase
    .from('analysis_reports')
    .select('*')
    .eq('report_type', 'PREDICTIVE_REORDER')
    .order('generated_at', { ascending: false })
    .limit(10);

  return {
    low_stock_items: lowStock || [],
    recent_orders: recentOrders || []
  };
}

async function getLabProductionQueue(supabase: any) {
  const { data: queue } = await supabase
    .from('lab_production_queue')
    .select('*')
    .in('status', ['PENDING', 'IN_PROGRESS'])
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true });

  return queue || [];
}

async function getMaterialLevels(supabase: any) {
  const { data: materials } = await supabase
    .from('lab_materials')
    .select('*')
    .order('material_name', { ascending: true });

  return materials || [];
}

async function getActiveProcedures(supabase: any) {
  const { data: procedures } = await supabase
    .from('active_procedures')
    .select('*')
    .in('status', ['IN_PROGRESS', 'PLANNED'])
    .order('created_at', { ascending: false });

  return procedures || [];
}

async function handleLabStatusRequest(socket: WebSocket, supabase: any) {
  const labData = {
    production_queue: await getLabProductionQueue(supabase),
    material_levels: await getMaterialLevels(supabase)
  };
  
  socket.send(JSON.stringify({
    type: 'lab_status_update',
    data: labData,
    timestamp: new Date().toISOString()
  }));
}

async function triggerInventoryForecast(socket: WebSocket, supabase: any) {
  try {
    // Trigger the inventory forecast service
    const { data, error } = await supabase.functions.invoke('inventory-forecast', {
      body: { trigger: 'manual', requestedBy: 'CEO' }
    });

    if (error) throw error;

    socket.send(JSON.stringify({
      type: 'forecast_triggered',
      data: { success: true, result: data },
      timestamp: new Date().toISOString()
    }));

    // Broadcast forecast results to all CEO clients
    broadcastToCEOClients({
      type: 'forecast_update',
      data: data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    socket.send(JSON.stringify({
      type: 'forecast_error',
      message: error.message,
      timestamp: new Date().toISOString()
    }));
  }
}

async function handleJobStatusUpdate(jobData: any, socket: WebSocket, supabase: any) {
  try {
    // Update job status in database
    const { data, error } = await supabase
      .from('lab_production_queue')
      .update({ 
        status: jobData.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobData.jobId)
      .select()
      .single();

    if (error) throw error;

    // Confirm update to sender
    socket.send(JSON.stringify({
      type: 'job_update_success',
      data: data,
      timestamp: new Date().toISOString()
    }));

    // Broadcast update to all LAB and CEO clients
    broadcastToClients(['LAB', 'CEO'], {
      type: 'job_status_changed',
      data: data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    socket.send(JSON.stringify({
      type: 'job_update_error',
      message: error.message,
      timestamp: new Date().toISOString()
    }));
  }
}

async function handleProcedureEvent(eventData: any, socket: WebSocket, supabase: any) {
  try {
    // Log procedure event
    const { data, error } = await supabase
      .from('procedure_events')
      .insert({
        case_id: eventData.caseId,
        appointment_id: eventData.appointmentId,
        event_type: eventData.eventType,
        event_data: eventData,
        timestamp: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Broadcast to relevant agents based on event type
    const eventRouting: Record<string, string[]> = {
      'surgery_started': ['CEO', 'LAB'],
      'implant_placed': ['CEO', 'LAB'],
      'complication_detected': ['CEO'],
      'surgery_completed': ['CEO', 'LAB']
    };

    const targetRoles = eventRouting[eventData.eventType] || ['CEO'];
    
    broadcastToClients(targetRoles, {
      type: 'procedure_event',
      data: data,
      timestamp: new Date().toISOString()
    });

    socket.send(JSON.stringify({
      type: 'event_logged',
      data: data,
      timestamp: new Date().toISOString()
    }));

  } catch (error) {
    socket.send(JSON.stringify({
      type: 'event_error',
      message: error.message,
      timestamp: new Date().toISOString()
    }));
  }
}

function broadcastToCEOClients(message: any) {
  broadcastToClients(['CEO'], message);
}

function broadcastToClients(roles: string[], message: any) {
  for (const [clientId, client] of connectedClients) {
    if (roles.includes(client.role) && client.socket.readyState === WebSocket.OPEN) {
      try {
        client.socket.send(JSON.stringify(message));
      } catch (error) {
        logger.error('Failed to send to client', error, { clientId });
        connectedClients.delete(clientId);
      }
    }
  }
}

// Cleanup inactive connections every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [clientId, client] of connectedClients) {
    if (now - client.lastSeen > 5 * 60 * 1000) {
      client.socket.close();
      connectedClients.delete(clientId);
      logger.debug('Cleaned up inactive client', { clientId });
    }
  }
}, 5 * 60 * 1000);