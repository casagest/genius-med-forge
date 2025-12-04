import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Activity,
  Heart,
  Brain,
  Clock,
  Mic,
  MicOff,
  Play,
  Pause,
  AlertTriangle,
  CheckCircle,
  Volume2
} from 'lucide-react';
import { Patient3DViewer } from '@/components/Patient3DViewer';
import { patientRepository, procedureRepository, procedureEventRepository } from '@/repositories';
import { logger } from '@/utils/logger';

interface Patient {
  id: string;
  patient_code: string;
  first_name: string;
  last_name: string;
  digital_twin_id?: string;
  medical_history: any;
  consent_vocal: boolean;
}

interface Procedure {
  id: string;
  patient_id: string;
  procedure_type: string;
  status: string;
  scheduled_date: string;
  started_at?: string;
  clinical_data: any;
  surgeon_id?: string;
}

interface ProcedureEvent {
  id: string;
  procedure_id: string;
  event_timestamp: string;
  event_type: string;
  event_data: any;
  confidence_score?: number;
  automated: boolean;
}

export function MedicalCockpit() {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [currentProcedure, setCurrentProcedure] = useState<Procedure | null>(null);
  const [procedureEvents, setProcedureEvents] = useState<ProcedureEvent[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [vitalSigns, setVitalSigns] = useState({
    heartRate: 72,
    bloodPressure: '120/80',
    temperature: 36.5,
    oxygenSat: 98
  });
  
  const { toast } = useToast();
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  useEffect(() => {
    fetchPatients();
    
    // Real-time subscription for procedure events
    const eventChannel = supabase
      .channel('procedure_events')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'procedure_event_logs'
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newEvent = payload.new as ProcedureEvent;
          if (currentProcedure && newEvent.procedure_id === currentProcedure.id) {
            setProcedureEvents(prev => [newEvent, ...prev]);
            
            // Voice notification for critical events
            if (newEvent.event_type === 'complication') {
              speakAlert(`Critical event detected: ${newEvent.event_type}`);
            }
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(eventChannel);
    };
  }, [currentProcedure]);

  const fetchPatients = async () => {
    const result = await patientRepository.findAll({
      orderBy: { column: 'created_at', ascending: false }
    });

    if (result.success) {
      setPatients((result.data as Patient[]) || []);
    } else {
      logger.error('Error fetching patients', { error: result.error });
      // Use mock data if database not ready
      setPatients([
        {
          id: '1',
          patient_code: 'P001',
          first_name: 'John',
          last_name: 'Doe',
          medical_history: {},
          consent_vocal: true
        }
      ]);
    }
  };

  const fetchProcedureData = async (patientId: string) => {
    const result = await procedureRepository.findByPatientId(patientId);

    if (result.success && result.data.length > 0) {
      // Find in-progress procedure
      const inProgressProcedure = result.data.find(p => p.status === 'IN_PROGRESS');
      if (inProgressProcedure) {
        setCurrentProcedure({
          id: inProgressProcedure.id,
          patient_id: inProgressProcedure.patient_id || patientId,
          procedure_type: inProgressProcedure.procedure_type,
          status: inProgressProcedure.status,
          scheduled_date: inProgressProcedure.created_at,
          started_at: inProgressProcedure.started_at || undefined,
          clinical_data: {}
        });

        // Fetch procedure events
        const eventsResult = await procedureRepository.getProcedureEvents(inProgressProcedure.id);
        if (eventsResult.success) {
          setProcedureEvents(eventsResult.data.map(e => ({
            id: e.id,
            procedure_id: e.case_id,
            event_timestamp: e.timestamp,
            event_type: e.event_type,
            event_data: e.event_data,
            automated: e.processed || false
          })) as ProcedureEvent[]);
        }
      }
    } else {
      logger.error('Error fetching procedure data', { error: result.success ? 'No procedures found' : result.error });
      // Mock procedure for testing
      setCurrentProcedure({
        id: '1',
        patient_id: patientId,
        procedure_type: 'Dental Crown Implant',
        status: 'in_progress',
        scheduled_date: new Date().toISOString(),
        clinical_data: {}
      });
      setProcedureEvents([]);
    }
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      
      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };
      
      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        await processVoiceCommand(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.current.start();
      setIsListening(true);
      
      toast({
        title: "Voice Recording Started",
        description: "Speak your command clearly",
      });
    } catch (error) {
      logger.error('Error starting voice recording', error);
      toast({
        title: "Microphone Error",
        description: "Could not access microphone",
        variant: "destructive"
      });
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop();
      setIsListening(false);
    }
  };

  const processVoiceCommand = async (audioBlob: Blob) => {
    try {
      // Convert audio to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      // Send to Whisper for transcription (would need edge function)
      const { data, error } = await supabase.functions.invoke('voice-to-text', {
        body: { audio: base64Audio }
      });
      
      if (error) throw error;

      const transcription = data.text;
      logger.info('Voice command received', { transcription });

      // Process medical commands
      await handleVoiceCommand(transcription);

    } catch (error) {
      logger.error('Error processing voice command', error);
      toast({
        title: "Voice Processing Error",
        description: "Could not process voice command",
        variant: "destructive"
      });
    }
  };

  const handleVoiceCommand = async (command: string) => {
    const lowerCommand = command.toLowerCase();
    
    if (lowerCommand.includes('start procedure')) {
      await startProcedure();
    } else if (lowerCommand.includes('add complication')) {
      await addProcedureEvent('complication', { description: command });
    } else if (lowerCommand.includes('record measurement')) {
      await addProcedureEvent('measurement', { description: command });
    } else if (lowerCommand.includes('end procedure')) {
      await endProcedure();
    } else {
      // Send to AI for interpretation
      speakResponse(`Command received: ${command}. Processing with medical AI...`);
    }
  };

  const speakAlert = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = speechSynthesis.getVoices().find(voice => 
        voice.name.includes('Female') || voice.name.includes('Medical')
      ) || speechSynthesis.getVoices()[0];
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      speechSynthesis.speak(utterance);
    }
  };

  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      speechSynthesis.speak(utterance);
    }
  };

  const startProcedure = async () => {
    if (!currentProcedure) return;

    const result = await procedureRepository.update(currentProcedure.id, {
      status: 'IN_PROGRESS',
      started_at: new Date().toISOString()
    });

    if (result.success) {
      speakAlert('Procedure started. All systems monitoring.');
      toast({
        title: "Procedure Started",
        description: "Real-time monitoring activated",
      });
    } else {
      logger.error('Error starting procedure', { error: result.error });
    }
  };

  const addProcedureEvent = async (eventType: string, eventData: Record<string, unknown>) => {
    if (!currentProcedure) return;

    const result = await procedureEventRepository.logEvent(
      currentProcedure.id,
      currentProcedure.id,
      eventType,
      eventData,
      currentProcedure.patient_id
    );

    if (result.success) {
      toast({
        title: "Event Recorded",
        description: `${eventType} logged successfully`,
      });
    } else {
      logger.error('Error adding procedure event', { error: result.error });
    }
  };

  const endProcedure = async () => {
    if (!currentProcedure) return;

    const result = await procedureRepository.completeProcedure(currentProcedure.id, {});

    if (result.success) {
      speakAlert('Procedure completed successfully. Generating post-operative analysis.');
      toast({
        title: "Procedure Completed",
        description: "Initiating post-operative analysis",
      });
    } else {
      logger.error('Error ending procedure', { error: result.error });
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'start_surgery': return <Play className="h-4 w-4 text-green-600" />;
      case 'implant_placed': return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case 'complication': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'measurement': return <Activity className="h-4 w-4 text-purple-600" />;
      case 'end_surgery': return <Pause className="h-4 w-4 text-gray-600" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'start_surgery': return 'default';
      case 'implant_placed': return 'default';
      case 'complication': return 'destructive';
      case 'measurement': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Brain className="h-8 w-8 text-primary" />
          Medical Cockpit
        </h1>
        <div className="flex gap-2">
          <Button
            variant={isListening ? "destructive" : "default"}
            onClick={isListening ? stopVoiceRecording : startVoiceRecording}
            className="flex items-center gap-2"
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {isListening ? 'Stop Listening' : 'Voice Command'}
          </Button>
          <Button variant="outline">
            <Volume2 className="h-4 w-4 mr-2" />
            ReplayCritic 3D
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Patient Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Active Patients</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {patients.map((patient) => (
              <div
                key={patient.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedPatient?.id === patient.id 
                    ? 'bg-primary/10 border-primary' 
                    : 'hover:bg-muted'
                }`}
                onClick={() => {
                  setSelectedPatient(patient);
                  fetchProcedureData(patient.id);
                }}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">
                      {patient.first_name} {patient.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {patient.patient_code}
                    </p>
                  </div>
                  {patient.consent_vocal && (
                    <Badge variant="secondary">Voice OK</Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 3D Digital Twin Viewer */}
        <div className="lg:col-span-2">
          {selectedPatient ? (
            <Patient3DViewer 
              patientId={selectedPatient.id}
              patientCode={selectedPatient.patient_code}
              procedureType={currentProcedure?.procedure_type}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Digital Twin 3D</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">Select patient to view 3D model</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Vital Signs */}
        <Card>
          <CardHeader>
            <CardTitle>Vital Signs Monitor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Heart Rate</p>
                  <p className="text-lg font-bold">{vitalSigns.heartRate} BPM</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Blood Pressure</p>
                <p className="text-lg font-bold">{vitalSigns.bloodPressure}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Temperature</p>
                <p className="text-lg font-bold">{vitalSigns.temperature}°C</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Oxygen Sat</p>
                <p className="text-lg font-bold">{vitalSigns.oxygenSat}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Procedure Timeline */}
      {currentProcedure && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Procedure Timeline</span>
              <Badge variant={currentProcedure.status === 'in_progress' ? 'default' : 'secondary'}>
                {currentProcedure.status.toUpperCase()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">{currentProcedure.procedure_type}</h3>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => addProcedureEvent('measurement', { type: 'manual' })}>
                    Add Measurement
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => addProcedureEvent('complication', { type: 'manual' })}>
                    Report Event
                  </Button>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {procedureEvents.map((event) => (
                  <div key={event.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    {getEventIcon(event.event_type)}
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium capitalize">
                            {event.event_type.replace('_', ' ')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(event.event_timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={getEventColor(event.event_type)}>
                            {event.automated ? 'Auto' : 'Manual'}
                          </Badge>
                          {event.confidence_score && (
                            <Badge variant="outline">
                              {Math.round(event.confidence_score * 100)}%
                            </Badge>
                          )}
                        </div>
                      </div>
                      {event.event_data && Object.keys(event.event_data).length > 0 && (
                        <p className="text-sm mt-1 text-muted-foreground">
                          {JSON.stringify(event.event_data)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}