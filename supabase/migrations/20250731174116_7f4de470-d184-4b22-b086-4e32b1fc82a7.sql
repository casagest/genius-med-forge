-- Add enhanced scheduling fields to lab_production_queue table
ALTER TABLE public.lab_production_queue 
ADD COLUMN IF NOT EXISTS patient_eta TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT false;

-- Create index for efficient scheduling queries
CREATE INDEX IF NOT EXISTS idx_lab_production_queue_scheduling 
ON public.lab_production_queue(status, is_urgent, patient_eta, priority);

-- Update some existing jobs with mock data for testing
UPDATE public.lab_production_queue 
SET 
  patient_eta = created_at + INTERVAL '2 days',
  is_urgent = CASE 
    WHEN priority > 8 THEN true 
    ELSE false 
  END
WHERE patient_eta IS NULL;