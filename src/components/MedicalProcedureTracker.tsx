import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Activity, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Play, 
  Square, 
  Package, 
  Wrench,
  FileText,
  Wifi,
  WifiOff
} from 'lucide-react';
import { medicRealtimeService } from '@/services/MedicRealtimeService';
import type { BaseProcedureEvent, ConnectionStatus } from '@/services/MedicRealtimeService';
import { toast } from 'sonner';

interface ActiveProcedure {
  id: string;
  appointment_id: string;
  patient_id: string;
  case_id: string;
  procedure_type: string;
  status: string;
  started_at?: string;
  estimated_duration_minutes?: number;
  materials_used?: any;
  complications?: any[];
}

interface ProcedureEvent {
  id: string;
  event_type: string;
  timestamp: string;
  event_data: any;
}

export function MedicalProcedureTracker() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [activeProcedures, setActiveProcedures] = useState<ActiveProcedure[]>([]);
  const [procedureEvents, setProcedureEvents] = useState<ProcedureEvent[]>([]);
  const [selectedProcedure, setSelectedProcedure] = useState<ActiveProcedure | null>(null);
  const [isStartingProcedure, setIsStartingProcedure] = useState(false);

  // Form states for new procedure
  const [newProcedure, setNewProcedure] = useState({
    appointmentId: '',
    patientId: '',
    caseId: '',
    procedureType: '',
    patientEta: '',
    estimatedDurationMinutes: 60
  });

  // Form states for actions
  const [materialForm, setMaterialForm] = useState({
    itemSku: '',
    quantityUsed: 1,
    materialName: ''
  });

  const [implantForm, setImplantForm] = useState({
    implantId: '',
    position: '',
    torque: 35
  });

  const [complicationForm, setComplicationForm] = useState({
    description: '',
    severity: 'low' as 'low' | 'medium' | 'high'
  });

  const [endProcedureNotes, setEndProcedureNotes] = useState('');

  useEffect(() => {
    // Set up connection status monitoring
    setConnectionStatus(medicRealtimeService.getConnectionStatus());
    
    // Set up event listeners
    const handleConnectionChange = () => {
      setConnectionStatus(medicRealtimeService.getConnectionStatus());
    };

    const handleProcedureUpdate = (data: any) => {
      console.log('Procedure update received:', data);
      loadActiveProcedures();
      if (selectedProcedure) {
        loadProcedureEvents(selectedProcedure.appointment_id);
      }
    };

    const handleIncomingEvent = (payload: any) => {
      console.log('Real-time event received:', payload);
      toast.success(`Procedure event: ${payload.eventType}`);
      
      // Refresh data
      loadActiveProcedures();
      if (selectedProcedure) {
        loadProcedureEvents(selectedProcedure.appointment_id);
      }
    };

    medicRealtimeService.on('connected', handleConnectionChange);
    medicRealtimeService.on('disconnected', handleConnectionChange);
    medicRealtimeService.on('active-procedure-updated', handleProcedureUpdate);
    medicRealtimeService.on('procedure-event-stored', handleProcedureUpdate);
    medicRealtimeService.on('incoming-event', handleIncomingEvent);

    // Load initial data
    loadActiveProcedures();

    return () => {
      medicRealtimeService.off('connected', handleConnectionChange);
      medicRealtimeService.off('disconnected', handleConnectionChange);
      medicRealtimeService.off('active-procedure-updated', handleProcedureUpdate);
      medicRealtimeService.off('procedure-event-stored', handleProcedureUpdate);
      medicRealtimeService.off('incoming-event', handleIncomingEvent);
    };
  }, [selectedProcedure]);

  const loadActiveProcedures = async () => {
    try {
      const procedures = await medicRealtimeService.getActiveProcedures();
      setActiveProcedures(procedures);
    } catch (error) {
      console.error('Error loading active procedures:', error);
      toast.error('Failed to load active procedures');
    }
  };

  const loadProcedureEvents = async (appointmentId: string) => {
    try {
      const events = await medicRealtimeService.getProcedureEvents(appointmentId);
      setProcedureEvents(events);
    } catch (error) {
      console.error('Error loading procedure events:', error);
    }
  };

  const handleStartSurgery = async () => {
    if (!newProcedure.appointmentId || !newProcedure.caseId || !newProcedure.procedureType) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsStartingProcedure(true);
    try {
      const success = await medicRealtimeService.startSurgery({
        appointmentId: newProcedure.appointmentId,
        patientId: newProcedure.patientId,
        caseId: newProcedure.caseId,
        procedureType: newProcedure.procedureType,
        patientEta: newProcedure.patientEta,
        estimatedDurationMinutes: newProcedure.estimatedDurationMinutes
      });

      if (success) {
        toast.success('Surgery started successfully');
        setNewProcedure({
          appointmentId: '',
          patientId: '',
          caseId: '',
          procedureType: '',
          patientEta: '',
          estimatedDurationMinutes: 60
        });
        loadActiveProcedures();
      } else {
        toast.error('Failed to start surgery');
      }
    } catch (error) {
      console.error('Error starting surgery:', error);
      toast.error('Error starting surgery');
    } finally {
      setIsStartingProcedure(false);
    }
  };

  const handleConfirmMaterial = async () => {
    if (!selectedProcedure || !materialForm.itemSku) {
      toast.error('Please select a procedure and enter material details');
      return;
    }

    try {
      const success = await medicRealtimeService.confirmMaterial({
        appointmentId: selectedProcedure.appointment_id,
        patientId: selectedProcedure.patient_id,
        caseId: selectedProcedure.case_id,
        ...materialForm
      });

      if (success) {
        toast.success('Material usage confirmed');
        setMaterialForm({ itemSku: '', quantityUsed: 1, materialName: '' });
        loadProcedureEvents(selectedProcedure.appointment_id);
      }
    } catch (error) {
      console.error('Error confirming material:', error);
      toast.error('Failed to confirm material usage');
    }
  };

  const handlePlaceImplant = async () => {
    if (!selectedProcedure || !implantForm.implantId || !implantForm.position) {
      toast.error('Please fill in all implant details');
      return;
    }

    try {
      const success = await medicRealtimeService.placeImplant({
        appointmentId: selectedProcedure.appointment_id,
        patientId: selectedProcedure.patient_id,
        caseId: selectedProcedure.case_id,
        ...implantForm
      });

      if (success) {
        toast.success('Implant placement recorded');
        setImplantForm({ implantId: '', position: '', torque: 35 });
        loadProcedureEvents(selectedProcedure.appointment_id);
      }
    } catch (error) {
      console.error('Error recording implant placement:', error);
      toast.error('Failed to record implant placement');
    }
  };

  const handleReportComplication = async () => {
    if (!selectedProcedure || !complicationForm.description) {
      toast.error('Please describe the complication');
      return;
    }

    try {
      const success = await medicRealtimeService.reportComplication({
        appointmentId: selectedProcedure.appointment_id,
        patientId: selectedProcedure.patient_id,
        caseId: selectedProcedure.case_id,
        ...complicationForm
      });

      if (success) {
        toast.success('Complication reported');
        setComplicationForm({ description: '', severity: 'low' });
        loadProcedureEvents(selectedProcedure.appointment_id);
      }
    } catch (error) {
      console.error('Error reporting complication:', error);
      toast.error('Failed to report complication');
    }
  };

  const handleEndSurgery = async () => {
    if (!selectedProcedure) {
      toast.error('No procedure selected');
      return;
    }

    try {
      const success = await medicRealtimeService.endSurgery({
        appointmentId: selectedProcedure.appointment_id,
        patientId: selectedProcedure.patient_id,
        caseId: selectedProcedure.case_id,
        notes: endProcedureNotes
      });

      if (success) {
        toast.success('Surgery completed');
        setEndProcedureNotes('');
        loadActiveProcedures();
        setSelectedProcedure(null);
      }
    } catch (error) {
      console.error('Error ending surgery:', error);
      toast.error('Failed to end surgery');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'planned': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Medical Procedure Tracker</h2>
        <div className="flex items-center gap-2">
          {connectionStatus === 'connected' ? (
            <Badge className="bg-green-100 text-green-800">
              <Wifi className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          ) : (
            <Badge variant="destructive">
              <WifiOff className="h-3 w-3 mr-1" />
              Disconnected
            </Badge>
          )}
          <span className="text-sm text-muted-foreground">
            Queue: {medicRealtimeService.getOfflineQueueLength()} events
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Start New Procedure */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Start Procedure
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="appointmentId">Appointment ID *</Label>
              <Input
                id="appointmentId"
                value={newProcedure.appointmentId}
                onChange={(e) => setNewProcedure(prev => ({ ...prev, appointmentId: e.target.value }))}
                placeholder="Enter appointment ID"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="patientId">Patient ID</Label>
              <Input
                id="patientId"
                value={newProcedure.patientId}
                onChange={(e) => setNewProcedure(prev => ({ ...prev, patientId: e.target.value }))}
                placeholder="Enter patient ID"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="caseId">Case ID *</Label>
              <Input
                id="caseId"
                value={newProcedure.caseId}
                onChange={(e) => setNewProcedure(prev => ({ ...prev, caseId: e.target.value }))}
                placeholder="Enter case ID"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="procedureType">Procedure Type *</Label>
              <Select value={newProcedure.procedureType} onValueChange={(value) => 
                setNewProcedure(prev => ({ ...prev, procedureType: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select procedure type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="crown_prep">Crown Preparation</SelectItem>
                  <SelectItem value="implant_surgery">Implant Surgery</SelectItem>
                  <SelectItem value="root_canal">Root Canal</SelectItem>
                  <SelectItem value="extraction">Tooth Extraction</SelectItem>
                  <SelectItem value="restoration">Restoration</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedDuration">Duration (minutes)</Label>
              <Input
                id="estimatedDuration"
                type="number"
                value={newProcedure.estimatedDurationMinutes}
                onChange={(e) => setNewProcedure(prev => ({ 
                  ...prev, 
                  estimatedDurationMinutes: parseInt(e.target.value) || 60 
                }))}
              />
            </div>

            <Button 
              onClick={handleStartSurgery} 
              disabled={isStartingProcedure}
              className="w-full"
            >
              {isStartingProcedure ? 'Starting...' : 'Start Surgery'}
            </Button>
          </CardContent>
        </Card>

        {/* Active Procedures */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Active Procedures
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeProcedures.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No active procedures
                </p>
              ) : (
                activeProcedures.map(procedure => (
                  <div
                    key={procedure.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedProcedure?.id === procedure.id 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => {
                      setSelectedProcedure(procedure);
                      loadProcedureEvents(procedure.appointment_id);
                    }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium">{procedure.case_id}</span>
                      <Badge className={getStatusColor(procedure.status)}>
                        {procedure.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {procedure.procedure_type}
                    </p>
                    {procedure.started_at && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Started: {new Date(procedure.started_at).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Procedure Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Procedure Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedProcedure ? (
              <p className="text-center text-muted-foreground py-4">
                Select a procedure to see actions
              </p>
            ) : (
              <>
                {/* Material Confirmation */}
                <div className="space-y-2 p-3 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Confirm Material
                  </h4>
                  <Input
                    placeholder="Material SKU"
                    value={materialForm.itemSku}
                    onChange={(e) => setMaterialForm(prev => ({ ...prev, itemSku: e.target.value }))}
                  />
                  <Input
                    placeholder="Material Name"
                    value={materialForm.materialName}
                    onChange={(e) => setMaterialForm(prev => ({ ...prev, materialName: e.target.value }))}
                  />
                  <Input
                    type="number"
                    placeholder="Quantity"
                    value={materialForm.quantityUsed}
                    onChange={(e) => setMaterialForm(prev => ({ 
                      ...prev, 
                      quantityUsed: parseInt(e.target.value) || 1 
                    }))}
                  />
                  <Button onClick={handleConfirmMaterial} size="sm" className="w-full">
                    Confirm Material
                  </Button>
                </div>

                {/* Implant Placement */}
                <div className="space-y-2 p-3 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Place Implant
                  </h4>
                  <Input
                    placeholder="Implant ID"
                    value={implantForm.implantId}
                    onChange={(e) => setImplantForm(prev => ({ ...prev, implantId: e.target.value }))}
                  />
                  <Input
                    placeholder="Position (e.g., 26)"
                    value={implantForm.position}
                    onChange={(e) => setImplantForm(prev => ({ ...prev, position: e.target.value }))}
                  />
                  <Input
                    type="number"
                    placeholder="Torque (Ncm)"
                    value={implantForm.torque}
                    onChange={(e) => setImplantForm(prev => ({ 
                      ...prev, 
                      torque: parseInt(e.target.value) || 35 
                    }))}
                  />
                  <Button onClick={handlePlaceImplant} size="sm" className="w-full">
                    Record Implant
                  </Button>
                </div>

                {/* Report Complication */}
                <div className="space-y-2 p-3 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Report Complication
                  </h4>
                  <Textarea
                    placeholder="Describe the complication"
                    value={complicationForm.description}
                    onChange={(e) => setComplicationForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                  <Select 
                    value={complicationForm.severity} 
                    onValueChange={(value: 'low' | 'medium' | 'high') => 
                      setComplicationForm(prev => ({ ...prev, severity: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low Severity</SelectItem>
                      <SelectItem value="medium">Medium Severity</SelectItem>
                      <SelectItem value="high">High Severity</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleReportComplication} size="sm" className="w-full" variant="destructive">
                    Report Complication
                  </Button>
                </div>

                {/* End Surgery */}
                <div className="space-y-2 p-3 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <Square className="h-4 w-4" />
                    End Surgery
                  </h4>
                  <Textarea
                    placeholder="Procedure notes"
                    value={endProcedureNotes}
                    onChange={(e) => setEndProcedureNotes(e.target.value)}
                  />
                  <Button onClick={handleEndSurgery} size="sm" className="w-full" variant="outline">
                    Complete Surgery
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Procedure Events Timeline */}
      {selectedProcedure && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Procedure Timeline - {selectedProcedure.case_id}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {procedureEvents.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No events recorded yet
                </p>
              ) : (
                procedureEvents.map(event => (
                  <div key={event.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{event.event_type.replace('_', ' ').toUpperCase()}</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <pre className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                        {JSON.stringify(event.event_data, null, 2)}
                      </pre>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}