import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }
  const [hasChecked, setHasChecked] = useState(false); // Prevent multiple checks
  const [hasAttemptedAuth, setHasAttemptedAuth] = useState(false); // Prevent auth retry

  useEffect(() => {
    // Auth is turned off (public app) - allow access immediately without requiring login.
    // If a token exists, we still validate it; otherwise we let the user through.
    setHasChecked(true);
    if (!appParams.token) {
      console.log('[AUTH] No token - public app mode, allowing access');
      setIsAuthenticated(true);
    }
    setIsLoadingAuth(false);
    setIsLoadingPublicSettings(false);
    setAuthChecked(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  const checkAppState = async () => {
    // Prevent running multiple times
    if (hasChecked || authError) {
      console.log('[AUTH] Skipping check - already checked or has error');
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      return;
    }
    
    try {
      setIsLoadingPublicSettings(true);
      setIsLoadingAuth(true);
      setAuthError(null);
      
      // First, check app public settings (with token if available)
      // This will tell us if auth is required, user not registered, etc.
      const appClient = createAxiosClient({
        baseURL: `/api/apps/public`,
        headers: {
          'X-App-Id': appParams.appId
        },
        token: appParams.token, // Include token if available
        interceptResponses: true
      });
      
      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);
        
        // If we got the app public settings successfully, check if user is authenticated
        if (appParams.token) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
          setAuthChecked(true);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        
        // Handle app-level errors
        if (appError?.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app'
            });
          } else {
            setAuthError({
              type: reason,
              message: appError.message
            });
          }
        } else {
          setAuthError({
            type: 'unknown',
            message: appError.message || 'Failed to load app'
          });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
        setAuthChecked(true);
      } finally {
        // Ensure loading states are always cleared
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
        setAuthChecked(true);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  const checkUserAuth = async () => {
    // Don't run if already checked and authenticated
    if (authChecked && isAuthenticated) {
      console.log('[AUTH] Already authenticated, skipping check');
      return;
    }
    
    try {
      console.log('[AUTH] Checking user authentication...');
      console.log('[AUTH] Token in appParams:', appParams.token ? 'present' : 'missing');
      setIsLoadingAuth(true);

      // If there's no token at all, the app is either public or user hasn't logged in.
      // Try base44.auth.me() - for public apps it may return null/throw; we treat
      // "no token" as "allow access" so public apps work without forcing login.
      if (!appParams.token) {
        console.log('[AUTH] No token found - allowing access (public app mode)');
        setUser(null);
        setIsAuthenticated(true); // Allow access for public apps
        setAuthError(null);
        return;
      }

      // Now check if the user is authenticated
      const currentUser = await base44.auth.me();
      console.log('[AUTH] User authenticated:', currentUser?.email, currentUser?.id);
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('[AUTH] User auth check failed:', error);
      setIsAuthenticated(false);
      
      // If user auth fails, it might be an expired token
      if (error?.status === 401 || error?.status === 403) {
        console.log('[AUTH] Authentication required - clearing invalid token');
        // Clear tokens from localStorage to prevent retry with bad token
        if (typeof window !== 'undefined') {
          localStorage.removeItem('base44_access_token');
          localStorage.removeItem('token');
        }
        // Clear the invalid token via SDK
        base44.auth.logout();
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      } else {
        console.error('[AUTH] Unexpected auth error:', error.message);
        // For non-auth errors (network, etc.), allow access rather than blocking
        console.log('[AUTH] Non-auth error - allowing access');
        setUser(null);
        setIsAuthenticated(true);
        setAuthError(null);
      }
    } finally {
      // Always clear loading states
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    setAuthError(null);
    setAuthChecked(false);
    setHasChecked(false);
    setHasAttemptedAuth(false); // Reset auth attempt flag
    
    // Explicitly clear token from localStorage to prevent stale token usage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('base44_access_token');
      localStorage.removeItem('token');
    }
    
    if (shouldRedirect) {
      // Use the SDK's logout method which handles token cleanup and redirect
      base44.auth.logout(window.location.href);
    } else {
      // Just remove the token without redirect
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    // Use the SDK's redirectToLogin method
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};