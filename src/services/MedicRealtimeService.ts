import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

// Base interface for procedure events
interface BaseProcedureEvent {
  appointmentId: string;
  patientId?: string;
  caseId: string;
}

// Event payload type
interface ProcedureEventPayload extends BaseProcedureEvent {
  eventType: string;
  timestamp: string;
  [key: string]: any;
}

// Connection status type
type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

class MedicRealtimeService {
  private static instance: MedicRealtimeService;
  private channel: RealtimeChannel | null = null;
  private offlineEventQueue: ProcedureEventPayload[] = [];
  private eventListeners: Map<string, Function[]> = new Map();
  public connectionStatus: ConnectionStatus = 'disconnected';

  private constructor() {
    // Initialize with automatic connection
    this.initializeRealtimeConnection();
  }

  public static getInstance(): MedicRealtimeService {
    if (!MedicRealtimeService.instance) {
      MedicRealtimeService.instance = new MedicRealtimeService();
    }
    return MedicRealtimeService.instance;
  }

  /**
   * Initialize Supabase Realtime connection
   */
  private initializeRealtimeConnection(): void {
    this.connectionStatus = 'connecting';
    
    // Create a channel for medical procedure events
    this.channel = supabase.channel('medical-procedures', {
      config: {
        broadcast: { self: true }
      }
    });

    // Listen for connection events
    this.channel
      .on('broadcast', { event: 'procedure-event' }, (payload) => {
        this.handleIncomingEvent(payload.payload);
      })
      .on('system', {}, (payload) => {
        if (payload.status === 'SUBSCRIBED') {
          this.connectionStatus = 'connected';
          console.log('✅ Connected to Supabase Realtime');
          this.processOfflineQueue();
          this.emit('connected', {});
        }
      })
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          this.connectionStatus = 'connected';
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.connectionStatus = 'disconnected';
          console.error('Realtime connection error');
          this.emit('disconnected', {});
        }
      });

    // Listen for procedure events and active procedure changes
    this.setupDatabaseListeners();
  }

  /**
   * Setup database table listeners for real-time updates
   */
  private setupDatabaseListeners(): void {
    // Listen for new procedure events
    supabase
      .channel('procedure-events-db')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'procedure_events'
      }, (payload) => {
        this.emit('procedure-event-stored', payload.new);
      })
      .subscribe();

    // Listen for active procedure changes
    supabase
      .channel('active-procedures-db')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'active_procedures'
      }, (payload) => {
        this.emit('active-procedure-updated', payload);
      })
      .subscribe();
  }

  /**
   * Send event through Realtime or queue for offline
   */
  private async emitEvent(payload: ProcedureEventPayload): Promise<boolean> {
    if (this.connectionStatus === 'connected' && this.channel) {
      try {
        // Broadcast event to other clients
        await this.channel.send({
          type: 'broadcast',
          event: 'procedure-event',
          payload: payload
        });

        // Store event in database through edge function
        const { data, error } = await supabase.functions.invoke('medical-procedure-handler', {
          body: {
            event: 'process_event',
            data: payload
          }
        });

        if (error) {
          console.error('Error processing procedure event:', error);
          return false;
        }

        console.log(`📡 Event '${payload.eventType}' sent successfully`);
        this.emit('event-sent', { payload, result: data });
        return true;
      } catch (error) {
        console.error('Error sending event:', error);
        this.offlineEventQueue.push(payload);
        return false;
      }
    } else {
      // Queue for offline processing
      this.offlineEventQueue.push(payload);
      console.log(`📦 OFFLINE: Event '${payload.eventType}' queued`);
      return false;
    }
  }

  /**
   * Process offline event queue when connection is restored
   */
  private async processOfflineQueue(): Promise<void> {
    console.log(`Processing ${this.offlineEventQueue.length} offline events`);
    
    while (this.offlineEventQueue.length > 0) {
      const event = this.offlineEventQueue.shift();
      if (event) {
        await this.emitEvent(event);
        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  /**
   * Handle incoming events from other clients
   */
  private handleIncomingEvent(payload: ProcedureEventPayload): void {
    console.log(`📥 Received event: ${payload.eventType}`, payload);
    this.emit('incoming-event', payload);
  }

  /**
   * Generic event listener system
   */
  public on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  public off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // --- MEDICAL PROCEDURE ACTIONS ---

  /**
   * Start surgery procedure
   */
  public async startSurgery(data: BaseProcedureEvent & {
    procedureType: string;
    patientEta: string;
    estimatedDurationMinutes: number;
  }): Promise<boolean> {
    return await this.emitEvent({
      ...data,
      eventType: 'start_surgery',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Confirm material usage
   */
  public async confirmMaterial(data: BaseProcedureEvent & {
    itemSku: string;
    quantityUsed: number;
    materialName?: string;
  }): Promise<boolean> {
    return await this.emitEvent({
      ...data,
      eventType: 'material_confirmed',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Record implant placement
   */
  public async placeImplant(data: BaseProcedureEvent & {
    implantId: string;
    position: string;
    torque: number;
  }): Promise<boolean> {
    return await this.emitEvent({
      ...data,
      eventType: 'implant_placed',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Report complication
   */
  public async reportComplication(data: BaseProcedureEvent & {
    description: string;
    severity: 'low' | 'medium' | 'high';
  }): Promise<boolean> {
    return await this.emitEvent({
      ...data,
      eventType: 'complication_detected',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * End surgery procedure
   */
  public async endSurgery(data: BaseProcedureEvent & {
    notes: string;
  }): Promise<boolean> {
    return await this.emitEvent({
      ...data,
      eventType: 'end_surgery',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get active procedures
   */
  public async getActiveProcedures(): Promise<any[]> {
    try {
      const { data, error } = await supabase.functions.invoke('medical-procedure-handler', {
        body: { event: 'get_active_procedures' }
      });

      if (error) {
        console.error('Error fetching active procedures:', error);
        return [];
      }

      return data?.procedures || [];
    } catch (error) {
      console.error('Error fetching active procedures:', error);
      return [];
    }
  }

  /**
   * Get procedure events for specific appointment
   */
  public async getProcedureEvents(appointmentId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase.functions.invoke('medical-procedure-handler', {
        body: {
          event: 'get_procedure_events',
          data: { appointmentId }
        }
      });

      if (error) {
        console.error('Error fetching procedure events:', error);
        return [];
      }

      return data?.events || [];
    } catch (error) {
      console.error('Error fetching procedure events:', error);
      return [];
    }
  }

  /**
   * Disconnect from Realtime
   */
  public disconnect(): void {
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }
    this.connectionStatus = 'disconnected';
    console.log('🔌 Disconnected from Supabase Realtime');
  }

  /**
   * Reconnect to Realtime
   */
  public reconnect(): void {
    this.disconnect();
    this.initializeRealtimeConnection();
  }

  /**
   * Get connection status
   */
  public getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Get offline queue length
   */
  public getOfflineQueueLength(): number {
    return this.offlineEventQueue.length;
  }
}

// Export singleton instance
export const medicRealtimeService = MedicRealtimeService.getInstance();

// Export types for use in components
export type {
  BaseProcedureEvent,
  ProcedureEventPayload,
  ConnectionStatus
};