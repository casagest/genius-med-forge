// Medical procedure event types for AgentMedic
export interface ProcedureEvent {
  caseId: string;
  patientId: string;
  timestamp: string; // ISO 8601 format
}

// Specific event payloads
export type StartSurgeryPayload = ProcedureEvent & {
  eventType: 'start_surgery';
  procedureType: string;
};

export type AnesthesiaPayload = ProcedureEvent & {
  eventType: 'anesthesia_administered';
  type: string;
  dose: string;
  route: string;
};

export type IncisionPayload = ProcedureEvent & {
  eventType: 'incision_made';
  region: string;
  side: string;
};

export type ImplantPlacedPayload = ProcedureEvent & {
  eventType: 'implant_placed';
  implantId: string;
  position: string;
  torque: number;
  boneQuality: string;
};

export type ImplantFailedPayload = ProcedureEvent & {
  eventType: 'implant_failed';
  reason: string;
  position: string;
  attempts: number;
};

export type ScanTakenPayload = ProcedureEvent & {
  eventType: 'scan_taken';
  scanType: 'CBCT' | 'STL' | 'IOS';
  scannerModel: string;
};

export type ProsthesisTryInPayload = ProcedureEvent & {
  eventType: 'prosthesis_tryin';
  fitScore: number;
  adjustmentsNeeded: string;
};

export type EndSurgeryPayload = ProcedureEvent & {
  eventType: 'end_surgery';
  duration: number;
  totalImplants: number;
  notes: string;
};

export type ComplicationPayload = ProcedureEvent & {
  eventType: 'complication_detected';
  description: string;
  severity: 'low' | 'medium' | 'high';
  interventionNeeded: string;
};

export type PostOpInstructionsPayload = ProcedureEvent & {
  eventType: 'postop_instructions_sent';
  channel: 'email' | 'sms' | 'print';
};

export type FollowUpPayload = ProcedureEvent & {
  eventType: 'followup_scheduled';
  date: string;
  purpose: string;
  assignedTeam: string;
};

export type MaterialConfirmedPayload = ProcedureEvent & {
  eventType: 'material_confirmed';
  itemSku: string;
  lotNumber: string;
  expiryDate: string;
};

export type OsteotomyCompletedPayload = ProcedureEvent & {
  eventType: 'osteotomy_completed';
  position: string;
  drillingProtocol: string;
  finalDrillDiameter: number;
};

export type LabAdjustmentRequestPayload = ProcedureEvent & {
  eventType: 'lab_adjustment_request';
  adjustmentDescription: string;
  photosAttached: boolean;
};

export type VitalsMonitoringPayload = ProcedureEvent & {
  eventType: 'vitals_monitoring_update';
  heartRate: number;
  bloodPressure: string;
  spo2: number;
};

// Union type for all medic procedure updates
export type MedicProcedureUpdatePayload =
  | StartSurgeryPayload
  | AnesthesiaPayload
  | IncisionPayload
  | ImplantPlacedPayload
  | ImplantFailedPayload
  | ScanTakenPayload
  | ProsthesisTryInPayload
  | EndSurgeryPayload
  | ComplicationPayload
  | PostOpInstructionsPayload
  | FollowUpPayload
  | MaterialConfirmedPayload
  | OsteotomyCompletedPayload
  | LabAdjustmentRequestPayload
  | VitalsMonitoringPayload;

// Agent room types for WebSocket communication
export type AgentRoom = 'medics_room' | 'lab_room' | 'ceo_room' | 'patient_room';

// Agent event structure
export interface AgentEvent {
  from: AgentRoom;
  to: AgentRoom;
  data: MedicProcedureUpdatePayload;
  priority: 'low' | 'medium' | 'high' | 'critical';
}