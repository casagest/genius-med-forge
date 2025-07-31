import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StrategicOpsPanel } from '@/components/StrategicOpsPanel';
import { NeuroFabricCortex } from '@/components/NeuroFabricCortex';
import { MedicalCockpit } from '@/components/MedicalCockpit';
import { MedicalAIInterface } from '@/components/MedicalAIInterface';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <h1 className="text-2xl font-bold">GENIUS MedicalCor AI</h1>
        </div>
      </div>
      
      <Tabs defaultValue="ai" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ai">🧠 AI Interface</TabsTrigger>
          <TabsTrigger value="strategic">📊 StrategicOps</TabsTrigger>
          <TabsTrigger value="neurofabric">🏭 NeuroFabric</TabsTrigger>
          <TabsTrigger value="cockpit">⚕️ MedCockpit</TabsTrigger>
        </TabsList>
        
        <TabsContent value="ai" className="mt-0">
          <MedicalAIInterface />
        </TabsContent>
        
        <TabsContent value="strategic" className="mt-0">
          <StrategicOpsPanel />
        </TabsContent>
        
        <TabsContent value="neurofabric" className="mt-0">
          <NeuroFabricCortex />
        </TabsContent>
        
        <TabsContent value="cockpit" className="mt-0">
          <MedicalCockpit />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
