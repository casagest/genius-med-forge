import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield } from 'lucide-react';

interface RoleGuardProps {
  allowedRoles: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleGuard({ allowedRoles, children, fallback }: RoleGuardProps) {
  const { userRole, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center p-4">Loading...</div>;
  }

  if (!userRole || !allowedRoles.includes(userRole)) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <Alert className="m-4">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to access this feature. Required roles: {allowedRoles.join(', ')}
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
}