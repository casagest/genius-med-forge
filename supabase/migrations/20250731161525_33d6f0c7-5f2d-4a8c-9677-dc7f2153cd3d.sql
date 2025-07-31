-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create patients table
CREATE TABLE public.patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_code TEXT NOT NULL UNIQUE,
  digital_twin_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create analysis_reports table for StrategicOps Panel
CREATE TABLE public.analysis_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type TEXT NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  analysis_data JSONB DEFAULT '{}',
  requires_action BOOLEAN DEFAULT false,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lab_production_queue table for NeuroFabric Cortex
CREATE TABLE public.lab_production_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_code TEXT NOT NULL UNIQUE,
  patient_id UUID REFERENCES public.patients(id),
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED')),
  priority INTEGER NOT NULL DEFAULT 1 CHECK (priority >= 1 AND priority <= 10),
  machine_assignment TEXT,
  estimated_duration TEXT,
  actual_duration TEXT,
  material_requirements JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lab_materials table for inventory management
CREATE TABLE public.lab_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material_name TEXT NOT NULL UNIQUE,
  current_stock INTEGER NOT NULL DEFAULT 0,
  minimum_threshold INTEGER NOT NULL DEFAULT 10,
  unit_cost DECIMAL(10,2) DEFAULT 0.00,
  supplier TEXT,
  last_ordered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_production_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_materials ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for patients (accessible to authenticated users)
CREATE POLICY "Authenticated users can view patients" ON public.patients FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage patients" ON public.patients FOR ALL USING (auth.role() = 'authenticated');

-- Create RLS policies for analysis_reports (accessible to authenticated users)
CREATE POLICY "Authenticated users can view reports" ON public.analysis_reports FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage reports" ON public.analysis_reports FOR ALL USING (auth.role() = 'authenticated');

-- Create RLS policies for lab_production_queue (accessible to authenticated users)
CREATE POLICY "Authenticated users can view lab queue" ON public.lab_production_queue FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage lab queue" ON public.lab_production_queue FOR ALL USING (auth.role() = 'authenticated');

-- Create RLS policies for lab_materials (accessible to authenticated users)
CREATE POLICY "Authenticated users can view materials" ON public.lab_materials FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage materials" ON public.lab_materials FOR ALL USING (auth.role() = 'authenticated');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lab_queue_updated_at BEFORE UPDATE ON public.lab_production_queue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON public.lab_materials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for all tables
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.patients REPLICA IDENTITY FULL;
ALTER TABLE public.analysis_reports REPLICA IDENTITY FULL;
ALTER TABLE public.lab_production_queue REPLICA IDENTITY FULL;
ALTER TABLE public.lab_materials REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.patients;
ALTER PUBLICATION supabase_realtime ADD TABLE public.analysis_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lab_production_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lab_materials;

-- Insert sample data
INSERT INTO public.patients (patient_code, digital_twin_id) VALUES
('P001', gen_random_uuid()),
('P002', gen_random_uuid()),
('P003', gen_random_uuid());

INSERT INTO public.analysis_reports (report_type, risk_level, confidence_score, requires_action) VALUES
('Surgical Risk Assessment', 'HIGH', 0.85, true),
('Material Compatibility Check', 'MEDIUM', 0.92, false),
('Bio-compatibility Analysis', 'CRITICAL', 0.78, true);

INSERT INTO public.lab_production_queue (job_code, patient_id, job_type, status, priority, machine_assignment, estimated_duration) VALUES
('LAB-001', (SELECT id FROM public.patients WHERE patient_code = 'P001'), 'Orthopedic Implant', 'IN_PROGRESS', 5, 'CAD_CAM_1', '2h 30m'),
('LAB-002', (SELECT id FROM public.patients WHERE patient_code = 'P002'), 'Dental Crown', 'PENDING', 3, 'PRINTER_A', '1h 15m'),
('LAB-003', (SELECT id FROM public.patients WHERE patient_code = 'P003'), 'Prosthetic Limb', 'COMPLETED', 8, 'MILL_B', '4h 45m');

INSERT INTO public.lab_materials (material_name, current_stock, minimum_threshold, unit_cost, supplier) VALUES
('Titanium Powder', 50, 20, 150.00, 'MetalTech Industries'),
('Biocompatible Resin', 25, 15, 89.50, 'BioMaterials Corp'),
('Ceramic Composite', 75, 30, 45.25, 'Advanced Ceramics Ltd');