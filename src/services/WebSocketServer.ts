// WebSocket server for Agent communication
// This would typically run as a separate Node.js server
// For now, we'll create the interface for browser-based WebSocket communication

import { MedicProcedureUpdatePayload, AgentEvent, AgentRoom } from '../types/medical-events';

export interface WebSocketServerConfig {
  port: number;
  corsOrigins: string[];
}

export class WebSocketServerManager {
  private static instance: WebSocketServerManager;
  private eventHandlers: Map<string, (event: AgentEvent) => void> = new Map();
  private connectedAgents: Map<string, AgentRoom> = new Map();

  private constructor() {}

  public static getInstance(): WebSocketServerManager {
    if (!WebSocketServerManager.instance) {
      WebSocketServerManager.instance = new WebSocketServerManager();
    }
    return WebSocketServerManager.instance;
  }

  // Register event handlers for different agent types
  public registerAgentHandler(agentType: AgentRoom, handler: (event: AgentEvent) => void): void {
    this.eventHandlers.set(agentType, handler);
    console.log(`📡 Registered handler for ${agentType}`);
  }

  // Simulate agent connection (in real implementation, this would be handled by Socket.IO)
  public connectAgent(agentId: string, agentType: AgentRoom): void {
    this.connectedAgents.set(agentId, agentType);
    console.log(`🔌 Agent ${agentId} connected to ${agentType}`);
  }

  // Route events between agents
  public routeEvent(event: AgentEvent): void {
    const handler = this.eventHandlers.get(event.to);
    if (handler) {
      console.log(`📨 Routing ${event.data.eventType} from ${event.from} to ${event.to}`);
      handler(event);
    } else {
      console.warn(`⚠️ No handler found for ${event.to}`);
    }
  }

  // Broadcast event to all agents in a room
  public broadcastToRoom(room: AgentRoom, event: AgentEvent): void {
    console.log(`📢 Broadcasting ${event.data.eventType} to ${room}`);
    const handler = this.eventHandlers.get(room);
    if (handler) {
      handler(event);
    }
  }

  // Get connected agents
  public getConnectedAgents(): Map<string, AgentRoom> {
    return new Map(this.connectedAgents);
  }

  // Disconnect agent
  public disconnectAgent(agentId: string): void {
    const agentType = this.connectedAgents.get(agentId);
    if (agentType) {
      this.connectedAgents.delete(agentId);
      console.log(`🔌 Agent ${agentId} (${agentType}) disconnected`);
    }
  }
}

// Event routing configuration
export const routingRules: Record<string, AgentRoom[]> = {
  'start_surgery': ['lab_room', 'ceo_room'],
  'implant_placed': ['lab_room', 'ceo_room'],
  'implant_failed': ['ceo_room'],
  'material_confirmed': ['lab_room'],
  'lab_adjustment_request': ['lab_room'],
  'complication_detected': ['ceo_room'],
  'end_surgery': ['lab_room', 'ceo_room', 'patient_room'],
  'prosthesis_tryin': ['lab_room'],
  'scan_taken': ['lab_room'],
  'vitals_monitoring_update': ['ceo_room'],
  'osteotomy_completed': ['lab_room'],
  'anesthesia_administered': ['ceo_room'],
  'incision_made': ['ceo_room'],
  'postop_instructions_sent': ['patient_room'],
  'followup_scheduled': ['patient_room', 'ceo_room'],
};

export const webSocketManager = WebSocketServerManager.getInstance();