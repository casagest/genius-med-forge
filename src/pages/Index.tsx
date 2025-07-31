import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StrategicOpsPanel } from '@/components/StrategicOpsPanel';
import { SmartLabCockpit } from '@/components/SmartLabCockpit';
import { MedicCockpit } from '@/components/MedicCockpit';
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
          <TabsTrigger value="smartlab">🏭 SmartLab</TabsTrigger>
          <TabsTrigger value="cockpit">⚕️ MedCockpit</TabsTrigger>
        </TabsList>
        
        <TabsContent value="ai" className="mt-0">
          <MedicalAIInterface />
        </TabsContent>
        
        <TabsContent value="strategic" className="mt-0">
          <StrategicOpsPanel />
        </TabsContent>
        
        <TabsContent value="smartlab" className="mt-0">
          <SmartLabCockpit />
        </TabsContent>
        
        <TabsContent value="cockpit" className="mt-0">
          <MedicCockpit />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
