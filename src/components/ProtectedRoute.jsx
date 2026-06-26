import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AuthLoadingScreen from '@/components/shared/AuthLoadingScreen';
import AuthStatusScreen from '@/components/shared/AuthStatusScreen';
import { AlertCircle } from 'lucide-react';

const DefaultFallback = () => (
  <AuthLoadingScreen message="Loading your workspace..." />
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
    return (
      <AuthStatusScreen
        status="error"
        title="Workspace Loading Issue"
        description="We're having trouble loading your workspace. This might be because your invitation hasn't been fully processed yet."
        onRetry={handleRetry}
        onLogout={handleLogout}
        showActions={true}
      />
    );
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