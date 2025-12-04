import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Button } from '@/components/ui/button';

interface DigitalTwin3DViewerProps {
  patientData: unknown;
}

function DigitalTwin3D({ patientData }: { patientData: unknown }) {
  return (
    <mesh>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="#e0e0e0" wireframe />
    </mesh>
  );
}

export function DigitalTwin3DViewer({ patientData }: DigitalTwin3DViewerProps) {
  return (
    <>
      <div className="h-96 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
        <Canvas camera={{ position: [0, 0, 5] }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <Suspense fallback={null}>
            <DigitalTwin3D patientData={patientData} />
          </Suspense>
          <OrbitControls enableZoom={true} enablePan={true} enableRotate={true} />
        </Canvas>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Button size="sm" variant="outline">Front View</Button>
        <Button size="sm" variant="outline">Side View</Button>
        <Button size="sm" variant="outline">Top View</Button>
      </div>
    </>
  );
}
