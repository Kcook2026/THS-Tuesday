import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const ROLE_PERMISSIONS = {
  admin: {
    canCreate: true, canEdit: true, canDelete: true, canView: true,
    canManageUsers: true, canManageSettings: true, canManageBoards: true,
    canManageProcesses: true, canManageCustomFields: true,
    modules: ['dashboard', 'projects', 'tasks', 'calendar', 'teams', 'clients', 'documents', 'reports', 'activity', 'workboards', 'processes', 'notifications']
  },
  manager: {
    canCreate: true, canEdit: true, canDelete: false, canView: true,
    canManageUsers: false, canManageSettings: false, canManageBoards: true,
    canManageProcesses: true, canManageCustomFields: true,
    modules: ['dashboard', 'projects', 'tasks', 'calendar', 'teams', 'clients', 'documents', 'reports', 'activity', 'workboards', 'processes']
  },
  user: {
    canCreate: false, canEdit: true, canDelete: false, canView: true,
    canManageUsers: false, canManageSettings: false, canManageBoards: false,
    canManageProcesses: false, canManageCustomFields: false,
    modules: ['dashboard', 'projects', 'tasks', 'calendar', 'clients', 'documents', 'reports', 'activity', 'workboards']
  },
  read_only: {
    canCreate: false, canEdit: false, canDelete: false, canView: true,
    canManageUsers: false, canManageSettings: false, canManageBoards: false,
    canManageProcesses: false, canManageCustomFields: false,
    modules: ['dashboard', 'projects', 'tasks', 'calendar', 'clients', 'documents', 'reports', 'activity', 'workboards']
  }
};

export default function usePermissions() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const role = user?.role || 'user';
  const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.user;

  const can = useCallback((action) => {
    return Boolean(permissions[action]);
  }, [permissions]);

  const canAccess = useCallback((module) => {
    return permissions.modules.includes(module);
  }, [permissions]);

  return { user, role, permissions, can, canAccess, loading };
}