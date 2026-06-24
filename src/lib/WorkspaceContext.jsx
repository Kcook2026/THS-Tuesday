import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { logAudit, AUDIT_ACTIONS } from '@/lib/auditLogger';

const WorkspaceContext = createContext(null);
const STORAGE_KEY = 'tuesday_current_workspace';

export function WorkspaceProvider({ children }) {
  const [user, setUser] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const me = await base44.auth.me();
        if (!mounted) return;
        setUser(me);

        const memberRecords = await base44.asServiceRole.entities.WorkspaceMember.filter({ user: me.id });
        const activeMemberships = memberRecords.filter(m => m.status === 'active');
        if (!mounted) return;
        setMemberships(activeMemberships);

        const workspaceIds = [...new Set(activeMemberships.map(m => m.workspace).filter(Boolean))];
        let workspaceRecords = [];

        if (workspaceIds.length > 0) {
          const results = await Promise.all(
            workspaceIds.map(id => base44.asServiceRole.entities.Workspace.get(id).catch(() => null))
          );
          workspaceRecords = results.filter(Boolean);
        }

        if (workspaceRecords.length === 0 && me.role === 'admin') {
          const existing = await base44.asServiceRole.entities.Workspace.list();
          if (existing.length > 0) {
            workspaceRecords = existing;
          } else {
            const defaultWs = await base44.asServiceRole.entities.Workspace.create({
              workspace_name: 'Main Workspace',
              workspace_type: 'company_workspace',
              status: 'active',
              visibility: 'company',
              owner: me.id,
              color: 'violet',
              icon: 'Building2',
            });
            await base44.asServiceRole.entities.WorkspaceMember.create({
              workspace: defaultWs.id,
              workspace_name: defaultWs.workspace_name,
              user: me.id,
              user_name: me.full_name,
              user_email: me.email,
              role: 'workspace_admin',
              status: 'active',
              invited_by: me.id,
              joined_date: new Date().toISOString().split('T')[0],
            });
            workspaceRecords = [defaultWs];
          }
        }

        if (!mounted) return;
        setWorkspaces(workspaceRecords);

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
  }, []);

  const switchWorkspace = useCallback((workspaceId) => {
    const prevWorkspace = currentWorkspaceId;
    setCurrentWorkspaceId(workspaceId);
    localStorage.setItem(STORAGE_KEY, workspaceId);
    if (prevWorkspace && prevWorkspace !== workspaceId) {
      logAudit(AUDIT_ACTIONS.WORKSPACE_SWITCHED, {
        record_id: workspaceId,
        before_value: { workspace: prevWorkspace },
        after_value: { workspace: workspaceId },
      });
      const membership = memberships.find(m => m.workspace === workspaceId);
      if (membership) {
        base44.asServiceRole.entities.WorkspaceMember.update(membership.id, {
          last_active_date: new Date().toISOString().split('T')[0],
        }).catch(() => {});
      }
    }
  }, [currentWorkspaceId, memberships]);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const memberRecords = await base44.asServiceRole.entities.WorkspaceMember.filter({ user: user.id });
      const activeMemberships = memberRecords.filter(m => m.status === 'active');
      setMemberships(activeMemberships);

      const workspaceIds = [...new Set(activeMemberships.map(m => m.workspace).filter(Boolean))];
      let workspaceRecords = [];
      if (workspaceIds.length > 0) {
        const results = await Promise.all(
          workspaceIds.map(id => base44.asServiceRole.entities.Workspace.get(id).catch(() => null))
        );
        workspaceRecords = results.filter(Boolean);
      }
      setWorkspaces(workspaceRecords);

      if (!workspaceRecords.find(w => w.id === currentWorkspaceId) && workspaceRecords.length > 0) {
        setCurrentWorkspaceId(workspaceRecords[0].id);
        localStorage.setItem(STORAGE_KEY, workspaceRecords[0].id);
      }
    } catch (e) {
      // silent
    }
  }, [user, currentWorkspaceId]);

  const createWorkspace = useCallback(async (data) => {
    const ws = await base44.asServiceRole.entities.Workspace.create({
      ...data,
      owner: user.id,
      status: 'active',
    });
    await base44.asServiceRole.entities.WorkspaceMember.create({
      workspace: ws.id,
      workspace_name: ws.workspace_name,
      user: user.id,
      user_name: user.full_name,
      user_email: user.email,
      role: 'workspace_admin',
      status: 'active',
      invited_by: user.id,
      joined_date: new Date().toISOString().split('T')[0],
    });
    logAudit(AUDIT_ACTIONS.WORKSPACE_CREATED, {
      record_id: ws.id,
      after_value: { workspace_name: ws.workspace_name, workspace_type: ws.workspace_type },
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