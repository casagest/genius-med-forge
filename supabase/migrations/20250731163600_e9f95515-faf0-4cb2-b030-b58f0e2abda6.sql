-- Phase 1: Complete Database Schema for Medical AI System
-- Drop existing tables if they need restructuring
DROP TABLE IF EXISTS public.analysis_reports CASCADE;
DROP TABLE IF EXISTS public.lab_production_queue CASCADE;
DROP TABLE IF EXISTS public.lab_materials CASCADE;

-- Create comprehensive Patient table
CREATE TABLE public.patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_code TEXT NOT NULL UNIQUE,
  digital_twin_id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('M', 'F', 'Other')),
  medical_history JSONB DEFAULT '{}',
  allergies TEXT[],
  emergency_contact JSONB DEFAULT '{}',
  consent_vocal BOOLEAN DEFAULT false,
  consent_digital BOOLEAN DEFAULT false,
  consent_timestamp TIMESTAMP WITH TIME ZONE,
  gdpr_consent BOOLEAN DEFAULT false,
  files_urls TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Procedure table
CREATE TABLE public.procedures (
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
CREATE TABLE public.procedure_event_logs (
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

-- Create AnalysisReport table
CREATE TABLE public.analysis_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  procedure_id UUID REFERENCES public.procedures(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  risk_score DECIMAL(3,2) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 1),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  action_required BOOLEAN DEFAULT false,
  rationale TEXT,
  analysis_data JSONB DEFAULT '{}',
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  ai_model_used TEXT,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Create InventoryItem table (Smart Material Manager)
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  current_quantity INTEGER NOT NULL DEFAULT 0,
  minimum_threshold INTEGER NOT NULL DEFAULT 10,
  maximum_capacity INTEGER,
  unit_cost DECIMAL(10,2) DEFAULT 0.00,
  supplier TEXT,
  expiry_date DATE,
  batch_number TEXT,
  auto_reorder BOOLEAN DEFAULT true,
  last_reorder_date TIMESTAMP WITH TIME ZONE,
  storage_location TEXT,
  material_properties JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ProductionJob table (NeuroFabric Production Cortex)
CREATE TABLE public.production_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_code TEXT NOT NULL UNIQUE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  procedure_id UUID REFERENCES public.procedures(id) ON DELETE SET NULL,
  job_type TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
  machine_assigned TEXT,
  estimated_duration INTERVAL,
  actual_duration INTERVAL,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  material_requirements JSONB DEFAULT '{}',
  quality_check_passed BOOLEAN,
  failure_reason TEXT,
  output_files TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create audit log table for GDPR compliance
CREATE TABLE public.audit_logs (
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
CREATE TABLE public.notifications (
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

-- Enable Row Level Security on all tables
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedure_event_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE user_id = user_uuid;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- RLS Policies for patients
CREATE POLICY "CEOs and medics can view all patients" ON public.patients
  FOR SELECT USING (public.get_user_role(auth.uid()) IN ('CEO', 'MEDIC', 'LAB_TECH'));

CREATE POLICY "Patients can view their own data" ON public.patients
  FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'PATIENT' 
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND email = patients.email
    )
  );

CREATE POLICY "Medics can manage patients" ON public.patients
  FOR ALL USING (public.get_user_role(auth.uid()) IN ('CEO', 'MEDIC'));

-- RLS Policies for procedures
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

-- RLS Policies for procedure event logs
CREATE POLICY "Medical staff can view event logs" ON public.procedure_event_logs
  FOR SELECT USING (public.get_user_role(auth.uid()) IN ('CEO', 'MEDIC', 'LAB_TECH'));

CREATE POLICY "Medical staff can add event logs" ON public.procedure_event_logs
  FOR INSERT WITH CHECK (public.get_user_role(auth.uid()) IN ('MEDIC', 'LAB_TECH'));

-- RLS Policies for analysis reports
CREATE POLICY "Medical staff can view analysis reports" ON public.analysis_reports
  FOR SELECT USING (public.get_user_role(auth.uid()) IN ('CEO', 'MEDIC', 'LAB_TECH'));

CREATE POLICY "AI systems can create reports" ON public.analysis_reports
  FOR INSERT WITH CHECK (true); -- Allow AI systems to insert

-- RLS Policies for inventory
CREATE POLICY "Lab staff can manage inventory" ON public.inventory_items
  FOR ALL USING (public.get_user_role(auth.uid()) IN ('CEO', 'LAB_TECH'));

CREATE POLICY "Medics can view inventory" ON public.inventory_items
  FOR SELECT USING (public.get_user_role(auth.uid()) IN ('CEO', 'MEDIC', 'LAB_TECH'));

-- RLS Policies for production jobs
CREATE POLICY "Lab staff can manage production" ON public.production_jobs
  FOR ALL USING (public.get_user_role(auth.uid()) IN ('CEO', 'LAB_TECH'));

CREATE POLICY "Medics can view production" ON public.production_jobs
  FOR SELECT USING (public.get_user_role(auth.uid()) IN ('CEO', 'MEDIC', 'LAB_TECH'));

-- RLS Policies for notifications
CREATE POLICY "Users can view their notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- RLS Policies for audit logs (read-only for authorized users)
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'CEO');

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_procedures_updated_at BEFORE UPDATE ON public.procedures FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_production_updated_at BEFORE UPDATE ON public.production_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

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
CREATE TRIGGER audit_patients AFTER INSERT OR UPDATE OR DELETE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
CREATE TRIGGER audit_procedures AFTER INSERT OR UPDATE OR DELETE ON public.procedures FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
CREATE TRIGGER audit_analysis_reports AFTER INSERT OR UPDATE OR DELETE ON public.analysis_reports FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

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
  
  -- Create notification
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
    -- Create reorder notification
    INSERT INTO public.notifications (
      notification_type,
      title,
      message,
      data,
      priority
    ) VALUES (
      'material_alert',
      'Material Reorder Required',
      'Item ' || NEW.name || ' (SKU: ' || NEW.sku || ') is below minimum threshold.',
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
CREATE TRIGGER smart_material_trigger
  AFTER UPDATE ON public.inventory_items
  FOR EACH ROW
  WHEN (OLD.current_quantity IS DISTINCT FROM NEW.current_quantity)
  EXECUTE FUNCTION public.smart_material_manager();

-- Enable realtime for all tables
ALTER TABLE public.patients REPLICA IDENTITY FULL;
ALTER TABLE public.procedures REPLICA IDENTITY FULL;
ALTER TABLE public.procedure_event_logs REPLICA IDENTITY FULL;
ALTER TABLE public.analysis_reports REPLICA IDENTITY FULL;
ALTER TABLE public.inventory_items REPLICA IDENTITY FULL;
ALTER TABLE public.production_jobs REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.patients;
ALTER PUBLICATION supabase_realtime ADD TABLE public.procedures;
ALTER PUBLICATION supabase_realtime ADD TABLE public.procedure_event_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.analysis_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.production_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Insert sample data for testing
INSERT INTO public.patients (patient_code, first_name, last_name, email, phone, consent_vocal, consent_digital, gdpr_consent) VALUES
('P001', 'John', 'Doe', 'john.doe@example.com', '+1234567890', true, true, true),
('P002', 'Jane', 'Smith', 'jane.smith@example.com', '+1234567891', true, true, true),
('P003', 'Robert', 'Johnson', 'robert.j@example.com', '+1234567892', false, true, true);

INSERT INTO public.inventory_items (sku, name, category, current_quantity, minimum_threshold, unit_cost, supplier) VALUES
('TI-001', 'Titanium Implant Grade 5', 'Implants', 15, 20, 1500.00, 'TitaniumTech Ltd'),
('BIO-002', 'Biocompatible Resin Clear', 'Materials', 25, 15, 89.50, 'BioMaterials Corp'),
('CER-003', 'Ceramic Composite Medical', 'Materials', 75, 30, 45.25, 'Advanced Ceramics'),
('TOOL-004', 'Surgical Drill Bit Set', 'Tools', 5, 10, 250.00, 'MedTools Inc');

INSERT INTO public.production_jobs (job_code, patient_id, job_type, priority, machine_assigned, estimated_duration) VALUES
('JOB-001', (SELECT id FROM public.patients WHERE patient_code = 'P001'), 'Dental Crown', 8, 'CAD_CAM_1', '2 hours'),
('JOB-002', (SELECT id FROM public.patients WHERE patient_code = 'P002'), 'Hip Implant', 10, 'MILL_B', '4 hours'),
('JOB-003', (SELECT id FROM public.patients WHERE patient_code = 'P003'), 'Prosthetic Limb', 6, 'PRINTER_A', '6 hours');