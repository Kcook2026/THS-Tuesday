import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const WorkspaceContext = createContext(null);
const STORAGE_KEY = 'tuesday_current_workspace';

export function WorkspaceProvider({ children }) {
  const [user, setUser] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadWorkspaceData = useCallback(async (userId) => {
    const memberRecords = await base44.entities.WorkspaceMember.filter({ user: userId });
    const activeMemberships = memberRecords.filter(m => m.status === 'active');
    setMemberships(activeMemberships);

    const workspaceIds = [...new Set(activeMemberships.map(m => m.workspace).filter(Boolean))];
    let workspaceRecords = [];

    if (workspaceIds.length > 0) {
      const results = await Promise.all(
        workspaceIds.map(id => base44.entities.Workspace.get(id).catch(() => null))
      );
      // Filter out archived workspaces
      workspaceRecords = results.filter(w => w && w.status !== 'archived');
    }

    setWorkspaces(workspaceRecords);
    return workspaceRecords;
  }, []);

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const me = await base44.auth.me();
        if (!mounted) return;
        setUser(me);

        const workspaceRecords = await loadWorkspaceData(me.id);
        if (!mounted) return;

        const saved = localStorage.getItem(STORAGE_KEY);
        const valid = saved && workspaceRecords.find(w => w.id === saved);
        if (valid) {
          setCurrentWorkspaceId(saved);
        } else if (workspaceRecords.length > 0) {
          setCurrentWorkspaceId(workspaceRecords[0].id);
          localStorage.setItem(STORAGE_KEY, workspaceRecords[0].id);
        }
      } catch (e) {
        // silent fail - pages will handle empty workspace
      } finally {
        if (mounted) setLoading(false);
      }
    }
    init();
    return () => { mounted = false; };
  }, [loadWorkspaceData]);

  const switchWorkspace = useCallback((workspaceId) => {
    setCurrentWorkspaceId(workspaceId);
    localStorage.setItem(STORAGE_KEY, workspaceId);
  }, []);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const workspaceRecords = await loadWorkspaceData(user.id);
      if (!workspaceRecords.find(w => w.id === currentWorkspaceId) && workspaceRecords.length > 0) {
        setCurrentWorkspaceId(workspaceRecords[0].id);
        localStorage.setItem(STORAGE_KEY, workspaceRecords[0].id);
      }
    } catch (e) {
      // silent
    }
  }, [user, currentWorkspaceId, loadWorkspaceData]);

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