import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { ACCOUNT_ROLE_PERMISSIONS, WORKSPACE_ROLE_PERMISSIONS, WORKBOARD_ROLE_PERMISSIONS } from '@/config/PermissionConfig';

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
  const isLoadingRef = useRef(false);

  useEffect(() => {
    if (!user || !currentWorkspaceId) {
      // Workspace context still hydrating — keep loading true so pages
      // show a loading spinner instead of a premature "permission denied".
      setLoading(true);
      return;
    }

    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

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
        isLoadingRef.current = false;
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

// Re-export for convenience
export { ACCOUNT_ROLE_PERMISSIONS, WORKSPACE_ROLE_PERMISSIONS, WORKBOARD_ROLE_PERMISSIONS };