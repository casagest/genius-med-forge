import { io, Socket } from 'socket.io-client';
import { MedicProcedureUpdatePayload, AgentEvent } from '../types/medical-events';
import { supabase } from '@/integrations/supabase/client';

// Advanced Lab Machine Management
interface LabMachine {
  id: string;
  type: 'milling' | 'printing' | 'scanning';
  status: 'idle' | 'running' | 'maintenance' | 'error';
  currentJobId: string | null;
  efficiency: number;
  utilization: number;
  lastMaintenance: string;
  settings: Record<string, any>;
}

interface InventoryItem {
  sku: string;
  name: string;
  quantity: number;
  reorderThreshold: number;
  unitCost: number;
  supplier: string;
  leadTime: number; // days
}

interface ProductionJob {
  jobId: string;
  caseId: string;
  patientId: string;
  type: 'crown' | 'bridge' | 'guide' | 'temp';
  priority: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'queued_for_qc';
  assignedMachineId: string | null;
  materialRequirements: Record<string, number>;
  estimatedDuration: number; // minutes
  qualityScore?: number;
  deviationMap?: any;
}

interface QualityAnalysis {
  jobId: string;
  scanData: any;
  deviationAnalysis: {
    maxDeviation: number;
    avgDeviation: number;
    criticalAreas: Array<{x: number, y: number, z: number, deviation: number}>;
  };
  qualityScore: number; // 0-100
  recommendations: string[];
}

export class AgentLab {
  private socket: Socket | null = null;
  private isConnected = false;
  private labId: string;
  
  // Lab State Management
  private machines: Map<string, LabMachine> = new Map();
  private inventory: Map<string, InventoryItem> = new Map();
  private productionQueue: ProductionJob[] = [];
  private qualityDatabase: Map<string, QualityAnalysis> = new Map();
  
  // Predictive Optimization
  private schedulingAI: SchedulingAI;
  private qualityAI: QualityControlAI;
  private inventoryAI: InventoryManagementAI;

  constructor(labId: string, serverUrl: string = 'ws://localhost:3001') {
    this.labId = labId;
    this.schedulingAI = new SchedulingAI();
    this.qualityAI = new QualityControlAI();
    this.inventoryAI = new InventoryManagementAI();
    this.initializeLab();
    this.connect(serverUrl);
  }

  private initializeLab(): void {
    // Initialize machines
    this.machines.set('mill_dmg_mori_1', {
      id: 'mill_dmg_mori_1',
      type: 'milling',
      status: 'idle',
      currentJobId: null,
      efficiency: 92,
      utilization: 0,
      lastMaintenance: '2025-01-20T00:00:00Z',
      settings: { spindleSpeed: 12000, feedRate: 1500 }
    });

    this.machines.set('printer_formlabs_3b', {
      id: 'printer_formlabs_3b',
      type: 'printing',
      status: 'idle',
      currentJobId: null,
      efficiency: 88,
      utilization: 0,
      lastMaintenance: '2025-01-18T00:00:00Z',
      settings: { layerHeight: 0.05, exposureTime: 2.5 }
    });

    // Initialize inventory
    this.inventory.set('zirc_block_a2', {
      sku: 'zirc_block_a2',
      name: 'Zirconia Block A2 Shade',
      quantity: 45,
      reorderThreshold: 10,
      unitCost: 120.00,
      supplier: 'CeramTech Solutions',
      leadTime: 3
    });

    this.inventory.set('pmma_disk_a1', {
      sku: 'pmma_disk_a1',
      name: 'PMMA Temporary Disk A1',
      quantity: 18,
      reorderThreshold: 5,
      unitCost: 35.00,
      supplier: 'DentalTech Supplies',
      leadTime: 1
    });
  }

  private connect(serverUrl: string): void {
    console.log(`🏭 AgentLab [${this.labId}] connecting to ${serverUrl}...`);
    
    this.socket = io(serverUrl, {
      transports: ['websocket'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log(`✅ AgentLab [${this.labId}] connected with ID: ${this.socket?.id}`);
      this.isConnected = true;
      this.socket?.emit('join_room', 'lab_room');
      this.startPredictiveOptimization();
    });

    // Listen to events from AgentMedic
    this.socket.on('from_medic:procedure_status', (data: AgentEvent) => {
      this.handleMedicUpdate(data.data);
    });

    this.socket.on('from_medic:urgent_request', (data: AgentEvent) => {
      this.handleUrgentRequest(data.data);
    });

    this.socket.on('disconnect', () => {
      console.log(`❌ AgentLab [${this.labId}] disconnected`);
      this.isConnected = false;
    });
  }

  // 🧠 FEATURE 1: PREDICTIVE RESOURCE OPTIMIZATION
  private async startPredictiveOptimization(): Promise<void> {
    console.log('🔮 Starting predictive optimization...');
    
    // Run optimization every 30 minutes
    setInterval(() => {
      this.optimizeResourceAllocation();
      this.predictiveInventoryManagement();
      this.optimizeProductionNesting();
    }, 30 * 60 * 1000);

    // Initial optimization
    await this.optimizeResourceAllocation();
  }

  private async optimizeResourceAllocation(): Promise<void> {
    try {
      // Fetch upcoming procedures from Supabase
      const { data: upcomingProcedures } = await supabase
        .from('active_procedures')
        .select('*')
        .in('status', ['PLANNED', 'IN_PROGRESS'])
        .order('created_at', { ascending: true });

      if (upcomingProcedures) {
        const optimizedSchedule = this.schedulingAI.optimizeSchedule(
          upcomingProcedures,
          Array.from(this.machines.values()),
          this.productionQueue
        );

        console.log(`🎯 Optimized schedule for ${optimizedSchedule.length} procedures`);
        this.applyOptimizedSchedule(optimizedSchedule);
      }
    } catch (error) {
      console.error('❌ Error in predictive optimization:', error);
    }
  }

  private optimizeProductionNesting(): void {
    const pendingJobs = this.productionQueue.filter(job => job.status === 'pending');
    const nestedGroups = this.schedulingAI.optimizeNesting(pendingJobs);
    
    console.log(`🧩 Optimized ${pendingJobs.length} jobs into ${nestedGroups.length} nested groups`);
    
    // Update job priorities based on nesting optimization
    nestedGroups.forEach((group, index) => {
      group.jobs.forEach(job => {
        job.priority = 100 - index; // Higher priority for earlier groups
      });
    });
  }

  // 🎯 FEATURE 2: AUTONOMOUS QUALITY CONTROL
  private async performQualityControl(jobId: string): Promise<QualityAnalysis> {
    console.log(`🔍 Starting autonomous QC for job ${jobId}...`);
    
    const job = this.productionQueue.find(j => j.jobId === jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    // Simulate 3D scanning of completed work
    const scanData = await this.simulate3DScan(job);
    
    // AI-powered deviation analysis
    const deviationAnalysis = this.qualityAI.analyzeDeviations(scanData, job);
    
    // Calculate quality score
    const qualityScore = this.qualityAI.calculateQualityScore(deviationAnalysis);
    
    // Generate improvement recommendations
    const recommendations = this.qualityAI.generateRecommendations(
      deviationAnalysis, 
      this.machines.get(job.assignedMachineId!)!
    );

    const qualityAnalysis: QualityAnalysis = {
      jobId,
      scanData,
      deviationAnalysis,
      qualityScore,
      recommendations
    };

    // Store in quality database
    this.qualityDatabase.set(jobId, qualityAnalysis);
    
    // Auto-adjust machine parameters based on QC results
    if (qualityScore < 85) {
      await this.autoAdjustMachineParameters(job.assignedMachineId!, qualityAnalysis);
    }

    console.log(`✅ QC complete for ${jobId}: Score ${qualityScore}/100`);
    return qualityAnalysis;
  }

  private async autoAdjustMachineParameters(machineId: string, analysis: QualityAnalysis): Promise<void> {
    const machine = this.machines.get(machineId);
    if (!machine) return;

    const adjustments = this.qualityAI.generateParameterAdjustments(analysis, machine);
    
    // Apply adjustments
    Object.assign(machine.settings, adjustments);
    
    console.log(`🔧 Auto-adjusted parameters for ${machineId}:`, adjustments);
    
    // Log to Supabase for audit trail
    await supabase.from('analysis_reports').insert({
      report_type: 'MACHINE_ADJUSTMENT',
      risk_level: 'MEDIUM',
      confidence_score: 0.85,
      analysis_data: {
        machineId,
        adjustments,
        qualityScore: analysis.qualityScore,
        jobId: analysis.jobId
      },
      requires_action: false
    });
  }

  // 💰 FEATURE 3: INTELLIGENT MATERIAL & COST MANAGEMENT
  private async predictiveInventoryManagement(): Promise<void> {
    console.log('📦 Running predictive inventory management...');

    for (const [sku, item] of this.inventory.entries()) {
      const consumptionRate = await this.inventoryAI.predictConsumptionRate(sku, this.productionQueue);
      const daysUntilStockout = item.quantity / consumptionRate;
      
      if (daysUntilStockout <= item.leadTime + 1) {
        await this.autoReorder(item);
      }
    }
  }

  private async autoReorder(item: InventoryItem): Promise<void> {
    const orderQuantity = this.inventoryAI.calculateOptimalOrderQuantity(item);
    
    console.log(`🛒 Auto-reordering ${orderQuantity} units of ${item.name}`);
    
    // In a real implementation, this would connect to supplier APIs
    const order = {
      sku: item.sku,
      quantity: orderQuantity,
      supplier: item.supplier,
      totalCost: orderQuantity * item.unitCost,
      expectedDelivery: new Date(Date.now() + item.leadTime * 24 * 60 * 60 * 1000)
    };

    // Log order to Supabase
    await supabase.from('analysis_reports').insert({
      report_type: 'AUTOMATIC_REORDER',
      risk_level: 'LOW',
      confidence_score: 0.95,
      analysis_data: {
        ...order,
        expectedDelivery: order.expectedDelivery.toISOString()
      },
      requires_action: true
    });

    // Emit to CEO for approval/oversight
    this.emitToCEO('auto_reorder_placed', order);
  }

  private async consumeMaterial(sku: string, quantity: number): Promise<boolean> {
    const item = this.inventory.get(sku);
    if (!item || item.quantity < quantity) {
      console.warn(`⚠️ Insufficient inventory for ${sku}: need ${quantity}, have ${item?.quantity || 0}`);
      return false;
    }

    item.quantity -= quantity;
    
    // Update Supabase inventory
    await supabase
      .from('lab_materials')
      .update({ current_stock: item.quantity })
      .eq('material_name', item.name);

    console.log(`📉 Consumed ${quantity} units of ${item.name}, remaining: ${item.quantity}`);
    return true;
  }

  // 🩺 MEDIC EVENT HANDLERS
  private async handleMedicUpdate(data: MedicProcedureUpdatePayload): Promise<void> {
    console.log(`🏭 Processing medic update: ${data.eventType} for case ${data.caseId}`);

    switch (data.eventType) {
      case 'start_surgery':
        await this.handleStartSurgery(data);
        break;
      case 'implant_placed':
        await this.handleImplantPlaced(data);
        break;
      case 'scan_taken':
        await this.handleScanTaken(data);
        break;
      case 'prosthesis_tryin':
        await this.handleProsthesisTryIn(data);
        break;
      case 'material_confirmed':
        await this.handleMaterialConfirmed(data);
        break;
      case 'end_surgery':
        await this.handleEndSurgery(data);
        break;
    }
  }

  private async handleStartSurgery(data: MedicProcedureUpdatePayload): Promise<void> {
    console.log(`🚀 Surgery started for case ${data.caseId} - preparing lab resources`);

    // Clear priority queue for this case
    this.clearQueueForCase(data.caseId);
    
    // Reserve machines
    const millingMachine = this.findAvailableMachine('milling');
    const printingMachine = this.findAvailableMachine('printing');

    if (millingMachine && printingMachine) {
      // Create production jobs
      const tempJob: ProductionJob = {
        jobId: `temp_${data.caseId}`,
        caseId: data.caseId,
        patientId: data.patientId!,
        type: 'temp',
        priority: 100,
        status: 'pending',
        assignedMachineId: printingMachine.id,
        materialRequirements: { 'pmma_disk_a1': 1 },
        estimatedDuration: 45
      };

      this.productionQueue.push(tempJob);
      this.startJob(tempJob);
    }
  }

  private async handleImplantPlaced(data: MedicProcedureUpdatePayload): Promise<void> {
    // Update STL with real implant position
    console.log(`🦷 Implant placed for case ${data.caseId} - updating live STL`);
    
    // Trigger ImplantPlanner3D update (would connect to Python AI service)
    const updatedSTL = await this.requestSTLUpdate(data);
    
    // Update any pending jobs with new data
    this.updateJobsWithNewSTL(data.caseId, updatedSTL);
  }

  private async handleScanTaken(data: MedicProcedureUpdatePayload): Promise<void> {
    console.log(`📸 Scan taken for case ${data.caseId} - starting AI reconstruction`);
    
    // Trigger ImplantPlanner3D reconstruction
    const reconstructionJob = {
      caseId: data.caseId,
      scanType: (data as any).scanType,
      priority: 'high'
    };

    // In real implementation, this would call Python AI service
    await this.triggerAIReconstruction(reconstructionJob);
  }

  private async handleProsthesisTryIn(data: MedicProcedureUpdatePayload): Promise<void> {
    const fitScore = (data as any).fitScore;
    console.log(`🔍 Prosthesis try-in for case ${data.caseId} - fit score: ${fitScore}`);

    if (fitScore < 85) {
      // Generate revised version
      const revisionJob: ProductionJob = {
        jobId: `revision_${data.caseId}_${Date.now()}`,
        caseId: data.caseId,
        patientId: data.patientId!,
        type: 'temp',
        priority: 150, // Higher than normal
        status: 'pending',
        assignedMachineId: null,
        materialRequirements: { 'pmma_disk_a1': 1 },
        estimatedDuration: 30 // Faster revision
      };

      this.productionQueue.push(revisionJob);
      
      // Notify medic of ETA
      this.emitToMedic('revision_eta', {
        caseId: data.caseId,
        estimatedCompletion: new Date(Date.now() + 30 * 60 * 1000),
        jobId: revisionJob.jobId
      });
    }
  }

  private async handleMaterialConfirmed(data: MedicProcedureUpdatePayload): Promise<void> {
    const { itemSku, lotNumber } = data as any;
    console.log(`✅ Material confirmed: ${itemSku} (Lot: ${lotNumber})`);

    // Consume from inventory
    await this.consumeMaterial(itemSku, 1);
    
    // Log for traceability
    await supabase.from('procedure_events').insert({
      case_id: data.caseId,
      appointment_id: data.patientId!, // Note: this should be appointment_id in real implementation
      patient_id: data.patientId,
      event_type: 'material_consumed',
      event_data: { itemSku, lotNumber, timestamp: data.timestamp },
      timestamp: data.timestamp
    });
  }

  private async handleEndSurgery(data: MedicProcedureUpdatePayload): Promise<void> {
    console.log(`🏁 Surgery ended for case ${data.caseId} - archiving and auditing`);

    // Complete all jobs for this case
    this.productionQueue
      .filter(job => job.caseId === data.caseId && job.status === 'in_progress')
      .forEach(job => {
        job.status = 'completed';
        this.performQualityControl(job.jobId);
      });

    // Archive STL files and create audit trail for ReplayCritic
    await this.archiveForReplayCritic(data.caseId);
  }

  private async handleUrgentRequest(data: MedicProcedureUpdatePayload): Promise<void> {
    if (data.eventType === 'lab_adjustment_request') {
      console.log(`🚨 URGENT: Lab adjustment requested for case ${data.caseId}`);
      
      // Create high-priority adjustment task
      const urgentJob: ProductionJob = {
        jobId: `urgent_${data.caseId}_${Date.now()}`,
        caseId: data.caseId,
        patientId: data.patientId!,
        type: 'temp',
        priority: 200, // Highest priority
        status: 'pending',
        assignedMachineId: null,
        materialRequirements: { 'pmma_disk_a1': 1 },
        estimatedDuration: 20
      };

      // Insert at front of queue
      this.productionQueue.unshift(urgentJob);
      
      // Immediately assign to available machine
      const machine = this.findAvailableMachine('printing');
      if (machine) {
        this.startJob(urgentJob);
        
        // Send ETA back to medic
        this.emitToMedic('urgent_adjustment_eta', {
          caseId: data.caseId,
          estimatedCompletion: new Date(Date.now() + 20 * 60 * 1000),
          jobId: urgentJob.jobId
        });
      }
    }
  }

  // UTILITY METHODS
  private findAvailableMachine(type: 'milling' | 'printing'): LabMachine | null {
    for (const machine of this.machines.values()) {
      if (machine.type === type && machine.status === 'idle') {
        return machine;
      }
    }
    return null;
  }

  private startJob(job: ProductionJob): void {
    const machine = this.findAvailableMachine(job.type as 'milling' | 'printing');
    if (!machine) return;

    job.status = 'in_progress';
    job.assignedMachineId = machine.id;
    machine.status = 'running';
    machine.currentJobId = job.jobId;

    console.log(`▶️ Started job ${job.jobId} on machine ${machine.id}`);

    // Simulate job completion
    setTimeout(() => {
      this.completeJob(job.jobId);
    }, job.estimatedDuration * 60 * 1000);
  }

  private completeJob(jobId: string): void {
    const job = this.productionQueue.find(j => j.jobId === jobId);
    const machine = job ? this.machines.get(job.assignedMachineId!) : null;

    if (job && machine) {
      job.status = 'queued_for_qc';
      machine.status = 'idle';
      machine.currentJobId = null;

      console.log(`✅ Completed job ${jobId}`);
      
      // Trigger quality control
      this.performQualityControl(jobId);
    }
  }

  // COMMUNICATION METHODS
  private emitToMedic(eventType: string, data: any): void {
    if (this.socket) {
      this.socket.emit('lab:update_medic', {
        from: 'lab_room',
        to: 'medics_room',
        eventType,
        data,
        timestamp: new Date().toISOString()
      });
    }
  }

  private emitToCEO(eventType: string, data: any): void {
    if (this.socket) {
      this.socket.emit('lab:update_ceo', {
        from: 'lab_room',
        to: 'ceo_room',
        eventType,
        data,
        timestamp: new Date().toISOString()
      });
    }
  }

  // PLACEHOLDER METHODS (would be implemented with real AI services)
  private async simulate3DScan(job: ProductionJob): Promise<any> {
    // Simulate 3D scan data
    return {
      pointCloud: `scan_data_${job.jobId}`,
      resolution: 0.01, // 10 microns
      scanTime: new Date().toISOString()
    };
  }

  private async requestSTLUpdate(data: MedicProcedureUpdatePayload): Promise<any> {
    // Would call ImplantPlanner3D service
    return { stlFile: `updated_${data.caseId}.stl` };
  }

  private updateJobsWithNewSTL(caseId: string, stlData: any): void {
    // Update pending jobs with new STL data
    console.log(`🔄 Updated STL for case ${caseId}`);
  }

  private async triggerAIReconstruction(job: any): Promise<void> {
    // Would trigger Python AI service
    console.log(`🧠 AI reconstruction triggered for ${job.caseId}`);
  }

  private clearQueueForCase(caseId: string): void {
    // Clear any existing jobs for this case
    this.productionQueue = this.productionQueue.filter(job => job.caseId !== caseId);
  }

  private async archiveForReplayCritic(caseId: string): Promise<void> {
    // Archive data for post-operative analysis
    console.log(`📚 Archiving case ${caseId} for ReplayCritic`);
  }

  private applyOptimizedSchedule(schedule: any[]): void {
    // Apply the optimized schedule
    console.log(`📅 Applied optimized schedule`);
  }

  // PUBLIC API
  public getLabStatus(): any {
    return {
      machines: Array.from(this.machines.values()),
      inventory: Array.from(this.inventory.values()),
      queueLength: this.productionQueue.length,
      activeMachines: Array.from(this.machines.values()).filter(m => m.status === 'running').length
    };
  }

  public disconnect(): void {
    this.socket?.disconnect();
    this.isConnected = false;
  }
}

// AI HELPER CLASSES
class SchedulingAI {
  optimizeSchedule(procedures: any[], machines: LabMachine[], currentQueue: ProductionJob[]): any[] {
    // AI-powered scheduling optimization
    return procedures.map(proc => ({
      ...proc,
      optimizedStartTime: new Date(Date.now() + Math.random() * 24 * 60 * 60 * 1000)
    }));
  }

  optimizeNesting(jobs: ProductionJob[]): Array<{jobs: ProductionJob[], material: string, efficiency: number}> {
    // Group jobs for optimal material usage
    const groups = [];
    let currentGroup: ProductionJob[] = [];
    
    jobs.forEach(job => {
      if (currentGroup.length < 4) { // Max 4 jobs per nesting group
        currentGroup.push(job);
      } else {
        groups.push({
          jobs: [...currentGroup],
          material: 'pmma_disk_a1',
          efficiency: 0.85
        });
        currentGroup = [job];
      }
    });

    if (currentGroup.length > 0) {
      groups.push({
        jobs: currentGroup,
        material: 'pmma_disk_a1',
        efficiency: 0.85
      });
    }

    return groups;
  }
}

class QualityControlAI {
  analyzeDeviations(scanData: any, job: ProductionJob): any {
    // AI-powered deviation analysis
    return {
      maxDeviation: Math.random() * 0.05, // 0-50 microns
      avgDeviation: Math.random() * 0.02, // 0-20 microns
      criticalAreas: []
    };
  }

  calculateQualityScore(deviation: any): number {
    // Calculate quality score based on deviations
    return Math.max(50, 100 - (deviation.maxDeviation * 1000)); // Convert to percentage
  }

  generateRecommendations(analysis: any, machine: LabMachine): string[] {
    const recommendations = [];
    
    if (analysis.maxDeviation > 0.03) {
      recommendations.push('Reduce feed rate by 10%');
      recommendations.push('Check tool wear');
    }
    
    if (analysis.avgDeviation > 0.015) {
      recommendations.push('Calibrate machine positioning');
    }
    
    return recommendations;
  }

  generateParameterAdjustments(analysis: QualityAnalysis, machine: LabMachine): Record<string, any> {
    const adjustments: Record<string, any> = {};
    
    if (machine.type === 'milling' && analysis.deviationAnalysis.maxDeviation > 0.03) {
      adjustments.feedRate = Math.max(1000, machine.settings.feedRate * 0.9);
    }
    
    if (machine.type === 'printing' && analysis.qualityScore < 80) {
      adjustments.exposureTime = machine.settings.exposureTime * 1.1;
    }
    
    return adjustments;
  }
}

class InventoryManagementAI {
  async predictConsumptionRate(sku: string, queue: ProductionJob[]): Promise<number> {
    // AI-powered consumption prediction
    const jobsRequiringSku = queue.filter(job => 
      job.materialRequirements[sku] && job.materialRequirements[sku] > 0
    );
    
    return Math.max(1, jobsRequiringSku.length / 7); // Jobs per day
  }

  calculateOptimalOrderQuantity(item: InventoryItem): number {
    // Economic Order Quantity (EOQ) calculation
    const demandRate = 10; // Simplified daily demand
    const orderCost = 50;  // Fixed cost per order
    const holdingCost = item.unitCost * 0.25; // 25% holding cost per year

    const eoq = Math.sqrt((2 * demandRate * orderCost) / holdingCost);
    return Math.max(item.reorderThreshold, Math.ceil(eoq));
  }
}

// Singleton instance
export const agentLab = new AgentLab('LAB-001');