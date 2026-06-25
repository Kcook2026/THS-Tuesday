import { useMemo, useCallback } from 'react';
import { WORKBOARD_ROLE_PERMISSIONS } from '@/config/PermissionConfig';

export function useWorkboardPermissions(workboardId, permissions, boardMemberships) {
  const membership = boardMemberships?.[workboardId];

  const workboardPerms = useMemo(() => {
    if (!membership) return WORKBOARD_ROLE_PERMISSIONS.workboard_viewer;
    return WORKBOARD_ROLE_PERMISSIONS[membership.role] || WORKBOARD_ROLE_PERMISSIONS.workboard_viewer;
  }, [membership]);

  const isSystemAdmin = permissions?.isSystemAdmin || false;
  const isExecutive = permissions?.isExecutive || false;
  const workspacePerms = permissions?.workspacePermissions || {};

  const canCreate = useMemo(() => {
    return isSystemAdmin || isExecutive || workspacePerms.canManageBoards || workboardPerms.canCreateItems;
  }, [isSystemAdmin, isExecutive, workspacePerms, workboardPerms]);

  const canEdit = useMemo(() => canCreate, [canCreate]);

  const canDelete = useMemo(() => {
    return workboardPerms.canDeleteItems || isSystemAdmin;
  }, [workboardPerms, isSystemAdmin]);

  const canManageGroups = useMemo(() => {
    return isSystemAdmin || isExecutive || workspacePerms.canManageBoards || workboardPerms.canManageGroups;
  }, [isSystemAdmin, isExecutive, workspacePerms, workboardPerms]);

  const canManageSettings = useMemo(() => {
    return isSystemAdmin || workspacePerms.canManageBoards || workboardPerms.canManageSettings;
  }, [isSystemAdmin, workspacePerms, workboardPerms]);

  return {
    canCreate,
    canEdit,
    canDelete,
    canManageGroups,
    canManageSettings,
    workboardPerms,
  };
}