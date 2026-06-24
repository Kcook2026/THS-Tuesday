import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/lib/WorkspaceContext';

const WORKSPACE_ROLE_PERMISSIONS = {
  workspace_admin: {
    label: 'Workspace Admin',
    canManageWorkspace: true,
    canManageMembers: true,
    canManageSettings: true,
    canCreateWorkboards: true,
    canAccessAllWorkboards: true,
    canManageWorkboardAccess: true,
  },
  manager: {
    label: 'Manager',
    canManageWorkspace: false,
    canManageMembers: true,
    canManageSettings: false,
    canCreateWorkboards: true,
    canAccessAllWorkboards: true,
    canManageWorkboardAccess: false,
  },
  member: {
    label: 'Member',
    canManageWorkspace: false,
    canManageMembers: false,
    canManageSettings: false,
    canCreateWorkboards: false,
    canAccessAllWorkboards: false,
    canManageWorkboardAccess: false,
  },
  viewer: {
    label: 'Viewer',
    canManageWorkspace: false,
    canManageMembers: false,
    canManageSettings: false,
    canCreateWorkboards: false,
    canAccessAllWorkboards: false,
    canManageWorkboardAccess: false,
  },
};

const WORKBOARD_ROLE_PERMISSIONS = {
  owner: {
    label: 'Owner',
    canEdit: true,
    canDelete: true,
    canManageMembers: true,
    canManageSettings: true,
    canManageAccess: true,
  },
  editor: {
    label: 'Editor',
    canEdit: true,
    canDelete: false,
    canManageMembers: false,
    canManageSettings: false,
    canManageAccess: false,
  },
  member: {
    label: 'Member',
    canEdit: true,
    canDelete: false,
    canManageMembers: false,
    canManageSettings: false,
    canManageAccess: false,
  },
  viewer: {
    label: 'Viewer',
    canEdit: false,
    canDelete: false,
    canManageMembers: false,
    canManageSettings: false,
    canManageAccess: false,
  },
};

export default function usePermissions() {
  const { user, currentWorkspaceId, currentWorkspace } = useWorkspace();
  const [workspaceMember, setWorkspaceMember] = useState(null);
  const [workboardMemberships, setWorkboardMemberships] = useState({});
  const [loading, setLoading] = useState(true);
  const [accessibleWorkboards, setAccessibleWorkboards] = useState([]);

  useEffect(() => {
    if (!user || !currentWorkspaceId) {
      setLoading(false);
      return;
    }

    const loadPermissions = async () => {
      try {
        const [wsMember, wbMembers] = await Promise.all([
          base44.entities.WorkspaceMember.filter({ 
            workspace: currentWorkspaceId, 
            user: user.id 
          }).then(members => members[0] || null),
          base44.entities.WorkboardMember.filter({ 
            workspace: currentWorkspaceId, 
            user: user.id,
            status: 'active'
          }),
        ]);

        setWorkspaceMember(wsMember);
        
        const wbMap = {};
        wbMembers.forEach(m => {
          wbMap[m.workboard] = m;
        });
        setWorkboardMemberships(wbMap);
        setAccessibleWorkboards(wbMembers.map(m => m.workboard));
      } catch (error) {
        console.error('Error loading permissions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, [user, currentWorkspaceId]);

  const workspaceRole = workspaceMember?.role || user?.role || 'viewer';
  const wsPermissions = WORKSPACE_ROLE_PERMISSIONS[workspaceRole] || WORKSPACE_ROLE_PERMISSIONS.viewer;

  const canAccessWorkboard = useCallback((workboardId) => {
    if (!currentWorkspaceId || !workboardId) return false;
    
    if (wsPermissions.canAccessAllWorkboards) return true;
    
    if (workspaceMember?.access_type === 'selected_workboards') {
      return workspaceMember.accessible_workboards?.includes(workboardId);
    }
    
    return workboardMemberships[workboardId] !== undefined;
  }, [workspaceMember, workboardMemberships, wsPermissions, currentWorkspaceId]);

  const getWorkboardPermissions = useCallback((workboardId) => {
    const membership = workboardMemberships[workboardId];
    if (!membership) return WORKBOARD_ROLE_PERMISSIONS.viewer;
    return WORKBOARD_ROLE_PERMISSIONS[membership.role] || WORKBOARD_ROLE_PERMISSIONS.viewer;
  }, [workboardMemberships]);

  const can = useCallback((action) => {
    return Boolean(wsPermissions[action]);
  }, [wsPermissions]);

  const canManageWorkboard = useCallback((workboardId) => {
    const membership = workboardMemberships[workboardId];
    if (!membership) return false;
    return membership.role === 'owner' || wsPermissions.canManageWorkboardAccess;
  }, [workboardMemberships, wsPermissions]);

  return {
    user,
    workspaceRole,
    workspaceRoleLabel: wsPermissions.label,
    workspacePermissions: wsPermissions,
    can,
    canAccessWorkboard,
    getWorkboardPermissions,
    canManageWorkboard,
    accessibleWorkboards,
    loading,
    isAdmin: workspaceRole === 'workspace_admin',
    isManager: workspaceRole === 'manager' || workspaceRole === 'workspace_admin',
    canManage: wsPermissions.canManageMembers || wsPermissions.canManageWorkspace,
    workspaceMember,
    workboardMemberships,
  };
}

export { WORKSPACE_ROLE_PERMISSIONS, WORKBOARD_ROLE_PERMISSIONS };