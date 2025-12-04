import { Suspense, lazy } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load heavy components for code splitting
const StrategicOpsPanel = lazy(() => import('@/components/StrategicOpsPanel').then(m => ({ default: m.StrategicOpsPanel })));
const SmartLabCockpit = lazy(() => import('@/components/SmartLabCockpit').then(m => ({ default: m.SmartLabCockpit })));
const MedicCockpit = lazy(() => import('@/components/MedicCockpit').then(m => ({ default: m.MedicCockpit })));
const MedicalAIInterface = lazy(() => import('@/components/MedicalAIInterface').then(m => ({ default: m.MedicalAIInterface })));

// Loading fallback component
const TabLoadingFallback = () => (
  <div className="p-6 space-y-4">
    <Skeleton className="h-8 w-64" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-3/4" />
    <div className="grid grid-cols-3 gap-4 mt-6">
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
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
          <Suspense fallback={<TabLoadingFallback />}>
            <MedicalAIInterface />
          </Suspense>
        </TabsContent>

        <TabsContent value="strategic" className="mt-0">
          <Suspense fallback={<TabLoadingFallback />}>
            <StrategicOpsPanel />
          </Suspense>
        </TabsContent>

        <TabsContent value="smartlab" className="mt-0">
          <Suspense fallback={<TabLoadingFallback />}>
            <SmartLabCockpit />
          </Suspense>
        </TabsContent>

        <TabsContent value="cockpit" className="mt-0">
          <Suspense fallback={<TabLoadingFallback />}>
            <MedicCockpit />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
