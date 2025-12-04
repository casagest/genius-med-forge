import { supabase } from '@/integrations/supabase/client';
import { MedicProcedureUpdatePayload } from '../types/medical-events';
import { procedureEventRepository, analysisReportRepository } from '@/repositories';
import { logger } from '@/utils/logger';

interface ProcedureEventData {
  case_id: string;
  appointment_id: string;
  event_type: string;
  event_data: Record<string, unknown>;
  timestamp: string;
}

class EventLoggerService {
  private isInitialized: boolean = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    logger.info('EventLoggerService: Initializing procedure event logging...');

    // Subscribe to real-time procedure events from Supabase
    this.subscribeToRealTimeEvents();

    this.isInitialized = true;
    logger.info('EventLoggerService: Ready to capture procedure events');
  }

  /**
   * Log a procedure event to the database for ReplayCritic analysis
   */
  public async logProcedureEvent(eventData: MedicProcedureUpdatePayload): Promise<void> {
    try {
      const eventSpecificData = await this.extractEventSpecificData(eventData);
      const sequenceNumber = await this.getNextSequenceNumber(eventData.caseId);

      const result = await procedureEventRepository.logEvent(
        eventData.caseId,
        eventData.caseId, // Using caseId as fallback for appointment_id
        eventData.eventType,
        {
          timestamp: eventData.timestamp,
          patient_id: eventData.patientId,
          event_specific_data: eventSpecificData,
          metadata: {
            source: 'medic_interface',
            logged_at: new Date().toISOString(),
            event_sequence_number: sequenceNumber
          }
        },
        eventData.patientId
      );

      if (!result.success) {
        logger.error('Failed to log procedure event', { error: result.error });
        throw new Error(result.error);
      }

      logger.info('Logged event', { eventType: eventData.eventType, caseId: eventData.caseId });

      // Check if this is an end_surgery event to trigger ReplayCritic
      if (eventData.eventType === 'end_surgery') {
        await this.triggerReplayCriticAnalysis(eventData.caseId);
      }

    } catch (error) {
      logger.error('EventLoggerService error', error);

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
    const result = await procedureEventRepository.countByCaseId(caseId);

    if (!result.success) {
      logger.warn('Failed to get sequence number, defaulting to 0');
      return 0;
    }

    return (result.data || 0) + 1;
  }

  /**
   * Calculate total procedure duration
   */
  private async calculateProcedureDuration(caseId: string): Promise<number | null> {
    const result = await procedureEventRepository.getTimeline(caseId);

    if (!result.success || !result.data || result.data.length < 2) {
      return null;
    }

    const surgeryEvents = result.data.filter(e =>
      e.event_type === 'start_surgery' || e.event_type === 'end_surgery'
    );

    if (surgeryEvents.length < 2) {
      return null;
    }

    const startTime = new Date(surgeryEvents[0].timestamp).getTime();
    const endTime = new Date(surgeryEvents[surgeryEvents.length - 1].timestamp).getTime();

    return Math.round((endTime - startTime) / (1000 * 60)); // Duration in minutes
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
          logger.debug('Real-time event captured', { event: payload.new });
          this.broadcastLiveUpdate(payload.new as ProcedureEventData);
        }
      )
      .subscribe();

    logger.info('Subscribed to real-time procedure events');
  }

  /**
   * Broadcast live updates to all connected dashboards
   */
  private async broadcastLiveUpdate(eventData: ProcedureEventData): Promise<void> {
    // In a real implementation, this would use WebSocket to broadcast to connected clients
    logger.debug('Broadcasting live update', { caseId: eventData.case_id, eventType: eventData.event_type });

    // Here we would emit to different rooms based on the event type
    // io.to('ceo_room').emit('procedure:live_update', eventData);
    // io.to('lab_room').emit('procedure:live_update', eventData);
  }

  /**
   * Trigger ReplayCritic analysis when surgery ends
   */
  private async triggerReplayCriticAnalysis(caseId: string): Promise<void> {
    try {
      logger.info('Triggering ReplayCritic analysis', { caseId });

      // Get all events for this case
      const eventsResult = await procedureEventRepository.findByCaseId(caseId);

      if (!eventsResult.success) {
        throw new Error(eventsResult.error);
      }

      const events = eventsResult.data || [];

      // Create analysis request
      const analysisRequest = {
        case_id: caseId,
        analysis_type: 'REPLAY_CRITIC_FULL',
        request_timestamp: new Date().toISOString(),
        events_count: events.length,
        priority: 'NORMAL'
      };

      // Log the analysis request
      await analysisReportRepository.create({
        report_type: 'REPLAY_CRITIC_REQUESTED',
        risk_level: 'LOW',
        confidence_score: 1.0,
        analysis_data: analysisRequest,
        requires_action: false
      });

      // In production, this would trigger the ReplayCritic AI service
      logger.info('ReplayCritic analysis queued', { caseId, eventsCount: events.length });

      // Simulate calling ReplayCritic service
      await this.callReplayCriticService(caseId, events);

    } catch (error) {
      logger.error('Failed to trigger ReplayCritic analysis', { caseId, error });
    }
  }

  /**
   * Call the ReplayCritic AI service (simulated)
   */
  private async callReplayCriticService(caseId: string, events: unknown[]): Promise<void> {
    try {
      // In production, this would call the actual ReplayCritic AI service
      // For now, we simulate the analysis

      const typedEvents = events as Array<{ event_type: string }>;
      const mockAnalysisResult = {
        case_id: caseId,
        overall_score: 92.5,
        analysis_summary: 'Procedure executed within optimal parameters',
        critical_moments: typedEvents.filter(e => e.event_type === 'implant_placed').length,
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
      await analysisReportRepository.create({
        report_type: 'REPLAY_CRITIC_COMPLETED',
        risk_level: mockAnalysisResult.overall_score > 90 ? 'LOW' :
                   mockAnalysisResult.overall_score > 75 ? 'MEDIUM' : 'HIGH',
        confidence_score: 0.95,
        analysis_data: mockAnalysisResult,
        requires_action: mockAnalysisResult.overall_score < 80
      });

      logger.info('ReplayCritic analysis completed', { caseId, score: mockAnalysisResult.overall_score });

    } catch (error) {
      logger.error('ReplayCritic service call failed', error);
    }
  }

  /**
   * Log system errors for monitoring
   */
  private async logSystemError(eventData: MedicProcedureUpdatePayload, error: unknown): Promise<void> {
    try {
      await analysisReportRepository.create({
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
      logger.error('Failed to log system error', logError);
    }
  }

  /**
   * Get procedure timeline for a specific case
   */
  public async getProcedureTimeline(caseId: string): Promise<ProcedureEventData[]> {
    const result = await procedureEventRepository.findByCaseId(caseId);

    if (!result.success) {
      logger.error('Failed to get procedure timeline', { error: result.error });
      return [];
    }

    return (result.data || []).map(e => ({
      case_id: e.case_id,
      appointment_id: e.appointment_id,
      event_type: e.event_type,
      event_data: e.event_data as Record<string, unknown>,
      timestamp: e.timestamp
    }));
  }

  /**
   * Get procedure statistics
   */
  public async getProcedureStatistics(): Promise<{
    total_procedures: number;
    total_events: number;
    most_common_events: Record<string, number>;
    recent_activity: Array<{ case_id: string; event_type: string; timestamp: string }>;
  } | null> {
    const result = await procedureEventRepository.findAll({
      orderBy: { column: 'timestamp', ascending: false },
      limit: 1000
    });

    if (!result.success) {
      logger.error('Failed to get procedure statistics', { error: result.error });
      return null;
    }

    const data = result.data || [];
    const stats = {
      total_procedures: new Set(data.map(e => e.case_id)).size,
      total_events: data.length,
      most_common_events: this.calculateEventFrequency(data),
      recent_activity: data.slice(0, 10).map(e => ({
        case_id: e.case_id,
        event_type: e.event_type,
        timestamp: e.timestamp
      }))
    };

    return stats;
  }

  /**
   * Calculate event frequency for analytics
   */
  private calculateEventFrequency(events: Array<{ event_type: string }>): Record<string, number> {
    return events.reduce((freq: Record<string, number>, event) => {
      freq[event.event_type] = (freq[event.event_type] || 0) + 1;
      return freq;
    }, {});
  }
}

export const eventLoggerService = new EventLoggerService();