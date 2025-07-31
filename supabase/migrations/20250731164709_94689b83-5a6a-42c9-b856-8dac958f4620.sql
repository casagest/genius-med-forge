-- Phase 1B: Update existing schema and add new tables for Medical AI System

-- Update existing patients table with additional medical fields
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('M', 'F', 'Other'));
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS medical_history JSONB DEFAULT '{}';
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS allergies TEXT[];
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS emergency_contact JSONB DEFAULT '{}';
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS consent_vocal BOOLEAN DEFAULT false;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS consent_digital BOOLEAN DEFAULT false;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS gdpr_consent BOOLEAN DEFAULT false;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS files_urls TEXT[];

-- Create new Procedure table
CREATE TABLE IF NOT EXISTS public.procedures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  procedure_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'failed')),
  scheduled_date TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  clinical_data JSONB DEFAULT '{}',
  implant_data JSONB DEFAULT '{}',
  surgeon_id UUID REFERENCES auth.users(id),
  procedure_notes TEXT,
  complications JSONB DEFAULT '[]',
  success_score DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ProcedureEventLog table for real-time tracking
CREATE TABLE IF NOT EXISTS public.procedure_event_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  procedure_id UUID NOT NULL REFERENCES public.procedures(id) ON DELETE CASCADE,
  event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  event_type TEXT NOT NULL CHECK (event_type IN ('start_surgery', 'implant_placed', 'complication', 'measurement', 'end_surgery', 'recovery_check')),
  event_data JSONB DEFAULT '{}',
  user_id UUID REFERENCES auth.users(id),
  confidence_score DECIMAL(3,2),
  automated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Update existing analysis_reports table
ALTER TABLE public.analysis_reports ADD COLUMN IF NOT EXISTS procedure_id UUID REFERENCES public.procedures(id) ON DELETE CASCADE;
ALTER TABLE public.analysis_reports ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE;
ALTER TABLE public.analysis_reports ADD COLUMN IF NOT EXISTS risk_score DECIMAL(3,2) CHECK (risk_score >= 0 AND risk_score <= 1);
ALTER TABLE public.analysis_reports ADD COLUMN IF NOT EXISTS action_required BOOLEAN DEFAULT false;
ALTER TABLE public.analysis_reports ADD COLUMN IF NOT EXISTS rationale TEXT;
ALTER TABLE public.analysis_reports ADD COLUMN IF NOT EXISTS ai_model_used TEXT;
ALTER TABLE public.analysis_reports ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id);
ALTER TABLE public.analysis_reports ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

-- Rename and update existing lab tables
DROP TABLE IF EXISTS public.inventory_items CASCADE;
ALTER TABLE public.lab_materials RENAME TO inventory_items;

-- Add new columns to inventory_items (formerly lab_materials)
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'General';
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS current_quantity INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS minimum_threshold INTEGER NOT NULL DEFAULT 10;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS maximum_capacity INTEGER;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS batch_number TEXT;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS auto_reorder BOOLEAN DEFAULT true;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS last_reorder_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS storage_location TEXT;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS material_properties JSONB DEFAULT '{}';

-- Update inventory_items to add missing data from old schema
UPDATE public.inventory_items SET 
  current_quantity = current_stock,
  name = material_name
WHERE current_quantity = 0 AND name IS NULL;

-- Rename and update production queue
DROP TABLE IF EXISTS public.production_jobs CASCADE;
ALTER TABLE public.lab_production_queue RENAME TO production_jobs;

-- Add new columns to production_jobs
ALTER TABLE public.production_jobs ADD COLUMN IF NOT EXISTS procedure_id UUID REFERENCES public.procedures(id) ON DELETE SET NULL;
ALTER TABLE public.production_jobs ADD COLUMN IF NOT EXISTS estimated_duration INTERVAL;
ALTER TABLE public.production_jobs ADD COLUMN IF NOT EXISTS actual_duration INTERVAL;
ALTER TABLE public.production_jobs ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.production_jobs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.production_jobs ADD COLUMN IF NOT EXISTS quality_check_passed BOOLEAN;
ALTER TABLE public.production_jobs ADD COLUMN IF NOT EXISTS failure_reason TEXT;
ALTER TABLE public.production_jobs ADD COLUMN IF NOT EXISTS output_files TEXT[];

-- Create audit log table for GDPR compliance
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'SELECT')),
  old_values JSONB,
  new_values JSONB,
  user_id UUID REFERENCES auth.users(id),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('procedure_update', 'material_alert', 'risk_alert', 'production_complete')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  is_vocal BOOLEAN DEFAULT false,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on new tables
ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedure_event_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking (if not exists)
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE user_id = user_uuid;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Add comprehensive RLS policies

-- Procedures policies
CREATE POLICY "Medical staff can view procedures" ON public.procedures
  FOR SELECT USING (public.get_user_role(auth.uid()) IN ('CEO', 'MEDIC', 'LAB_TECH'));

CREATE POLICY "Patients can view their procedures" ON public.procedures
  FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'PATIENT' 
    AND patient_id IN (
      SELECT p.id FROM public.patients p 
      JOIN public.profiles pr ON pr.email = p.email 
      WHERE pr.user_id = auth.uid()
    )
  );

CREATE POLICY "Medics can manage procedures" ON public.procedures
  FOR ALL USING (public.get_user_role(auth.uid()) IN ('CEO', 'MEDIC'));

-- Procedure event logs policies
CREATE POLICY "Medical staff can view event logs" ON public.procedure_event_logs
  FOR SELECT USING (public.get_user_role(auth.uid()) IN ('CEO', 'MEDIC', 'LAB_TECH'));

CREATE POLICY "Medical staff can add event logs" ON public.procedure_event_logs
  FOR INSERT WITH CHECK (public.get_user_role(auth.uid()) IN ('MEDIC', 'LAB_TECH'));

-- Notifications policies
CREATE POLICY "Users can view their notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Audit logs policies
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'CEO');

-- Create workflow trigger functions
CREATE OR REPLACE FUNCTION public.on_procedure_start()
RETURNS TRIGGER AS $$
BEGIN
  -- Create start event log
  INSERT INTO public.procedure_event_logs (
    procedure_id,
    event_type,
    event_data,
    user_id
  ) VALUES (
    NEW.id,
    'start_surgery',
    jsonb_build_object('status', NEW.status, 'started_at', NEW.started_at),
    NEW.surgeon_id
  );
  
  -- Create notification for surgeon
  INSERT INTO public.notifications (
    user_id,
    patient_id,
    notification_type,
    title,
    message,
    priority
  ) VALUES (
    NEW.surgeon_id,
    NEW.patient_id,
    'procedure_update',
    'Procedure Started',
    'Procedure ' || NEW.procedure_type || ' has been started.',
    'high'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for procedure start
DROP TRIGGER IF EXISTS on_procedure_start_trigger ON public.procedures;
CREATE TRIGGER on_procedure_start_trigger
  AFTER UPDATE ON public.procedures
  FOR EACH ROW
  WHEN (OLD.status = 'scheduled' AND NEW.status = 'in_progress')
  EXECUTE FUNCTION public.on_procedure_start();

-- Create smart material manager function
CREATE OR REPLACE FUNCTION public.smart_material_manager()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if quantity falls below threshold
  IF NEW.current_quantity < NEW.minimum_threshold AND NEW.auto_reorder = true THEN
    -- Create reorder notification for CEO/Lab Tech
    INSERT INTO public.notifications (
      notification_type,
      title,
      message,
      data,
      priority
    ) VALUES (
      'material_alert',
      'Material Reorder Required',
      'Item ' || COALESCE(NEW.name, 'Unknown') || ' (SKU: ' || COALESCE(NEW.sku, 'N/A') || ') is below minimum threshold.',
      jsonb_build_object(
        'sku', NEW.sku,
        'current_quantity', NEW.current_quantity,
        'minimum_threshold', NEW.minimum_threshold
      ),
      'high'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for smart material management
DROP TRIGGER IF EXISTS smart_material_trigger ON public.inventory_items;
CREATE TRIGGER smart_material_trigger
  AFTER UPDATE ON public.inventory_items
  FOR EACH ROW
  WHEN (OLD.current_quantity IS DISTINCT FROM NEW.current_quantity)
  EXECUTE FUNCTION public.smart_material_manager();

-- Create audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (
    table_name,
    record_id,
    action,
    old_values,
    new_values,
    user_id
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add audit triggers to critical tables
DROP TRIGGER IF EXISTS audit_patients ON public.patients;
DROP TRIGGER IF EXISTS audit_procedures ON public.procedures;
DROP TRIGGER IF EXISTS audit_analysis_reports ON public.analysis_reports;

CREATE TRIGGER audit_patients AFTER INSERT OR UPDATE OR DELETE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
CREATE TRIGGER audit_procedures AFTER INSERT OR UPDATE OR DELETE ON public.procedures FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
CREATE TRIGGER audit_analysis_reports AFTER INSERT OR UPDATE OR DELETE ON public.analysis_reports FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Enable realtime for new tables
ALTER TABLE public.procedures REPLICA IDENTITY FULL;
ALTER TABLE public.procedure_event_logs REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Add new tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.procedures;
ALTER PUBLICATION supabase_realtime ADD TABLE public.procedure_event_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Update existing sample data
UPDATE public.patients SET 
  first_name = 'John',
  last_name = 'Doe',
  email = 'john.doe@example.com',
  consent_vocal = true,
  consent_digital = true,
  gdpr_consent = true
WHERE patient_code = 'P001';

UPDATE public.patients SET 
  first_name = 'Jane',
  last_name = 'Smith',
  email = 'jane.smith@example.com',
  consent_vocal = true,
  consent_digital = true,
  gdpr_consent = true
WHERE patient_code = 'P002';

-- Update inventory items with proper SKUs
UPDATE public.inventory_items SET 
  sku = 'TI-001',
  name = 'Titanium Implant Grade 5',
  category = 'Implants'
WHERE name = 'Titanium Powder';

-- Insert sample procedures
INSERT INTO public.procedures (patient_id, procedure_type, status, scheduled_date) VALUES
((SELECT id FROM public.patients WHERE patient_code = 'P001'), 'Dental Crown Implant', 'scheduled', now() + interval '1 day'),
((SELECT id FROM public.patients WHERE patient_code = 'P002'), 'Hip Replacement', 'in_progress', now());

-- Insert sample notifications
INSERT INTO public.notifications (notification_type, title, message, priority) VALUES
('material_alert', 'Low Stock Alert', 'Titanium Implant Grade 5 stock is running low', 'high'),
('procedure_update', 'Surgery Scheduled', 'New procedure scheduled for Patient P001', 'normal');