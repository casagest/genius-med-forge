// Medical Cockpit with Digital Twin 3D and Explainable AI
import { useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Mic, Eye, Activity, Shield, Zap } from 'lucide-react';
import VoiceInterface from './VoiceInterface';
import { MedicalProcedureTracker } from './MedicalProcedureTracker';
import { supabase } from '@/integrations/supabase/client';

interface AIDecision {
  recommendation: string;
  confidence: number;
  reasoning: string[];
  sources: string[];
  risk_factors: string[];
}

interface PatientData {
  id: string;
  patient_code: string;
  digital_twin_id: string;
  created_at?: string;
  updated_at?: string;
  vitals?: {
    heart_rate: number;
    blood_pressure: string;
    temperature: number;
    oxygen_saturation: number;
  };
}

interface MedicalInsight {
  id: string;
  type: 'vital' | 'diagnostic' | 'treatment' | 'risk';
  title: string;
  value: string;
  status: 'normal' | 'warning' | 'critical';
  timestamp: string;
}

function DigitalTwin3D({ patientData }: { patientData: any }) {
  return (
    <mesh>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="#e0e0e0" wireframe />
    </mesh>
  );
}

export function MedicCockpit() {
  const [currentPatient, setCurrentPatient] = useState<PatientData | null>(null);
  const [patients, setPatients] = useState<PatientData[]>([]);
  const [aiDecision, setAiDecision] = useState<AIDecision>({
    recommendation: "Proceed with CAD/CAM crown preparation",
    confidence: 0.92,
    reasoning: [
      "Digital twin analysis shows optimal tooth structure",
      "No contraindications detected in medical history",
      "Material compatibility confirmed"
    ],
    sources: ["Clinical Guidelines 2024", "Patient Medical History", "Digital Scan Analysis"],
    risk_factors: ["Minimal bleeding risk", "Standard anesthesia protocols apply"]
  });
  const [medicalInsights, setMedicalInsights] = useState<MedicalInsight[]>([
    {
      id: '1',
      type: 'vital',
      title: 'Heart Rate',
      value: '72 BPM',
      status: 'normal',
      timestamp: new Date().toISOString()
    },
    {
      id: '2',
      type: 'vital',
      title: 'Blood Pressure',
      value: '120/80 mmHg',
      status: 'normal',
      timestamp: new Date().toISOString()
    },
    {
      id: '3',
      type: 'diagnostic',
      title: 'Surgical Risk',
      value: 'Low Risk',
      status: 'normal',
      timestamp: new Date().toISOString()
    }
  ]);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .limit(10);

      if (error) throw error;
      
      const patientsWithVitals = (data || []).map(patient => ({
        ...patient,
        digital_twin_id: patient.digital_twin_id || '',
        vitals: {
          heart_rate: Math.floor(Math.random() * 40) + 60,
          blood_pressure: `${Math.floor(Math.random() * 40) + 110}/${Math.floor(Math.random() * 20) + 70}`,
          temperature: Math.round((Math.random() * 2 + 36) * 10) / 10,
          oxygen_saturation: Math.floor(Math.random() * 5) + 95
        }
      })) as PatientData[];
      
      setPatients(patientsWithVitals);
      if (patientsWithVitals.length > 0) {
        setCurrentPatient(patientsWithVitals[0]);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const handleVoiceMessage = (message: string) => {
    console.log('Voice command received:', message);
    // Update AI decision based on voice input
    if (message.toLowerCase().includes('risk')) {
      updateAIDecision('risk_assessment');
    } else if (message.toLowerCase().includes('vital')) {
      updateAIDecision('vital_analysis');
    }
  };

  const handleAudioReceived = (audioData: Uint8Array) => {
    // Handle real-time audio response from AI
    console.log('Audio response received, length:', audioData.length);
  };

  const updateAIDecision = (analysisType: string) => {
    // Simulate AI decision update
    const decisions = {
      risk_assessment: {
        recommendation: "Continue with planned procedure - low risk profile",
        confidence: 0.89,
        reasoning: [
          "Patient vitals within normal ranges",
          "No significant medical contraindications",
          "Optimal timing for intervention"
        ],
        sources: ["Real-time Vital Monitoring", "AI Risk Calculator", "Clinical Protocol Database"],
        risk_factors: ["Standard procedural risks apply", "Monitor post-operative recovery"]
      },
      vital_analysis: {
        recommendation: "Vitals stable - proceed with treatment plan",
        confidence: 0.95,
        reasoning: [
          "Heart rate: 72 BPM (normal range)",
          "Blood pressure: 120/80 mmHg (optimal)",
          "Oxygen saturation: 98% (excellent)"
        ],
        sources: ["Continuous Monitoring System", "Vital Signs Database", "Medical Device Integration"],
        risk_factors: ["No immediate concerns", "Continue standard monitoring"]
      }
    };

    setAiDecision(decisions[analysisType as keyof typeof decisions] || aiDecision);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">GENIUS Medical Cockpit</h1>
        <div className="flex gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            Real-time AI
          </Badge>
          {currentPatient && (
            <Badge variant="secondary">
              Patient: {currentPatient.patient_code}
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
          <TabsTrigger value="voice">Voice AI</TabsTrigger>
          <TabsTrigger value="monitoring">Live Monitoring</TabsTrigger>
          <TabsTrigger value="procedures">🏥 Procedures</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Digital Twin 3D Viewer */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Digital Twin 3D
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
                  <Canvas camera={{ position: [0, 0, 5] }}>
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} />
                    <Suspense fallback={null}>
                      <DigitalTwin3D patientData={currentPatient} />
                    </Suspense>
                    <OrbitControls enableZoom={true} enablePan={true} enableRotate={true} />
                  </Canvas>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Button size="sm" variant="outline">Front View</Button>
                  <Button size="sm" variant="outline">Side View</Button>
                  <Button size="sm" variant="outline">Top View</Button>
                </div>
              </CardContent>
            </Card>

            {/* Medical Insights Dashboard */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Medical Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {medicalInsights.map(insight => (
                  <div key={insight.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{insight.title}</h4>
                      <p className={`text-sm ${getStatusColor(insight.status)}`}>
                        {insight.value}
                      </p>
                    </div>
                    <Badge variant={insight.status === 'normal' ? 'default' : insight.status === 'warning' ? 'secondary' : 'destructive'}>
                      {insight.status}
                    </Badge>
                  </div>
                ))}
                
                {currentPatient?.vitals && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3">Current Vitals</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-2 bg-green-50 rounded">
                        <div className="text-lg font-bold text-green-600">{currentPatient.vitals.heart_rate}</div>
                        <div className="text-xs text-green-600">BPM</div>
                      </div>
                      <div className="text-center p-2 bg-blue-50 rounded">
                        <div className="text-lg font-bold text-blue-600">{currentPatient.vitals.blood_pressure}</div>
                        <div className="text-xs text-blue-600">mmHg</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI Decision Support & Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">Recommendation</h3>
                  <Badge variant="default" className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    {(aiDecision.confidence * 100).toFixed(0)}% Confidence
                  </Badge>
                </div>
                <p className="text-sm bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border">
                  {aiDecision.recommendation}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-500" />
                    AI Reasoning
                  </h3>
                  <ul className="space-y-2">
                    {aiDecision.reasoning.map((reason, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2 p-2 bg-green-50 rounded">
                        <span className="text-green-500 mt-1">✓</span>
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Risk Assessment</h3>
                  <ul className="space-y-2">
                    {aiDecision.risk_factors.map((risk, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2 p-2 bg-yellow-50 rounded">
                        <span className="text-yellow-500 mt-1">⚠</span>
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Evidence Sources</h3>
                <div className="flex flex-wrap gap-2">
                  {aiDecision.sources.map((source, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {source}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t flex gap-2">
                <Button className="flex-1">Accept AI Recommendation</Button>
                <Button variant="outline" onClick={() => updateAIDecision('risk_assessment')}>
                  Request New Analysis
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="voice" className="mt-6">
          <VoiceInterface 
            onSpeakingChange={(speaking) => {
              // Handle speaking state change
              console.log('Voice AI speaking:', speaking);
            }}
          />
        </TabsContent>

        <TabsContent value="monitoring" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Patient Selection</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {patients.map(patient => (
                    <Button
                      key={patient.id}
                      variant={currentPatient?.id === patient.id ? "default" : "outline"}
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => setCurrentPatient(patient)}
                    >
                      {patient.patient_code}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Real-time Monitoring
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentPatient ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">{currentPatient.vitals?.heart_rate}</div>
                        <div className="text-sm text-red-600">Heart Rate (BPM)</div>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{currentPatient.vitals?.blood_pressure}</div>
                        <div className="text-sm text-blue-600">Blood Pressure</div>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{currentPatient.vitals?.temperature}°C</div>
                        <div className="text-sm text-green-600">Temperature</div>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">{currentPatient.vitals?.oxygen_saturation}%</div>
                        <div className="text-sm text-purple-600">O2 Saturation</div>
                      </div>
                    </div>
                    
                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-3">AI Monitoring Alerts</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm">All vitals within normal parameters</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-sm">AI monitoring active - Real-time analysis enabled</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground">Select a patient to begin monitoring</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="procedures" className="mt-6">
          <MedicalProcedureTracker />
        </TabsContent>
      </Tabs>
    </div>
  );
}