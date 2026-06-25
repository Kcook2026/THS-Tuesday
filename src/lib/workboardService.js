/**
 * Workboard Service Utilities
 * Centralized helpers for board lifecycle, filtering, permissions, and data operations.
 */

import { base44 } from '@/api/base44Client';

// ── Lifecycle Predicates ──────────────────────────────────────────────

export function isActiveBoard(board, workspaceId) {
  if (!board || !board.id) return false;
  if (workspaceId && board.workspace !== workspaceId) return false;
  return board.status === 'active' && board.archived !== true;
}

export function isArchivedBoard(board, workspaceId) {
  if (!board || !board.id) return false;
  if (workspaceId && board.workspace !== workspaceId) return false;
  if (board.status === 'deleted' || board.deleted_date) return false;
  return board.status === 'archived' || board.archived === true;
}

export function isDeletedBoard(board, workspaceId) {
  if (!board || !board.id) return false;
  if (workspaceId && board.workspace !== workspaceId) return false;
  return board.status === 'deleted' || !!board.deleted_date;
}

export function isTemplateBoard(board, workspaceId) {
  if (!board || !board.id) return false;
  if (workspaceId && board.workspace !== workspaceId) return false;
  return board.status === 'template';
}

// ── List Helpers ──────────────────────────────────────────────────────

export function getActiveWorkboards(workboards, currentWorkspaceId) {
  if (!Array.isArray(workboards)) return [];
  const seen = new Set();
  return workboards.filter((wb) => {
    if (!isActiveBoard(wb, currentWorkspaceId)) return false;
    if (seen.has(wb.id)) return false;
    seen.add(wb.id);
    return true;
  });
}

export function getArchivedWorkboards(workboards, currentWorkspaceId) {
  if (!Array.isArray(workboards)) return [];
  const seen = new Set();
  return workboards.filter((wb) => {
    if (!isArchivedBoard(wb, currentWorkspaceId)) return false;
    if (seen.has(wb.id)) return false;
    seen.add(wb.id);
    return true;
  });
}

export function getDeletedWorkboards(workboards, currentWorkspaceId) {
  if (!Array.isArray(workboards)) return [];
  const seen = new Set();
  return workboards.filter((wb) => {
    if (!isDeletedBoard(wb, currentWorkspaceId)) return false;
    if (seen.has(wb.id)) return false;
    seen.add(wb.id);
    return true;
  });
}

export function getValidBoardIds(workboards, currentWorkspaceId) {
  if (!Array.isArray(workboards)) return new Set();
  const ids = new Set();
  for (const wb of workboards) {
    if (!wb || !wb.id) continue;
    if (currentWorkspaceId && wb.workspace !== currentWorkspaceId) continue;
    if (isDeletedBoard(wb)) continue;
    ids.add(wb.id);
  }
  return ids;
}

// ── Sorting Helpers ───────────────────────────────────────────────────

export function sortGroups(groups) {
  if (!Array.isArray(groups)) return [];
  return [...groups].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

export function sortItems(items) {
  if (!Array.isArray(items)) return [];
  return [...items].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

export function sortSubItems(subItems) {
  if (!Array.isArray(subItems)) return [];
  return [...subItems].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

export function sortColumns(columns) {
  if (!Array.isArray(columns)) return [];
  return [...columns].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

export function sortStatusOptions(options) {
  if (!Array.isArray(options)) return [];
  return [...options].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

export function sortPriorityOptions(options) {
  if (!Array.isArray(options)) return [];
  return [...options].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

// ── Board Lifecycle Operations ────────────────────────────────────────

export async function archiveBoard(boardId, userId) {
  await base44.entities.Workboard.update(boardId, {
    status: 'archived',
    archived: true,
    archived_date: new Date().toISOString(),
    archived_by: userId,
  });
}

export async function restoreBoard(boardId) {
  await base44.entities.Workboard.update(boardId, {
    status: 'active',
    archived: false,
    archived_date: null,
    archived_by: null,
  });
}

export async function safeDeleteBoardData(boardId) {
  const safeFilter = (entityName, query) =>
    base44.entities[entityName].filter(query).catch(() => []);

  const [items, groups, statuses, priorities, members, columns, itemValues, activities] = await Promise.all([
    safeFilter('WorkboardItem', { workboard: boardId }),
    safeFilter('BoardGroup', { workboard: boardId }),
    safeFilter('StatusOption', { workboard: boardId }),
    safeFilter('PriorityOption', { workboard: boardId }),
    safeFilter('WorkboardMember', { workboard: boardId }),
    safeFilter('BoardColumn', { workboard: boardId }),
    safeFilter('WorkboardItemValue', { workboard: boardId }),
    safeFilter('Activity', { record_type: 'Workboard', record_id: boardId }),
  ]);

  const safeDelete = async (entityName, records) => {
    for (const r of records) {
      await base44.entities[entityName].delete(r.id).catch(() => {});
    }
  };

  await safeDelete('WorkboardItemValue', itemValues);
  await safeDelete('WorkboardItem', items);
  await safeDelete('BoardGroup', groups);
  await safeDelete('BoardColumn', columns);
  await safeDelete('StatusOption', statuses);
  await safeDelete('PriorityOption', priorities);
  await safeDelete('WorkboardMember', members);
  await safeDelete('Activity', activities);
}

export async function permanentlyDeleteBoard(boardId, userId) {
  await safeDeleteBoardData(boardId);
  await base44.entities.Workboard.update(boardId, {
    status: 'deleted',
    deleted_date: new Date().toISOString(),
    deleted_by: userId,
  });
}

// ── Membership Cleanup ────────────────────────────────────────────────

export async function cleanupStaleMemberships(workspaceId) {
  const [members, boards, users] = await Promise.all([
    base44.entities.WorkboardMember.filter({ workspace: workspaceId, status: 'active' }).catch(() => []),
    base44.entities.Workboard.filter({ workspace: workspaceId }).catch(() => []),
    base44.entities.User.list().catch(() => []),
  ]);

  const validBoardIds = getValidBoardIds(boards, workspaceId);
  const validUserIds = new Set(users.map(u => u.id));
  let cleaned = 0;

  for (const member of members) {
    const shouldRemove =
      !validBoardIds.has(member.workboard) ||
      !validUserIds.has(member.user);

    if (shouldRemove) {
      await base44.entities.WorkboardMember.update(member.id, { status: 'removed' }).catch(() => {});
      cleaned++;
    }
  }

  return cleaned;
}

export async function ensureBoardOwner(boardId, userId) {
  const [board, existing] = await Promise.all([
    base44.entities.Workboard.get(boardId),
    base44.entities.WorkboardMember.filter({ workboard: boardId, user: userId }).catch(() => []),
  ]);

  const updates = { owner: userId };
  if (!board.created_by) updates.created_by = userId;
  await base44.entities.Workboard.update(boardId, updates);

  if (existing.length === 0) {
    await base44.entities.WorkboardMember.create({
      workspace: board.workspace,
      workboard: boardId,
      workboard_name: board.name,
      user: userId,
      user_name: userId.full_name || userId.email || 'Admin',
      user_email: userId.email || '',
      role: 'workboard_owner',
      status: 'active',
      added_by: userId,
      joined_date: new Date().toISOString().split('T')[0],
    });
  }
}

// ── Orphan Detection ──────────────────────────────────────────────────

export function isOrphanedBoard(board, members = [], allUsers = []) {
  if (!board) return false;
  if (!board.owner) return true;
  if (allUsers.length > 0 && !allUsers.some(u => u.id === board.owner)) return true;
  if (!members.some(m => m.status === 'active')) return true;
  return false;
}

export async function findOrphanedBoards(workspaceId) {
  const [boards, members, users] = await Promise.all([
    base44.entities.Workboard.filter({ workspace: workspaceId }).catch(() => []),
    base44.entities.WorkboardMember.filter({ workspace: workspaceId }).catch(() => []),
    base44.entities.User.list().catch(() => []),
  ]);

  return boards.filter(board => {
    const boardMembers = members.filter(m => m.workboard === board.id);
    return isOrphanedBoard(board, boardMembers, users);
  });
}