import { io, Socket } from 'socket.io-client';
import { MedicProcedureUpdatePayload, AgentEvent } from '../types/medical-events';

export class AgentMedic {
  private socket: Socket | null = null;
  private isConnected = false;
  private eventQueue: MedicProcedureUpdatePayload[] = [];
  private currentCaseId: string | null = null;
  private medicId: string;

  constructor(medicId: string, serverUrl: string = 'ws://localhost:3001') {
    this.medicId = medicId;
    this.connect(serverUrl);
  }

  private connect(serverUrl: string): void {
    console.log(`🩺 AgentMedic [${this.medicId}] connecting to ${serverUrl}...`);
    
    this.socket = io(serverUrl, {
      transports: ['websocket'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log(`✅ AgentMedic [${this.medicId}] connected with ID: ${this.socket?.id}`);
      this.isConnected = true;
      this.socket?.emit('join_room', 'medics_room');
      this.processEventQueue();
    });

    this.socket.on('disconnect', () => {
      console.log(`❌ AgentMedic [${this.medicId}] disconnected`);
      this.isConnected = false;
    });

    this.socket.on('from_lab:status_update', (data: any) => {
      console.log(`📬 AgentMedic received lab update:`, data);
      this.handleLabUpdate(data);
    });

    this.socket.on('from_ceo:directive', (data: any) => {
      console.log(`📋 AgentMedic received CEO directive:`, data);
      this.handleCEODirective(data);
    });

    this.socket.on('error', (error: any) => {
      console.error(`❌ AgentMedic connection error:`, error);
    });
  }

  // Start a new surgical case
  public startCase(caseId: string, patientId: string, procedureType: string): void {
    this.currentCaseId = caseId;
    const payload: MedicProcedureUpdatePayload = {
      eventType: 'start_surgery',
      caseId,
      patientId,
      procedureType,
      timestamp: new Date().toISOString(),
    };
    this.emitEvent(payload, 'high');
  }

  // Record anesthesia administration
  public recordAnesthesia(type: string, dose: string, route: string): void {
    if (!this.currentCaseId) return;
    
    const payload: MedicProcedureUpdatePayload = {
      eventType: 'anesthesia_administered',
      caseId: this.currentCaseId,
      patientId: this.getPatientId(),
      type,
      dose,
      route,
      timestamp: new Date().toISOString(),
    };
    this.emitEvent(payload, 'medium');
  }

  // Record incision
  public recordIncision(region: string, side: string): void {
    if (!this.currentCaseId) return;
    
    const payload: MedicProcedureUpdatePayload = {
      eventType: 'incision_made',
      caseId: this.currentCaseId,
      patientId: this.getPatientId(),
      region,
      side,
      timestamp: new Date().toISOString(),
    };
    this.emitEvent(payload, 'medium');
  }

  // Record implant placement
  public recordImplantPlaced(implantId: string, position: string, torque: number, boneQuality: string): void {
    if (!this.currentCaseId) return;
    
    const payload: MedicProcedureUpdatePayload = {
      eventType: 'implant_placed',
      caseId: this.currentCaseId,
      patientId: this.getPatientId(),
      implantId,
      position,
      torque,
      boneQuality,
      timestamp: new Date().toISOString(),
    };
    this.emitEvent(payload, 'high');
  }

  // Record failed implant
  public recordImplantFailure(reason: string, position: string, attempts: number): void {
    if (!this.currentCaseId) return;
    
    const payload: MedicProcedureUpdatePayload = {
      eventType: 'implant_failed',
      caseId: this.currentCaseId,
      patientId: this.getPatientId(),
      reason,
      position,
      attempts,
      timestamp: new Date().toISOString(),
    };
    this.emitEvent(payload, 'critical');
  }

  // Record scan taken
  public recordScan(scanType: 'CBCT' | 'STL' | 'IOS', scannerModel: string): void {
    if (!this.currentCaseId) return;
    
    const payload: MedicProcedureUpdatePayload = {
      eventType: 'scan_taken',
      caseId: this.currentCaseId,
      patientId: this.getPatientId(),
      scanType,
      scannerModel,
      timestamp: new Date().toISOString(),
    };
    this.emitEvent(payload, 'medium');
  }

  // Record prosthesis try-in
  public recordProsthesisTryIn(fitScore: number, adjustmentsNeeded: string): void {
    if (!this.currentCaseId) return;
    
    const payload: MedicProcedureUpdatePayload = {
      eventType: 'prosthesis_tryin',
      caseId: this.currentCaseId,
      patientId: this.getPatientId(),
      fitScore,
      adjustmentsNeeded,
      timestamp: new Date().toISOString(),
    };
    this.emitEvent(payload, 'high');
  }

  // Record complication
  public recordComplication(description: string, severity: 'low' | 'medium' | 'high', interventionNeeded: string): void {
    if (!this.currentCaseId) return;
    
    const payload: MedicProcedureUpdatePayload = {
      eventType: 'complication_detected',
      caseId: this.currentCaseId,
      patientId: this.getPatientId(),
      description,
      severity,
      interventionNeeded,
      timestamp: new Date().toISOString(),
    };
    this.emitEvent(payload, 'critical');
  }

  // Record material confirmation
  public confirmMaterial(itemSku: string, lotNumber: string, expiryDate: string): void {
    if (!this.currentCaseId) return;
    
    const payload: MedicProcedureUpdatePayload = {
      eventType: 'material_confirmed',
      caseId: this.currentCaseId,
      patientId: this.getPatientId(),
      itemSku,
      lotNumber,
      expiryDate,
      timestamp: new Date().toISOString(),
    };
    this.emitEvent(payload, 'medium');
  }

  // Record osteotomy completion
  public recordOsteotomy(position: string, drillingProtocol: string, finalDrillDiameter: number): void {
    if (!this.currentCaseId) return;
    
    const payload: MedicProcedureUpdatePayload = {
      eventType: 'osteotomy_completed',
      caseId: this.currentCaseId,
      patientId: this.getPatientId(),
      position,
      drillingProtocol,
      finalDrillDiameter,
      timestamp: new Date().toISOString(),
    };
    this.emitEvent(payload, 'medium');
  }

  // Request lab adjustment
  public requestLabAdjustment(adjustmentDescription: string, photosAttached: boolean = false): void {
    if (!this.currentCaseId) return;
    
    const payload: MedicProcedureUpdatePayload = {
      eventType: 'lab_adjustment_request',
      caseId: this.currentCaseId,
      patientId: this.getPatientId(),
      adjustmentDescription,
      photosAttached,
      timestamp: new Date().toISOString(),
    };
    this.emitEvent(payload, 'high');
  }

  // Record vitals monitoring
  public recordVitals(heartRate: number, bloodPressure: string, spo2: number): void {
    if (!this.currentCaseId) return;
    
    const payload: MedicProcedureUpdatePayload = {
      eventType: 'vitals_monitoring_update',
      caseId: this.currentCaseId,
      patientId: this.getPatientId(),
      heartRate,
      bloodPressure,
      spo2,
      timestamp: new Date().toISOString(),
    };
    this.emitEvent(payload, 'low');
  }

  // End surgery
  public endSurgery(duration: number, totalImplants: number, notes: string): void {
    if (!this.currentCaseId) return;
    
    const payload: MedicProcedureUpdatePayload = {
      eventType: 'end_surgery',
      caseId: this.currentCaseId,
      patientId: this.getPatientId(),
      duration,
      totalImplants,
      notes,
      timestamp: new Date().toISOString(),
    };
    this.emitEvent(payload, 'critical');
    this.currentCaseId = null; // Reset case
  }

  // Private methods
  private emitEvent(payload: MedicProcedureUpdatePayload, priority: 'low' | 'medium' | 'high' | 'critical'): void {
    if (!this.isConnected || !this.socket) {
      console.log(`📦 Queuing event: ${payload.eventType} (offline)`);
      this.eventQueue.push(payload);
      return;
    }

    const agentEvent: AgentEvent = {
      from: 'medics_room',
      to: 'lab_room', // Default routing to lab
      data: payload,
      priority,
    };

    console.log(`🚀 AgentMedic emitting: ${payload.eventType} (${priority})`);
    this.socket.emit('medic:procedure_update', agentEvent);
  }

  private processEventQueue(): void {
    if (this.eventQueue.length === 0) return;
    
    console.log(`📦 Processing ${this.eventQueue.length} queued events...`);
    this.eventQueue.forEach(event => this.emitEvent(event, 'medium'));
    this.eventQueue = [];
  }

  private handleLabUpdate(data: any): void {
    // Handle updates from laboratory
    console.log(`🧪 Lab update for case ${this.currentCaseId}:`, data);
  }

  private handleCEODirective(data: any): void {
    // Handle directives from CEO agent
    console.log(`👔 CEO directive for case ${this.currentCaseId}:`, data);
  }

  private getPatientId(): string {
    // In a real implementation, this would be properly tracked
    return 'current-patient-id';
  }

  // Utility methods
  public getCurrentCaseId(): string | null {
    return this.currentCaseId;
  }

  public isActiveCase(): boolean {
    return this.currentCaseId !== null;
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  public disconnect(): void {
    this.socket?.disconnect();
    this.isConnected = false;
  }
}

// Singleton instance for the application
export const agentMedic = new AgentMedic('MEDIC-001');