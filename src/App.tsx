import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SkipLink } from "@/hooks/useAccessibility";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load pages for better performance
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Configure React Query with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
  },
});

// Loading fallback component
function PageLoader() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800"
      role="status"
      aria-label="Loading page"
    >
      <div className="w-full max-w-md space-y-4 p-8">
        <Skeleton className="mx-auto h-12 w-12" variant="circular" />
        <Skeleton className="mx-auto h-6 w-3/4" />
        <Skeleton className="mx-auto h-4 w-1/2" />
      </div>
    </div>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300} skipDelayDuration={0}>
        <SkipLink />
        <Toaster />
        <Sonner
          position="top-right"
          toastOptions={{
            duration: 5000,
            classNames: {
              toast: "group toast",
              error: "bg-destructive text-destructive-foreground",
              success: "bg-green-600 text-white",
              warning: "bg-yellow-600 text-white",
              info: "bg-blue-600 text-white",
            },
          }}
        />
        <BrowserRouter>
          <main id="main-content" className="min-h-screen">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </main>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
