import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Box, Text } from '@react-three/drei';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import * as THREE from 'three';

interface Patient3DViewerProps {
  patientId: string;
  patientCode: string;
  procedureType?: string;
}

// 3D Patient Model Component
function PatientModel({ procedureType }: { procedureType?: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime) * 0.1;
    }
  });

  return (
    <group>
      {/* Patient Body */}
      <Box
        ref={meshRef}
        args={[2, 4, 1]}
        position={[0, 0, 0]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial 
          color={hovered ? '#4f46e5' : '#6b7280'} 
          transparent 
          opacity={0.7}
        />
      </Box>

      {/* Head */}
      <Sphere args={[0.8]} position={[0, 3, 0]}>
        <meshStandardMaterial color="#f3f4f6" transparent opacity={0.8} />
      </Sphere>

      {/* Implant/Procedure Area (if specified) */}
      {procedureType === 'Hip Replacement' && (
        <Sphere args={[0.3]} position={[-0.8, -1, 0]}>
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.2} />
        </Sphere>
      )}

      {procedureType === 'Dental Crown Implant' && (
        <Box args={[0.2, 0.2, 0.2]} position={[0.3, 2.5, 0.4]}>
          <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.3} />
        </Box>
      )}

      {/* Vital signs indicators */}
      <Text
        position={[2.5, 2, 0]}
        rotation={[0, -Math.PI / 4, 0]}
        fontSize={0.3}
        color="#ef4444"
      >
        ♥ 72 BPM
      </Text>

      <Text
        position={[2.5, 1.5, 0]}
        rotation={[0, -Math.PI / 4, 0]}
        fontSize={0.2}
        color="#3b82f6"
      >
        BP: 120/80
      </Text>
    </group>
  );
}

// Floating medical data points
function MedicalDataPoints() {
  const points = [
    { position: [2, 3, 1], label: "Brain Activity", color: "#8b5cf6" },
    { position: [-2, 1, 1], label: "Heart Monitor", color: "#ef4444" },
    { position: [0, -2, 1], label: "Implant Site", color: "#10b981" },
  ];

  return (
    <>
      {points.map((point, index) => (
        <group key={index}>
          <Sphere args={[0.1]} position={point.position as [number, number, number]}>
            <meshStandardMaterial 
              color={point.color} 
              emissive={point.color} 
              emissiveIntensity={0.5}
            />
          </Sphere>
          <Text
            position={[point.position[0], point.position[1] + 0.3, point.position[2]]}
            fontSize={0.15}
            color={point.color}
          >
            {point.label}
          </Text>
        </group>
      ))}
    </>
  );
}

export function Patient3DViewer({ patientId, patientCode, procedureType }: Patient3DViewerProps) {
  const [viewMode, setViewMode] = useState<'anatomy' | 'procedure' | 'analysis'>('anatomy');

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span>3D Digital Twin</span>
          <Badge variant="outline">{patientCode}</Badge>
        </CardTitle>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={viewMode === 'anatomy' ? 'default' : 'outline'}
            onClick={() => setViewMode('anatomy')}
          >
            Anatomy
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'procedure' ? 'default' : 'outline'}
            onClick={() => setViewMode('procedure')}
          >
            Procedure
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'analysis' ? 'default' : 'outline'}
            onClick={() => setViewMode('analysis')}
          >
            Analysis
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-80 w-full">
          <Canvas
            camera={{ position: [5, 5, 5], fov: 75 }}
            style={{ background: 'linear-gradient(to bottom, #f0f9ff, #e0f2fe)' }}
          >
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <pointLight position={[-10, -10, -5]} color="#3b82f6" intensity={0.5} />
            
            <PatientModel procedureType={procedureType} />
            {viewMode === 'analysis' && <MedicalDataPoints />}
            
            <OrbitControls 
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              autoRotate={viewMode === 'anatomy'}
              autoRotateSpeed={0.5}
            />
            
            {/* Grid for reference */}
            <gridHelper args={[10, 10, '#e5e7eb', '#f3f4f6'] as [number, number, string, string]} />
          </Canvas>
        </div>
        
        {/* Controls and Info */}
        <div className="p-4 bg-muted/50">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">
              Click and drag to rotate • Scroll to zoom
            </span>
            <div className="flex gap-4">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Normal
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                Alert
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Monitor
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}