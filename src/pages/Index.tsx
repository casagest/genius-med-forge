import { Suspense, lazy } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Component-based code splitting - lazy load heavy dashboard components
// Each component will be in its own chunk, loaded only when the tab is activated
const StrategicOpsPanel = lazy(() => import('@/components/StrategicOpsPanel').then(module => ({ default: module.StrategicOpsPanel })));
const SmartLabCockpit = lazy(() => import('@/components/SmartLabCockpit').then(module => ({ default: module.SmartLabCockpit })));
const MedicCockpit = lazy(() => import('@/components/MedicCockpit').then(module => ({ default: module.MedicCockpit })));
const MedicalAIInterface = lazy(() => import('@/components/MedicalAIInterface').then(module => ({ default: module.MedicalAIInterface })));

// Component loading fallback
const ComponentLoader = () => (
  <div className="flex items-center justify-center p-8">
    <div className="flex flex-col items-center gap-3">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-muted-foreground">Încărcare modul...</p>
    </div>
  </div>
);

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
          <Suspense fallback={<ComponentLoader />}>
            <MedicalAIInterface />
          </Suspense>
        </TabsContent>

        <TabsContent value="strategic" className="mt-0">
          <Suspense fallback={<ComponentLoader />}>
            <StrategicOpsPanel />
          </Suspense>
        </TabsContent>

        <TabsContent value="smartlab" className="mt-0">
          <Suspense fallback={<ComponentLoader />}>
            <SmartLabCockpit />
          </Suspense>
        </TabsContent>

        <TabsContent value="cockpit" className="mt-0">
          <Suspense fallback={<ComponentLoader />}>
            <MedicCockpit />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
