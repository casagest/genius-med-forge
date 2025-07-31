// Medical Cockpit with Digital Twin 3D and Explainable AI
import { useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, Mic, Eye } from 'lucide-react';

interface AIDecision {
  recommendation: string;
  confidence: number;
  reasoning: string[];
  sources: string[];
  risk_factors: string[];
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
  const [currentPatient, setCurrentPatient] = useState(null);
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
  const [isListening, setIsListening] = useState(false);

  const startVoiceCommand = () => {
    setIsListening(true);
    
    if ('webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'ro-RO';

      recognition.onresult = (event: any) => {
        const command = event.results[0][0].transcript;
        processVoiceCommand(command);
        setIsListening(false);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.start();
    }
  };

  const processVoiceCommand = (command: string) => {
    console.log('Voice command:', command);
    // Process medical voice commands here
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Medical Cockpit</h1>
        <div className="flex gap-2">
          <Button
            variant={isListening ? "destructive" : "outline"}
            size="sm"
            onClick={startVoiceCommand}
          >
            <Mic className="h-4 w-4 mr-2" />
            {isListening ? 'Listening...' : 'Voice Command'}
          </Button>
        </div>
      </div>

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
            <div className="h-96 bg-gray-50 rounded-lg">
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

        {/* Explainable AI Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Decision Support
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">Recommendation</h3>
                <Badge variant="default">
                  {(aiDecision.confidence * 100).toFixed(0)}% Confidence
                </Badge>
              </div>
              <p className="text-sm bg-blue-50 p-3 rounded">
                {aiDecision.recommendation}
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">AI Reasoning</h3>
              <ul className="space-y-1">
                {aiDecision.reasoning.map((reason, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    {reason}
                  </li>
                ))}
              </ul>
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

            <div>
              <h3 className="font-semibold mb-2">Risk Assessment</h3>
              <ul className="space-y-1">
                {aiDecision.risk_factors.map((risk, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    <span className="text-yellow-500 mt-1">⚠</span>
                    {risk}
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-4 border-t">
              <Button className="w-full">Accept AI Recommendation</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}