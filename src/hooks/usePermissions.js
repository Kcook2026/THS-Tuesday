import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const ROLE_LABELS = {
  admin: 'Admin',
  executive: 'Executive',
  manager: 'Manager',
  team_member: 'Team Member',
  read_only: 'Read Only',
};

const ROLE_PERMISSIONS = {
  admin: {
    label: 'Admin',
    canCreate: true, canEdit: true, canDelete: true, canView: true,
    canManageUsers: true, canManageSettings: true, canManageSecurity: true,
    canManageWorkspaces: true, canInviteUsers: true,
    canManageBoards: true, canManageProcesses: true, canManageCustomFields: true,
    canCrossWorkspace: true,
  },
  executive: {
    label: 'Executive',
    canCreate: true, canEdit: true, canDelete: false, canView: true,
    canManageUsers: false, canManageSettings: false, canManageSecurity: false,
    canManageWorkspaces: true, canInviteUsers: true,
    canManageBoards: true, canManageProcesses: true, canManageCustomFields: true,
    canCrossWorkspace: true,
  },
  manager: {
    label: 'Manager',
    canCreate: true, canEdit: true, canDelete: false, canView: true,
    canManageUsers: false, canManageSettings: false, canManageSecurity: false,
    canManageWorkspaces: true, canInviteUsers: true,
    canManageBoards: true, canManageProcesses: true, canManageCustomFields: true,
    canCrossWorkspace: false,
  },
  team_member: {
    label: 'Team Member',
    canCreate: true, canEdit: true, canDelete: false, canView: true,
    canManageUsers: false, canManageSettings: false, canManageSecurity: false,
    canManageWorkspaces: false, canInviteUsers: false,
    canManageBoards: false, canManageProcesses: false, canManageCustomFields: false,
    canCrossWorkspace: false,
  },
  read_only: {
    label: 'Read Only',
    canCreate: false, canEdit: false, canDelete: false, canView: true,
    canManageUsers: false, canManageSettings: false, canManageSecurity: false,
    canManageWorkspaces: false, canInviteUsers: false,
    canManageBoards: false, canManageProcesses: false, canManageCustomFields: false,
    canCrossWorkspace: false,
  },
};

function normalizeRole(role) {
  if (role === 'user') return 'team_member';
  if (role && ROLE_PERMISSIONS[role]) return role;
  return 'team_member';
}

export default function usePermissions() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const rawRole = user?.role || 'team_member';
  const role = normalizeRole(rawRole);
  const permissions = ROLE_PERMISSIONS[role];
  const roleLabel = ROLE_LABELS[role] || 'Team Member';

  const can = useCallback((action) => {
    return Boolean(permissions[action]);
  }, [permissions]);

  const canAccess = useCallback((module) => {
    return Boolean(permissions[module]) || permissions.canView;
  }, [permissions]);

  return {
    user,
    role,
    roleLabel,
    permissions,
    can,
    canAccess,
    loading,
    isAdmin: role === 'admin',
    isManager: role === 'manager' || role === 'admin',
    canManage: role === 'admin' || role === 'executive' || role === 'manager',
  };
}

export { ROLE_PERMISSIONS, ROLE_LABELS };