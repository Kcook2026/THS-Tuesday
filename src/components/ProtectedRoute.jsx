import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

const DefaultFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      <p className="text-sm text-muted-foreground">Loading workspace...</p>
    </div>
  </div>
);

const LoadingTimeoutScreen = ({ onRetry, onLogout }) => (
  <div className="min-h-screen flex items-center justify-center bg-background p-4">
    <Card className="max-w-md w-full">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          <CardTitle>Workspace Loading Issue</CardTitle>
        </div>
        <CardDescription>
          We're having trouble loading your workspace. This might be because your account setup is still in progress.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-muted-foreground">
          <p className="mb-2">Possible causes:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Your invitation hasn't been fully processed</li>
            <li>No workspace memberships found</li>
            <li>Network connectivity issues</li>
          </ul>
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={onRetry} className="flex-1">
            Try Again
          </Button>
          <Button onClick={onLogout} variant="outline">
            Sign Out
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default function ProtectedRoute({ fallback = <DefaultFallback />, unauthenticatedElement }) {
  const { isAuthenticated, isLoadingAuth, authChecked, authError, checkUserAuth } = useAuth();
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  useEffect(() => {
    if (!authChecked && !isLoadingAuth) {
      checkUserAuth();
    }
  }, [authChecked, isLoadingAuth, checkUserAuth]);

  // Timeout guard: if loading takes more than 15 seconds, show error screen
  useEffect(() => {
    if (isLoadingAuth || !authChecked) {
      const timer = setTimeout(() => {
        console.warn('[PROTECTED_ROUTE] Loading timeout after 15 seconds');
        setLoadingTimeout(true);
      }, 15000);
      
      return () => clearTimeout(timer);
    }
  }, [isLoadingAuth, authChecked]);

  const handleRetry = () => {
    console.log('[PROTECTED_ROUTE] Retrying authentication...');
    setLoadingTimeout(false);
    checkUserAuth();
  };

  const handleLogout = () => {
    console.log('[PROTECTED_ROUTE] User chose to logout');
    window.location.href = '/login';
  };

  if (isLoadingAuth || !authChecked) {
    return fallback;
  }

  if (loadingTimeout) {
    return <LoadingTimeoutScreen onRetry={handleRetry} onLogout={handleLogout} />;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    return unauthenticatedElement;
  }

  if (!isAuthenticated) {
    return unauthenticatedElement;
  }

  return <Outlet />;
}