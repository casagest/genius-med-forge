-- Create procedure events table for real-time medical procedure tracking
CREATE TABLE public.procedure_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL,
  patient_id UUID,
  case_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create active procedures table to track ongoing surgeries
CREATE TABLE public.active_procedures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL UNIQUE,
  patient_id UUID,
  case_id TEXT NOT NULL,
  procedure_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  estimated_duration_minutes INTEGER,
  actual_duration_minutes INTEGER,
  notes TEXT,
  complications JSONB DEFAULT '[]'::jsonb,
  materials_used JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.procedure_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_procedures ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can manage procedure events" 
ON public.procedure_events 
FOR ALL 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Authenticated users can manage active procedures" 
ON public.active_procedures 
FOR ALL 
USING (auth.role() = 'authenticated'::text);

-- Create indexes for better performance
CREATE INDEX idx_procedure_events_appointment ON public.procedure_events(appointment_id);
CREATE INDEX idx_procedure_events_timestamp ON public.procedure_events(timestamp);
CREATE INDEX idx_procedure_events_type ON public.procedure_events(event_type);
CREATE INDEX idx_active_procedures_status ON public.active_procedures(status);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.procedure_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.active_procedures;

-- Create function to update timestamps
CREATE TRIGGER update_procedure_events_updated_at
BEFORE UPDATE ON public.procedure_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_active_procedures_updated_at
BEFORE UPDATE ON public.active_procedures
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();