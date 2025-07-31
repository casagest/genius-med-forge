// NeuroFabric Production Cortex - AgentLab Dashboard
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Cpu, Clock, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LabJob {
  id: string;
  job_code: string;
  job_type: string;
  status: 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  priority: number;
  machine_assignment?: string;
  estimated_duration?: string;
  started_at?: string;
  patients: { patient_code: string; profiles: { full_name: string } };
}

export function NeuroFabricCortex() {
  const [jobs, setJobs] = useState<LabJob[]>([]);
  const [machines, setMachines] = useState({
    CAD_CAM_1: { status: 'ACTIVE', current_job: 'LAB-001' },
    CAD_CAM_2: { status: 'IDLE', current_job: null },
    PRINTER_3D: { status: 'MAINTENANCE', current_job: null }
  });

  useEffect(() => {
    fetchProductionQueue();
    
    // Real-time WebSocket updates
    const channel = supabase
      .channel('lab_queue')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'lab_production_queue'
      }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setJobs(prev => prev.map(job => 
            job.id === payload.new.id ? { ...job, ...payload.new } : job
          ));
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchProductionQueue = async () => {
    const { data } = await supabase
      .from('lab_production_queue')
      .select(`
        *,
        patients (patient_code, profiles (full_name))
      `)
      .order('priority', { ascending: false });
    
    setJobs(data || []);
  };

  const updateJobStatus = async (jobId: string, newStatus: string, machine?: string) => {
    await supabase.functions.invoke('agent-lab', {
      body: {
        event: 'update_job_status',
        data: { job_id: jobId, status: newStatus, machine_assignment: machine }
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'default';
      case 'IN_PROGRESS': return 'secondary';
      case 'FAILED': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">NeuroFabric Production Cortex</h1>

      {/* Machine Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(machines).map(([machineId, machine]) => (
          <Card key={machineId}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{machineId}</CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-2">
                <Badge variant={machine.status === 'ACTIVE' ? 'default' : 'outline'}>
                  {machine.status}
                </Badge>
              </div>
              {machine.current_job && (
                <p className="text-sm text-muted-foreground">
                  Current: {machine.current_job}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Production Queue */}
      <Card>
        <CardHeader>
          <CardTitle>Production Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {jobs.map(job => (
              <div key={job.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold">{job.job_code}</h3>
                    <p className="text-sm text-muted-foreground">
                      {job.patients?.profiles?.full_name} - {job.job_type}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge>Priority: {job.priority}</Badge>
                    <Badge variant={getStatusColor(job.status)}>
                      {job.status}
                    </Badge>
                  </div>
                </div>

                {job.status === 'IN_PROGRESS' && (
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Progress</span>
                      <span>Estimated: {job.estimated_duration}</span>
                    </div>
                    <Progress value={65} className="h-2" />
                  </div>
                )}

                <div className="flex gap-2">
                  {job.status === 'QUEUED' && (
                    <Button 
                      size="sm" 
                      onClick={() => updateJobStatus(job.id, 'IN_PROGRESS', 'CAD_CAM_1')}
                    >
                      Start Production
                    </Button>
                  )}
                  {job.status === 'IN_PROGRESS' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => updateJobStatus(job.id, 'COMPLETED')}
                    >
                      Mark Complete
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}