import { supabase } from '@/integrations/supabase/client';
import { MedicProcedureUpdatePayload } from '../types/medical-events';

interface ProcedureEventData {
  case_id: string;
  appointment_id: string;
  event_type: string;
  event_data: any;
  timestamp: string;
}

class EventLoggerService {
  private isInitialized: boolean = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('🎬 EventLoggerService: Initializing procedure event logging...');
    
    // Subscribe to real-time procedure events from Supabase
    this.subscribeToRealTimeEvents();
    
    this.isInitialized = true;
    console.log('✅ EventLoggerService: Ready to capture procedure events');
  }

  /**
   * Log a procedure event to the database for ReplayCritic analysis
   */
  public async logProcedureEvent(eventData: MedicProcedureUpdatePayload): Promise<void> {
    try {
      const logEntry: ProcedureEventData = {
        case_id: eventData.caseId,
        appointment_id: eventData.caseId, // Using caseId as fallback
        event_type: eventData.eventType,
        event_data: {
          timestamp: eventData.timestamp,
          patient_id: eventData.patientId,
          event_specific_data: await this.extractEventSpecificData(eventData),
          metadata: {
            source: 'medic_interface',
            logged_at: new Date().toISOString(),
            event_sequence_number: await this.getNextSequenceNumber(eventData.caseId)
          }
        },
        timestamp: eventData.timestamp
      };

      // Insert into procedure_events table
      const { error } = await supabase
        .from('procedure_events')
        .insert(logEntry);

      if (error) {
        console.error('❌ Failed to log procedure event:', error);
        throw error;
      }

      console.log(`📝 Logged event: ${eventData.eventType} for case ${eventData.caseId}`);

      // Check if this is an end_surgery event to trigger ReplayCritic
      if (eventData.eventType === 'end_surgery') {
        await this.triggerReplayCriticAnalysis(eventData.caseId);
      }

    } catch (error) {
      console.error('❌ EventLoggerService error:', error);
      
      // Log the error for monitoring
      await this.logSystemError(eventData, error);
    }
  }

  /**
   * Extract event-specific data based on event type
   */
  private async extractEventSpecificData(eventData: MedicProcedureUpdatePayload): Promise<any> {
    const baseData = {
      event_type: eventData.eventType,
      timestamp: eventData.timestamp
    };

    switch (eventData.eventType) {
      case 'start_surgery':
        return {
          ...baseData,
          procedure_type: (eventData as any).procedureType
        };

      case 'implant_placed':
        const implantEvent = eventData as any;
        return {
          ...baseData,
          implant_id: implantEvent.implantId,
          position: implantEvent.position,
          torque: implantEvent.torque,
          bone_quality: implantEvent.boneQuality
        };

      case 'scan_taken':
        const scanEvent = eventData as any;
        return {
          ...baseData,
          scan_type: scanEvent.scanType,
          scanner_model: scanEvent.scannerModel
        };

      case 'prosthesis_tryin':
        const prosthesisEvent = eventData as any;
        return {
          ...baseData,
          fit_score: prosthesisEvent.fitScore,
          adjustments_needed: prosthesisEvent.adjustmentsNeeded
        };

      case 'material_confirmed':
        const materialEvent = eventData as any;
        return {
          ...baseData,
          item_sku: materialEvent.itemSku,
          lot_number: materialEvent.lotNumber,
          expiry_date: materialEvent.expiryDate
        };

      case 'lab_adjustment_request':
        const adjustmentEvent = eventData as any;
        return {
          ...baseData,
          adjustment_description: adjustmentEvent.adjustmentDescription,
          photos_attached: adjustmentEvent.photosAttached
        };

      case 'end_surgery':
        const endEvent = eventData as any;
        return {
          ...baseData,
          duration: endEvent.duration,
          total_implants: endEvent.totalImplants,
          notes: endEvent.notes,
          total_duration: await this.calculateProcedureDuration(eventData.caseId)
        };

      case 'complication_detected':
        const complicationEvent = eventData as any;
        return {
          ...baseData,
          description: complicationEvent.description,
          severity: complicationEvent.severity,
          intervention_needed: complicationEvent.interventionNeeded
        };

      case 'vitals_monitoring_update':
        const vitalsEvent = eventData as any;
        return {
          ...baseData,
          heart_rate: vitalsEvent.heartRate,
          blood_pressure: vitalsEvent.bloodPressure,
          spo2: vitalsEvent.spo2
        };

      default:
        return baseData;
    }
  }

  /**
   * Get the next sequence number for events in this case
   */
  private async getNextSequenceNumber(caseId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('procedure_events')
        .select('*', { count: 'exact', head: true })
        .eq('case_id', caseId);

      if (error) {
        console.warn('Failed to get sequence number, defaulting to 0');
        return 0;
      }

      return (count || 0) + 1;
    } catch (error) {
      console.warn('Error getting sequence number:', error);
      return 0;
    }
  }

  /**
   * Calculate total procedure duration
   */
  private async calculateProcedureDuration(caseId: string): Promise<number | null> {
    try {
      const { data, error } = await supabase
        .from('procedure_events')
        .select('timestamp, event_type')
        .eq('case_id', caseId)
        .in('event_type', ['start_surgery', 'end_surgery'])
        .order('timestamp', { ascending: true });

      if (error || !data || data.length < 2) {
        return null;
      }

      const startTime = new Date(data[0].timestamp).getTime();
      const endTime = new Date(data[data.length - 1].timestamp).getTime();
      
      return Math.round((endTime - startTime) / (1000 * 60)); // Duration in minutes
    } catch (error) {
      console.error('Error calculating procedure duration:', error);
      return null;
    }
  }

  /**
   * Subscribe to real-time events from Supabase
   */
  private subscribeToRealTimeEvents(): void {
    const channel = supabase
      .channel('procedure_events_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'procedure_events'
        },
        (payload) => {
          console.log('📡 Real-time event captured:', payload.new);
          this.broadcastLiveUpdate(payload.new as ProcedureEventData);
        }
      )
      .subscribe();

    console.log('📡 Subscribed to real-time procedure events');
  }

  /**
   * Broadcast live updates to all connected dashboards
   */
  private async broadcastLiveUpdate(eventData: ProcedureEventData): Promise<void> {
    // In a real implementation, this would use WebSocket to broadcast to connected clients
    console.log(`📺 Broadcasting live update for case ${eventData.case_id}: ${eventData.event_type}`);
    
    // Here we would emit to different rooms based on the event type
    // io.to('ceo_room').emit('procedure:live_update', eventData);
    // io.to('lab_room').emit('procedure:live_update', eventData);
  }

  /**
   * Trigger ReplayCritic analysis when surgery ends
   */
  private async triggerReplayCriticAnalysis(caseId: string): Promise<void> {
    try {
      console.log(`🎭 Triggering ReplayCritic analysis for case ${caseId}`);

      // Get all events for this case
      const { data: events, error } = await supabase
        .from('procedure_events')
        .select('*')
        .eq('case_id', caseId)
        .order('timestamp', { ascending: true });

      if (error) {
        throw error;
      }

      // Create analysis request
      const analysisRequest = {
        case_id: caseId,
        analysis_type: 'REPLAY_CRITIC_FULL',
        request_timestamp: new Date().toISOString(),
        events_count: events?.length || 0,
        priority: 'NORMAL'
      };

      // Log the analysis request
      await supabase.from('analysis_reports').insert({
        report_type: 'REPLAY_CRITIC_REQUESTED',
        risk_level: 'LOW',
        confidence_score: 1.0,
        analysis_data: analysisRequest,
        requires_action: false
      });

      // In production, this would trigger the ReplayCritic AI service
      console.log(`✅ ReplayCritic analysis queued for case ${caseId} with ${events?.length || 0} events`);

      // Simulate calling ReplayCritic service
      await this.callReplayCriticService(caseId, events || []);

    } catch (error) {
      console.error(`❌ Failed to trigger ReplayCritic analysis for case ${caseId}:`, error);
    }
  }

  /**
   * Call the ReplayCritic AI service (simulated)
   */
  private async callReplayCriticService(caseId: string, events: any[]): Promise<void> {
    try {
      // In production, this would call the actual ReplayCritic AI service
      // For now, we simulate the analysis
      
      const mockAnalysisResult = {
        case_id: caseId,
        overall_score: 92.5,
        analysis_summary: 'Procedure executed within optimal parameters',
        critical_moments: events.filter(e => e.event_type === 'implant_placed').length,
        recommendations: [
          'Consider optimizing implant placement sequence',
          'Excellent scan quality throughout procedure'
        ],
        timeline_analysis: {
          total_duration_minutes: await this.calculateProcedureDuration(caseId),
          efficiency_score: 94.2,
          pause_periods: 2
        }
      };

      // Store the analysis result
      await supabase.from('analysis_reports').insert({
        report_type: 'REPLAY_CRITIC_COMPLETED',
        risk_level: mockAnalysisResult.overall_score > 90 ? 'LOW' : 
                   mockAnalysisResult.overall_score > 75 ? 'MEDIUM' : 'HIGH',
        confidence_score: 0.95,
        analysis_data: mockAnalysisResult,
        requires_action: mockAnalysisResult.overall_score < 80
      });

      console.log(`🎬 ReplayCritic analysis completed for case ${caseId}: Score ${mockAnalysisResult.overall_score}/100`);

    } catch (error) {
      console.error('❌ ReplayCritic service call failed:', error);
    }
  }

  /**
   * Log system errors for monitoring
   */
  private async logSystemError(eventData: MedicProcedureUpdatePayload, error: any): Promise<void> {
    try {
      await supabase.from('analysis_reports').insert({
        report_type: 'EVENT_LOGGING_ERROR',
        risk_level: 'HIGH',
        confidence_score: 1.0,
        analysis_data: {
          failed_event: {
            case_id: eventData.caseId,
            event_type: eventData.eventType,
            timestamp: eventData.timestamp
          },
          error_message: error instanceof Error ? error.message : 'Unknown error',
          error_timestamp: new Date().toISOString()
        },
        requires_action: true
      });
    } catch (logError) {
      console.error('❌ Failed to log system error:', logError);
    }
  }

  /**
   * Get procedure timeline for a specific case
   */
  public async getProcedureTimeline(caseId: string): Promise<ProcedureEventData[]> {
    try {
      const { data, error } = await supabase
        .from('procedure_events')
        .select('*')
        .eq('case_id', caseId)
        .order('timestamp', { ascending: true });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('❌ Failed to get procedure timeline:', error);
      return [];
    }
  }

  /**
   * Get procedure statistics
   */
  public async getProcedureStatistics(): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('procedure_events')
        .select('case_id, event_type, timestamp')
        .order('timestamp', { ascending: false })
        .limit(1000);

      if (error) {
        throw error;
      }

      const stats = {
        total_procedures: new Set(data?.map(e => e.case_id)).size,
        total_events: data?.length || 0,
        most_common_events: this.calculateEventFrequency(data || []),
        recent_activity: data?.slice(0, 10) || []
      };

      return stats;
    } catch (error) {
      console.error('❌ Failed to get procedure statistics:', error);
      return null;
    }
  }

  /**
   * Calculate event frequency for analytics
   */
  private calculateEventFrequency(events: any[]): Record<string, number> {
    return events.reduce((freq, event) => {
      freq[event.event_type] = (freq[event.event_type] || 0) + 1;
      return freq;
    }, {});
  }
}

export const eventLoggerService = new EventLoggerService();