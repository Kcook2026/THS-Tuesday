/**
 * Workboard Health Check Utility
 * Admin-only diagnostic tool for detecting data integrity issues.
 */

import { base44 } from '@/api/base44Client';
import { getValidBoardIds, isOrphanedBoard } from './workboardService';

export async function runWorkboardHealthCheck(workspaceId) {
  const issues = {
    orphanedBoards: [],
    boardsWithoutOwner: [],
    duplicateOwnerMemberships: [],
    staleRecentBoards: [],
    staleMemberships: [],
    itemsMissingWorkspace: [],
    itemsMissingWorkboard: [],
    itemValuesMissingItem: [],
    duplicateSystemColumns: [],
  };

  try {
    const [boards, items, groups, columns, members, itemValues, users, workspaceMembers] = await Promise.all([
      base44.entities.Workboard.filter({ workspace: workspaceId }).catch(() => []),
      base44.entities.WorkboardItem.filter({ workspace: workspaceId }).catch(() => []),
      base44.entities.BoardGroup.filter({ workspace: workspaceId }).catch(() => []),
      base44.entities.BoardColumn.filter({ workspace: workspaceId }).catch(() => []),
      base44.entities.WorkboardMember.filter({ workspace: workspaceId }).catch(() => []),
      base44.entities.WorkboardItemValue.filter({ workspace: workspaceId }).catch(() => []),
      base44.entities.User.list().catch(() => []),
      base44.entities.WorkspaceMember.filter({ workspace: workspaceId }).catch(() => []),
    ]);

    const validBoardIds = getValidBoardIds(boards, workspaceId);
    const validUserIds = new Set(users.map(u => u.id));
    const SYSTEM_COLUMN_NAMES = ['item name', 'owner', 'status', 'priority', 'due date', 'progress'];

    // 1. Orphaned boards & boards without owner
    for (const board of boards) {
      const boardMembers = members.filter(m => m.workboard === board.id);
      if (isOrphanedBoard(board, boardMembers, users)) {
        issues.orphanedBoards.push({ id: board.id, name: board.name, owner: board.owner });
      }
      if (!board.owner) {
        issues.boardsWithoutOwner.push({ id: board.id, name: board.name });
      }
    }

    // 2. Duplicate owner memberships
    const membershipByBoardUser = {};
    for (const member of members) {
      if (member.role === 'workboard_owner' && member.status === 'active') {
        const key = `${member.workboard}::${member.user}`;
        if (membershipByBoardUser[key]) {
          issues.duplicateOwnerMemberships.push({
            boardId: member.workboard,
            userId: member.user,
            membershipIds: [membershipByBoardUser[key], member.id],
          });
        } else {
          membershipByBoardUser[key] = member.id;
        }
      }
    }

    // 3. Stale memberships (board deleted or user doesn't exist)
    for (const member of members) {
      if (!validBoardIds.has(member.workboard) || !validUserIds.has(member.user)) {
        issues.staleMemberships.push({
          id: member.id,
          workboard: member.workboard,
          user: member.user,
          reason: !validBoardIds.has(member.workboard) ? 'board_deleted' : 'user_deleted',
        });
      }
    }

    // 4. Items missing workspace or workboard
    for (const item of items) {
      if (!item.workspace) {
        issues.itemsMissingWorkspace.push({ id: item.id, title: item.title });
      }
      if (!item.workboard) {
        issues.itemsMissingWorkboard.push({ id: item.id, title: item.title });
      }
    }

    // 5. ItemValues missing item
    for (const value of itemValues) {
      if (!value.item) {
        issues.itemValuesMissingItem.push({ id: value.id, column: value.column });
      }
    }

    // 6. Duplicate system columns
    const columnsByBoard = {};
    for (const col of columns) {
      if (!columnsByBoard[col.workboard]) {
        columnsByBoard[col.workboard] = [];
      }
      columnsByBoard[col.workboard].push(col);
    }

    for (const [boardId, boardCols] of Object.entries(columnsByBoard)) {
      const colCounts = {};
      for (const col of boardCols) {
        const normalizedName = (col.name || '').toLowerCase();
        if (SYSTEM_COLUMN_NAMES.includes(normalizedName)) {
          colCounts[normalizedName] = (colCounts[normalizedName] || 0) + 1;
          if (colCounts[normalizedName] === 2) {
            issues.duplicateSystemColumns.push({
              boardId,
              columnName: col.name,
              type: normalizedName,
            });
          }
        }
      }
    }

    return {
      status: 'success',
      issues,
      summary: {
        totalOrphanedBoards: issues.orphanedBoards.length,
        totalBoardsWithoutOwner: issues.boardsWithoutOwner.length,
        totalDuplicateMemberships: issues.duplicateOwnerMemberships.length,
        totalStaleMemberships: issues.staleMemberships.length,
        totalItemsMissingWorkspace: issues.itemsMissingWorkspace.length,
        totalItemsMissingWorkboard: issues.itemsMissingWorkboard.length,
        totalItemValuesMissingItem: issues.itemValuesMissingItem.length,
        totalDuplicateSystemColumns: issues.duplicateSystemColumns.length,
      },
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      issues,
    };
  }
}

export async function fixOrphanedBoard(boardId, userId) {
  try {
    const board = await base44.entities.Workboard.get(boardId);
    if (!board) return { status: 'error', error: 'Board not found' };

    await base44.entities.Workboard.update(boardId, { owner: userId });

    const existing = await base44.entities.WorkboardMember.filter({
      workboard: boardId,
      user: userId,
    }).catch(() => []);

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

    return { status: 'fixed', boardId };
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}

export async function fixStaleMembership(membershipId) {
  try {
    await base44.entities.WorkboardMember.update(membershipId, { status: 'removed' });
    return { status: 'fixed', membershipId };
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}

export async function fixDuplicateSystemColumn(columnId) {
  try {
    await base44.entities.BoardColumn.delete(columnId);
    return { status: 'fixed', columnId };
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}