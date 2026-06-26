import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';

const WorkspaceContext = createContext(null);
const STORAGE_KEY = 'tuesday_current_workspace';
const workspaceLoadPromiseRef = { current: null };

export function WorkspaceProvider({ children }) {
  const [user, setUser] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState(null);
  const [loading, setLoading] = useState(true);
  const isLoadingRef = useRef(false);
  const loadingTimeoutRef = useRef(null);

  const loadWorkspaceData = useCallback(async (userId) => {
    // Prevent duplicate concurrent requests
    if (isLoadingRef.current && workspaceLoadPromiseRef.current) {
      return workspaceLoadPromiseRef.current;
    }
    
    isLoadingRef.current = true;
    workspaceLoadPromiseRef.current = (async () => {
      try {
        const memberRecords = await base44.entities.WorkspaceMember.filter({ user: userId });
        const activeMemberships = memberRecords.filter(m => m.status === 'active');
        setMemberships(activeMemberships);

        const workspaceIds = [...new Set(activeMemberships.map(m => m.workspace).filter(Boolean))];
        let workspaceRecords = [];

        if (workspaceIds.length > 0) {
          const results = await Promise.all(
            workspaceIds.map(id => base44.entities.Workspace.get(id).catch(() => null))
          );
          workspaceRecords = results.filter(w => w && w.status !== 'archived');
        }

        setWorkspaces(workspaceRecords);
        return workspaceRecords;
      } finally {
        isLoadingRef.current = false;
      }
    })();
    
    return workspaceLoadPromiseRef.current;
  }, []);

  useEffect(() => {
    let mounted = true;
    let workspaceRecords = [];
    
    async function init() {
      try {
        console.log('[WORKSPACE] Initializing workspace context...');
        const me = await base44.auth.me();
        if (!mounted) return;
        setUser(me);
        console.log('[WORKSPACE] User loaded:', me.email);

        // Check for and accept any pending invitations
        console.log('[WORKSPACE] Checking for pending invitations...');
        try {
          const inviteResult = await base44.functions.invoke('acceptInvitation', {});
          console.log('[WORKSPACE] Invitation check result:', inviteResult);
          if (inviteResult?.workspaceMemberCreated) {
            console.log('[WORKSPACE] WorkspaceMember created/updated, reloading workspace data...');
          }
        } catch (inviteError) {
          console.error('[WORKSPACE] Invitation check failed:', inviteError);
          // Non-critical error, continue with workspace loading
        }

        workspaceRecords = await loadWorkspaceData(me.id);
        if (!mounted) return;
        
        console.log('[WORKSPACE] Found', workspaceRecords.length, 'workspaces');

        // Preserve last selected workspace during refresh - don't switch to null
        const saved = localStorage.getItem(STORAGE_KEY);
        const valid = saved && workspaceRecords.find(w => w.id === saved);
        if (valid) {
          console.log('[WORKSPACE] Restoring saved workspace:', saved);
          setCurrentWorkspaceId(saved);
        } else if (workspaceRecords.length > 0) {
          const firstValid = workspaceRecords[0].id;
          console.log('[WORKSPACE] Selecting first workspace:', firstValid);
          setCurrentWorkspaceId(firstValid);
          localStorage.setItem(STORAGE_KEY, firstValid);
        } else {
          console.log('[WORKSPACE] No workspaces found for user');
        }
        // If no workspaces found, keep currentWorkspaceId as null but don't clear saved value
      } catch (e) {
        console.error('[WORKSPACE] Workspace init error:', e);
        // On error, preserve saved workspace from localStorage
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && mounted) {
          console.log('[WORKSPACE] Error occurred, using saved workspace:', saved);
          setCurrentWorkspaceId(saved);
        }
      } finally {
        if (mounted) {
          // Clear any existing timeout
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
          }
          
          console.log('[WORKSPACE] Initialization complete, loading:', false);
          setLoading(false);
        }
      }
    }
    
    // Start initialization
    init();
    
    // Safety timeout: force loading to false after 10 seconds with fallback workspace selection
    loadingTimeoutRef.current = setTimeout(() => {
      console.warn('[WORKSPACE] Loading timeout reached, forcing loading state to false');
      if (mounted) {
        setLoading(false);
        // If still no workspace selected but we have workspaces, select the first one
        if (!currentWorkspaceId && workspaceRecords && workspaceRecords.length > 0) {
          console.log('[WORKSPACE] Timeout: selecting first available workspace');
          setCurrentWorkspaceId(workspaceRecords[0].id);
          localStorage.setItem(STORAGE_KEY, workspaceRecords[0].id);
        }
      }
    }, 10000);
    
    return () => { 
      mounted = false;
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  const switchWorkspace = useCallback((workspaceId) => {
    setCurrentWorkspaceId(workspaceId);
    localStorage.setItem(STORAGE_KEY, workspaceId);
  }, []);

  const refresh = useCallback(async () => {
    if (!user || isLoadingRef.current) return;
    try {
      const workspaceRecords = await loadWorkspaceData(user.id);
      if (!workspaceRecords.find(w => w.id === currentWorkspaceId) && workspaceRecords.length > 0) {
        setCurrentWorkspaceId(workspaceRecords[0].id);
        localStorage.setItem(STORAGE_KEY, workspaceRecords[0].id);
      }
    } catch (e) {
      console.error('Workspace refresh error:', e);
    }
  }, [user, currentWorkspaceId]);

  const createWorkspace = useCallback(async (data) => {
    const ws = await base44.entities.Workspace.create({
      ...data,
      owner: user.id,
      status: 'active',
    });
    await base44.entities.WorkspaceMember.create({
      workspace: ws.id,
      workspace_name: ws.workspace_name,
      user: user.id,
      user_name: user.full_name,
      user_email: user.email,
      role: 'workspace_owner',
      status: 'active',
      invited_by: user.id,
      created_by: user.id,
      joined_date: new Date().toISOString().split('T')[0],
    });
    await refresh();
    switchWorkspace(ws.id);
    return ws;
  }, [user, refresh, switchWorkspace]);

  const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId) || null;
  const currentMembership = memberships.find(m => m.workspace === currentWorkspaceId) || null;
  const currentWorkspaceRole = currentMembership?.role || (user?.role === 'admin' ? 'workspace_admin' : 'member');
  const isAdmin = user?.role === 'admin';

  const value = {
    user,
    workspaces,
    memberships,
    currentWorkspace,
    currentWorkspaceId,
    currentWorkspaceRole,
    switchWorkspace,
    createWorkspace,
    refresh,
    loading,
    isAdmin,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return ctx;
}