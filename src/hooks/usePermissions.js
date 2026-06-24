import { useState, useEffect, useCallback, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/lib/WorkspaceContext';

// =====================================================
// ACCOUNT ROLE PERMISSIONS
// =====================================================
const ACCOUNT_ROLE_PERMISSIONS = {
  system_admin: {
    label: 'System Admin',
    level: 5,
    canManageUsers: true,
    canManageWorkspaces: true,
    canManageSecurity: true,
    canManageAuthentication: true,
    canManageEntraSettings: true,
    canManageIntegrations: true,
    canManageAllAutomations: true,
    canManagePermissions: true,
    canViewAuditLogs: true,
    canViewAllWorkspaces: true,
    canViewAllWorkboards: true,
    canModifySystemSettings: true,
    canCreateOrganizationAutomations: true,
    canCreateWorkspaceAutomations: true,
    canCreateWorkboardAutomations: true,
    canCreatePersonalAutomations: true,
    automationScope: 'all',
  },
  executive: {
    label: 'Executive',
    level: 4,
    canManageUsers: false,
    canManageWorkspaces: false,
    canManageSecurity: false,
    canManageAuthentication: false,
    canManageEntraSettings: false,
    canManageIntegrations: false,
    canManageAllAutomations: false,
    canManagePermissions: false,
    canViewAuditLogs: true,
    canViewAllWorkspaces: true,
    canViewAllWorkboards: true,
    canModifySystemSettings: false,
    canCreateOrganizationAutomations: true,
    canCreateWorkspaceAutomations: true,
    canCreateWorkboardAutomations: true,
    canCreatePersonalAutomations: true,
    automationScope: 'organization',
  },
  manager: {
    label: 'Manager',
    level: 3,
    canManageUsers: false,
    canManageWorkspaces: false,
    canManageSecurity: false,
    canManageAuthentication: false,
    canManageEntraSettings: false,
    canManageIntegrations: false,
    canManageAllAutomations: false,
    canManagePermissions: false,
    canViewAuditLogs: false,
    canViewAllWorkspaces: false,
    canViewAllWorkboards: false,
    canModifySystemSettings: false,
    canCreateOrganizationAutomations: false,
    canCreateWorkspaceAutomations: true,
    canCreateWorkboardAutomations: true,
    canCreatePersonalAutomations: true,
    automationScope: 'workspace',
  },
  member: {
    label: 'Member',
    level: 2,
    canManageUsers: false,
    canManageWorkspaces: false,
    canManageSecurity: false,
    canManageAuthentication: false,
    canManageEntraSettings: false,
    canManageIntegrations: false,
    canManageAllAutomations: false,
    canManagePermissions: false,
    canViewAuditLogs: false,
    canViewAllWorkspaces: false,
    canViewAllWorkboards: false,
    canModifySystemSettings: false,
    canCreateOrganizationAutomations: false,
    canCreateWorkspaceAutomations: false,
    canCreateWorkboardAutomations: true,
    canCreatePersonalAutomations: true,
    automationScope: 'workboard',
  },
  viewer: {
    label: 'Viewer',
    level: 1,
    canManageUsers: false,
    canManageWorkspaces: false,
    canManageSecurity: false,
    canManageAuthentication: false,
    canManageEntraSettings: false,
    canManageIntegrations: false,
    canManageAllAutomations: false,
    canManagePermissions: false,
    canViewAuditLogs: false,
    canViewAllWorkspaces: false,
    canViewAllWorkboards: false,
    canModifySystemSettings: false,
    canCreateOrganizationAutomations: false,
    canCreateWorkspaceAutomations: false,
    canCreateWorkboardAutomations: false,
    canCreatePersonalAutomations: false,
    automationScope: 'none',
  },
};

// =====================================================
// WORKSPACE ROLE PERMISSIONS
// =====================================================
const WORKSPACE_ROLE_PERMISSIONS = {
  workspace_owner: {
    label: 'Workspace Owner',
    level: 5,
    canManageWorkspace: true,
    canInviteUsers: true,
    canRemoveUsers: true,
    canCreateWorkboards: true,
    canManageWorkspaceSettings: true,
    canAssignWorkspaceRoles: true,
    canConfigurePermissions: true,
    canManageWorkspaceAutomations: true,
    canAccessAllWorkboards: true,
    canManageWorkboardAccess: true,
  },
  workspace_manager: {
    label: 'Workspace Manager',
    level: 4,
    canManageWorkspace: false,
    canInviteUsers: true,
    canRemoveUsers: false,
    canCreateWorkboards: true,
    canManageWorkspaceSettings: false,
    canAssignWorkspaceRoles: false,
    canConfigurePermissions: false,
    canManageWorkspaceAutomations: true,
    canAccessAllWorkboards: true,
    canManageWorkboardAccess: false,
  },
  workspace_member: {
    label: 'Workspace Member',
    level: 3,
    canManageWorkspace: false,
    canInviteUsers: false,
    canRemoveUsers: false,
    canCreateWorkboards: false,
    canManageWorkspaceSettings: false,
    canAssignWorkspaceRoles: false,
    canConfigurePermissions: false,
    canManageWorkspaceAutomations: false,
    canAccessAllWorkboards: false,
    canManageWorkboardAccess: false,
  },
  workspace_viewer: {
    label: 'Workspace Viewer',
    level: 2,
    canManageWorkspace: false,
    canInviteUsers: false,
    canRemoveUsers: false,
    canCreateWorkboards: false,
    canManageWorkspaceSettings: false,
    canAssignWorkspaceRoles: false,
    canConfigurePermissions: false,
    canManageWorkspaceAutomations: false,
    canAccessAllWorkboards: false,
    canManageWorkboardAccess: false,
  },
  workspace_observer: {
    label: 'Workspace Observer',
    level: 2,
    canManageWorkspace: false,
    canInviteUsers: false,
    canRemoveUsers: false,
    canCreateWorkboards: false,
    canManageWorkspaceSettings: false,
    canAssignWorkspaceRoles: false,
    canConfigurePermissions: false,
    canManageWorkspaceAutomations: false,
    canAccessAllWorkboards: false,
    canManageWorkboardAccess: false,
    readOnly: true,
  },
};

// =====================================================
// WORKBOARD ROLE PERMISSIONS
// =====================================================
const WORKBOARD_ROLE_PERMISSIONS = {
  workboard_owner: {
    label: 'Workboard Owner',
    level: 5,
    canEdit: true,
    canDelete: true,
    canCreateItems: true,
    canEditItems: true,
    canDeleteItems: true,
    canManageMembers: true,
    canManageSettings: true,
    canManageAccess: true,
    canManageColumns: true,
    canManageGroups: true,
    canManageStatuses: true,
    canManagePriorities: true,
    canChangeVisibility: true,
    canManageBoardAutomations: true,
    canCreateSubItems: true,
    canUploadFiles: true,
    canComment: true,
  },
  workboard_editor: {
    label: 'Workboard Editor',
    level: 4,
    canEdit: true,
    canDelete: false,
    canCreateItems: true,
    canEditItems: true,
    canDeleteItems: false,
    canManageMembers: false,
    canManageSettings: false,
    canManageAccess: false,
    canManageColumns: false,
    canManageGroups: false,
    canManageStatuses: false,
    canManagePriorities: false,
    canChangeVisibility: false,
    canManageBoardAutomations: true,
    canCreateSubItems: true,
    canUploadFiles: true,
    canComment: true,
  },
  workboard_contributor: {
    label: 'Workboard Contributor',
    level: 3,
    canEdit: true,
    canDelete: false,
    canCreateItems: true,
    canEditItems: true,
    canDeleteItems: false,
    canManageMembers: false,
    canManageSettings: false,
    canManageAccess: false,
    canManageColumns: false,
    canManageGroups: false,
    canManageStatuses: false,
    canManagePriorities: false,
    canChangeVisibility: false,
    canManageBoardAutomations: false,
    canCreateSubItems: true,
    canUploadFiles: true,
    canComment: true,
    canEditAssignedItems: true,
    canEditOwnedItems: true,
  },
  assigned_contributor: {
    label: 'Assigned Contributor',
    level: 2,
    canEdit: false,
    canDelete: false,
    canCreateItems: false,
    canEditItems: false,
    canDeleteItems: false,
    canManageMembers: false,
    canManageSettings: false,
    canManageAccess: false,
    canManageColumns: false,
    canManageGroups: false,
    canManageStatuses: false,
    canManagePriorities: false,
    canChangeVisibility: false,
    canManageBoardAutomations: false,
    canCreateSubItems: false,
    canUploadFiles: true,
    canComment: true,
    canEditAssignedItems: true,
    canEditOwnedItems: false,
  },
  workboard_viewer: {
    label: 'Workboard Viewer',
    level: 1,
    canEdit: false,
    canDelete: false,
    canCreateItems: false,
    canEditItems: false,
    canDeleteItems: false,
    canManageMembers: false,
    canManageSettings: false,
    canManageAccess: false,
    canManageColumns: false,
    canManageGroups: false,
    canManageStatuses: false,
    canManagePriorities: false,
    canChangeVisibility: false,
    canManageBoardAutomations: false,
    canCreateSubItems: false,
    canUploadFiles: false,
    canComment: false,
    canEditAssignedItems: false,
    canEditOwnedItems: false,
    readOnly: true,
  },
};

// =====================================================
// PERMISSION HOOK
// =====================================================
export default function usePermissions() {
  const { user, currentWorkspaceId, currentWorkspace, isAdmin: isAppAdmin } = useWorkspace();
  const [accountRole, setAccountRole] = useState(null);
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
        const [userAccount, wsMember, wbMembers] = await Promise.all([
          base44.entities.User.get(user.id).catch(() => user),
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

        setAccountRole(userAccount?.account_role || 'member');
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

  // Get account role permissions
  const accountPermissions = useMemo(() => 
    ACCOUNT_ROLE_PERMISSIONS[accountRole] || ACCOUNT_ROLE_PERMISSIONS.member,
    [accountRole]
  );

  // Get workspace role permissions
  const workspaceRole = workspaceMember?.role || 'workspace_member';
  const wsPermissions = useMemo(() => 
    WORKSPACE_ROLE_PERMISSIONS[workspaceRole] || WORKSPACE_ROLE_PERMISSIONS.workspace_member,
    [workspaceRole]
  );

  // Check if user can access a workboard
  const canAccessWorkboard = useCallback((workboardId, workboard) => {
    if (!currentWorkspaceId || !workboardId) return false;
    
    // System Admins and Executives can access all workboards
    if (accountRole === 'system_admin' || accountRole === 'executive') return true;
    
    // Workspace Owner and Manager can access all workboards
    if (wsPermissions.canAccessAllWorkboards) return true;
    
    // Check workboard visibility
    if (workboard) {
      if (workboard.visibility === 'public_workspace') {
        // Public boards visible to all workspace members
        return workspaceMember?.status === 'active';
      } else if (workboard.visibility === 'private') {
        // Private boards only visible to invited members
        return workboardMemberships[workboardId] !== undefined;
      } else if (workboard.visibility === 'restricted') {
        // Restricted boards only visible to assigned users
        return workboard.assigned_users?.includes(user?.id) || 
               workboardMemberships[workboardId] !== undefined;
      }
    }
    
    // Check if user has explicit workboard membership
    if (workspaceMember?.access_type === 'selected_workboards') {
      return workspaceMember.accessible_workboards?.includes(workboardId);
    }
    
    return workboardMemberships[workboardId] !== undefined;
  }, [accountRole, workspaceMember, workboardMemberships, wsPermissions, currentWorkspaceId, user]);

  // Get workboard permissions for a specific board
  const getWorkboardPermissions = useCallback((workboardId) => {
    const membership = workboardMemberships[workboardId];
    if (!membership) return WORKBOARD_ROLE_PERMISSIONS.workboard_viewer;
    return WORKBOARD_ROLE_PERMISSIONS[membership.role] || WORKBOARD_ROLE_PERMISSIONS.workboard_viewer;
  }, [workboardMemberships]);

  // Check if user can perform an action (account level)
  const can = useCallback((action) => {
    // Most restrictive permission wins
    if (accountPermissions[action] === false) return false;
    return Boolean(accountPermissions[action] || wsPermissions[action]);
  }, [accountPermissions, wsPermissions]);

  // Check if user can manage a specific workboard
  const canManageWorkboard = useCallback((workboardId) => {
    const membership = workboardMemberships[workboardId];
    if (!membership) return false;
    return membership.role === 'workboard_owner' || wsPermissions.canManageWorkboardAccess;
  }, [workboardMemberships, wsPermissions]);

  // Check if user can create automations at a specific scope
  const canCreateAutomation = useCallback((scope) => {
    if (!accountPermissions) return false;
    
    switch (scope) {
      case 'organization':
        return accountPermissions.canCreateOrganizationAutomations;
      case 'workspace':
        return accountPermissions.canCreateWorkspaceAutomations || 
               wsPermissions.canManageWorkspaceAutomations;
      case 'workboard':
        return accountPermissions.canCreateWorkboardAutomations;
      case 'personal':
        return accountPermissions.canCreatePersonalAutomations;
      default:
        return false;
    }
  }, [accountPermissions, wsPermissions]);

  // Get automation scope for user
  const automationScope = useMemo(() => {
    return accountPermissions.automationScope;
  }, [accountPermissions]);

  // Check if user can view executive dashboard
  const canViewExecutiveDashboard = useMemo(() => {
    return accountRole === 'system_admin' || accountRole === 'executive';
  }, [accountRole]);

  // Check if user is executive
  const isExecutive = useMemo(() => {
    return accountRole === 'executive';
  }, [accountRole]);

  // Check if user is system admin
  const isSystemAdmin = useMemo(() => {
    return accountRole === 'system_admin';
  }, [accountRole]);

  // Check if user is manager (account or workspace level)
  const isManager = useMemo(() => {
    return accountRole === 'manager' || 
           workspaceRole === 'workspace_manager' || 
           workspaceRole === 'workspace_owner';
  }, [accountRole, workspaceRole]);

  // Check if user can manage workspace members
  const canManageMembers = useMemo(() => {
    return accountRole === 'system_admin' || wsPermissions.canManageMembers || wsPermissions.canInviteUsers;
  }, [accountRole, wsPermissions]);

  return {
    user,
    accountRole,
    accountRoleLabel: accountPermissions.label,
    accountPermissions,
    workspaceRole,
    workspaceRoleLabel: wsPermissions.label,
    workspacePermissions: wsPermissions,
    can,
    canAccessWorkboard,
    getWorkboardPermissions,
    canManageWorkboard,
    canCreateAutomation,
    automationScope,
    accessibleWorkboards,
    loading,
    isSystemAdmin,
    isExecutive,
    isManager,
    canManageMembers,
    canViewExecutiveDashboard,
    workspaceMember,
    workboardMemberships,
    WORKSPACE_ROLE_PERMISSIONS,
    WORKBOARD_ROLE_PERMISSIONS,
    ACCOUNT_ROLE_PERMISSIONS,
  };
}

export { 
  ACCOUNT_ROLE_PERMISSIONS, 
  WORKSPACE_ROLE_PERMISSIONS, 
  WORKBOARD_ROLE_PERMISSIONS 
};