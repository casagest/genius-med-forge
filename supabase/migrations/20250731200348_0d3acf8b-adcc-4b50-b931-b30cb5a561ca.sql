-- Update database functions to include proper search_path settings for security
CREATE OR REPLACE FUNCTION public.get_user_role(check_user_id uuid DEFAULT auth.uid())
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT role FROM public.user_roles 
  WHERE user_id = check_user_id 
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.has_role(check_user_id uuid, required_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = check_user_id AND role = required_role
  );
$function$;

-- Add security monitoring function to track suspicious activities
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type TEXT,
  event_data JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Log security events for monitoring
  INSERT INTO public.audit_logs (
    user_id,
    action,
    table_name,
    new_values,
    created_at
  ) VALUES (
    auth.uid(),
    'SECURITY_EVENT',
    event_type,
    event_data,
    now()
  );
END;
$function$;

-- Add function to check for rate limiting
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  action_type TEXT,
  time_window_minutes INTEGER DEFAULT 5,
  max_attempts INTEGER DEFAULT 10
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  attempt_count INTEGER;
BEGIN
  -- Count recent attempts for this user and action type
  SELECT COUNT(*) INTO attempt_count
  FROM public.audit_logs
  WHERE user_id = auth.uid()
    AND action = action_type
    AND created_at > (now() - (time_window_minutes || ' minutes')::interval);
  
  -- Return false if rate limit exceeded
  IF attempt_count >= max_attempts THEN
    -- Log the rate limit violation
    PERFORM public.log_security_event('RATE_LIMIT_EXCEEDED', 
      jsonb_build_object(
        'action_type', action_type,
        'attempt_count', attempt_count,
        'time_window_minutes', time_window_minutes,
        'max_attempts', max_attempts
      )
    );
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$function$;