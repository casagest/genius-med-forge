import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StrategicOpsPanel } from '@/components/StrategicOpsPanel';
import { NeuroFabricCortex } from '@/components/NeuroFabricCortex';
import { MedicCockpit } from '@/components/MedicCockpit';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <h1 className="text-2xl font-bold">GENIUS MedicalCor AI</h1>
        </div>
      </div>
      
      <Tabs defaultValue="strategic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="strategic">StrategicOps Panel</TabsTrigger>
          <TabsTrigger value="neurofabric">NeuroFabric Cortex</TabsTrigger>
          <TabsTrigger value="cockpit">Medical Cockpit</TabsTrigger>
        </TabsList>
        
        <TabsContent value="strategic" className="mt-0">
          <StrategicOpsPanel />
        </TabsContent>
        
        <TabsContent value="neurofabric" className="mt-0">
          <NeuroFabricCortex />
        </TabsContent>
        
        <TabsContent value="cockpit" className="mt-0">
          <MedicCockpit />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
