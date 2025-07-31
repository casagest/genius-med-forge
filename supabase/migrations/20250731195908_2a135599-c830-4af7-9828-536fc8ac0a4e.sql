-- EMERGENCY SECURITY FIXES FOR CRITICAL VULNERABILITIES

-- 1. Create user roles enum and table for proper RBAC
CREATE TYPE public.app_role AS ENUM ('ceo', 'lab_technician', 'medic', 'admin');

CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Create security definer function to check roles safely (prevents infinite recursion)
CREATE OR REPLACE FUNCTION public.get_user_role(check_user_id UUID DEFAULT auth.uid())
RETURNS app_role
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.user_roles 
  WHERE user_id = check_user_id 
  LIMIT 1;
$$;

-- 3. Create helper function to check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(check_user_id UUID, required_role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = check_user_id AND role = required_role
  );
$$;

-- 4. FIX CRITICAL VULNERABILITY: Replace dangerous "view all profiles" policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- New secure policies for profiles table
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins and CEOs can view all profiles" 
ON public.profiles FOR SELECT 
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'ceo'::app_role)
);

-- 5. FIX MEDICAL DATA ACCESS: Replace overly permissive policies

-- Analysis Reports - Only CEOs and Admins should see all, others see none
DROP POLICY IF EXISTS "Authenticated users can view reports" ON public.analysis_reports;
DROP POLICY IF EXISTS "Authenticated users can manage reports" ON public.analysis_reports;

CREATE POLICY "CEOs and Admins can view analysis reports" 
ON public.analysis_reports FOR SELECT 
USING (
  public.has_role(auth.uid(), 'ceo'::app_role) OR 
  public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "CEOs and Admins can manage analysis reports" 
ON public.analysis_reports FOR ALL 
USING (
  public.has_role(auth.uid(), 'ceo'::app_role) OR 
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Active Procedures - Only Medical staff should access
DROP POLICY IF EXISTS "Authenticated users can manage active procedures" ON public.active_procedures;

CREATE POLICY "Medical staff can view active procedures" 
ON public.active_procedures FOR SELECT 
USING (
  public.has_role(auth.uid(), 'medic'::app_role) OR 
  public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Medical staff can manage active procedures" 
ON public.active_procedures FOR ALL 
USING (
  public.has_role(auth.uid(), 'medic'::app_role) OR 
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Lab Materials - Only Lab staff should access
DROP POLICY IF EXISTS "Authenticated users can view materials" ON public.lab_materials;
DROP POLICY IF EXISTS "Authenticated users can manage materials" ON public.lab_materials;

CREATE POLICY "Lab staff can view materials" 
ON public.lab_materials FOR SELECT 
USING (
  public.has_role(auth.uid(), 'lab_technician'::app_role) OR 
  public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Lab staff can manage materials" 
ON public.lab_materials FOR ALL 
USING (
  public.has_role(auth.uid(), 'lab_technician'::app_role) OR 
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Lab Production Queue - Only Lab staff should access
DROP POLICY IF EXISTS "Authenticated users can view lab queue" ON public.lab_production_queue;
DROP POLICY IF EXISTS "Authenticated users can manage lab queue" ON public.lab_production_queue;

CREATE POLICY "Lab staff can view production queue" 
ON public.lab_production_queue FOR SELECT 
USING (
  public.has_role(auth.uid(), 'lab_technician'::app_role) OR 
  public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Lab staff can manage production queue" 
ON public.lab_production_queue FOR ALL 
USING (
  public.has_role(auth.uid(), 'lab_technician'::app_role) OR 
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Patients - Only Medical staff should access
DROP POLICY IF EXISTS "Authenticated users can view patients" ON public.patients;
DROP POLICY IF EXISTS "Authenticated users can manage patients" ON public.patients;

CREATE POLICY "Medical staff can view patients" 
ON public.patients FOR SELECT 
USING (
  public.has_role(auth.uid(), 'medic'::app_role) OR 
  public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Medical staff can manage patients" 
ON public.patients FOR ALL 
USING (
  public.has_role(auth.uid(), 'medic'::app_role) OR 
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Procedure Events - Only Medical staff should access
DROP POLICY IF EXISTS "Authenticated users can manage procedure events" ON public.procedure_events;

CREATE POLICY "Medical staff can view procedure events" 
ON public.procedure_events FOR SELECT 
USING (
  public.has_role(auth.uid(), 'medic'::app_role) OR 
  public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Medical staff can manage procedure events" 
ON public.procedure_events FOR ALL 
USING (
  public.has_role(auth.uid(), 'medic'::app_role) OR 
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- 6. Fix database function security - add search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

-- 7. Create user roles policies
CREATE POLICY "Users can view their own roles" 
ON public.user_roles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" 
ON public.user_roles FOR ALL 
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 8. Create audit log table for medical compliance
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view audit logs" 
ON public.audit_logs FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values)
        VALUES (auth.uid(), 'DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values, new_values)
        VALUES (auth.uid(), 'UPDATE', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values)
        VALUES (auth.uid(), 'INSERT', TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

-- Add audit triggers to sensitive tables
CREATE TRIGGER audit_patients AFTER INSERT OR UPDATE OR DELETE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE TRIGGER audit_procedures AFTER INSERT OR UPDATE OR DELETE ON public.active_procedures FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE TRIGGER audit_procedure_events AFTER INSERT OR UPDATE OR DELETE ON public.procedure_events FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();