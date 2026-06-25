/**
 * Single source of truth for Workboard lifecycle classification.
 *
 * Lifecycle states (mutually exclusive when used via the list helpers):
 *   active    – status === 'active' AND archived !== true
 *   archived  – status === 'archived' OR archived === true  (but NOT deleted)
 *   deleted   – status === 'deleted' OR deleted_date exists
 *   template  – status === 'template'
 */

// ── Single-board predicates ──────────────────────────────────────────────

export function isActiveBoard(board, workspaceId) {
  if (!board || !board.id) return false;
  if (workspaceId && board.workspace !== workspaceId) return false;
  return board.status === 'active' && board.archived !== true;
}

export function isArchivedBoard(board, workspaceId) {
  if (!board || !board.id) return false;
  if (workspaceId && board.workspace !== workspaceId) return false;
  // Deleted boards are not archived
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

/**
 * Returns a normalized copy of a board record with lifecycle flags
 * reconciled (used by the "Repair Board Data" admin action).
 */
export function normalizeBoard(board) {
  if (!board) return null;
  const status = board.status || 'active';
  const archived = board.archived === true;
  const hasDeletedDate = !!board.deleted_date;

  if (status === 'deleted' || hasDeletedDate) {
    return { ...board, status: 'deleted', archived: true };
  }
  if (status === 'archived' || archived) {
    return { ...board, status: 'archived', archived: true };
  }
  if (status === 'template') {
    return { ...board, status: 'template', archived: false };
  }
  return { ...board, status: 'active', archived: false };
}

// ── List helpers (de-duplicated) ─────────────────────────────────────────

export function getActiveWorkboards(workboards, currentWorkspaceId, userAccess) {
  if (!Array.isArray(workboards)) return [];
  const seen = new Set();
  return workboards.filter((wb) => {
    if (!isActiveBoard(wb, currentWorkspaceId)) return false;
    if (seen.has(wb.id)) return false;
    if (typeof userAccess === 'function' && !userAccess(wb)) return false;
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