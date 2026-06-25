/**
 * Returns only active, accessible, de-duplicated workboards for a workspace.
 *
 * A workboard is "active" only if:
 *   - it exists (non-null) and has an id
 *   - workspace matches currentWorkspaceId (when provided)
 *   - archived is not true
 *   - status is not "archived", "template", or "deleted"
 *   - id is unique (first occurrence wins)
 *
 * @param {Array} workboards - raw workboard records
 * @param {string} [currentWorkspaceId] - filter to this workspace; pass undefined/null to skip
 * @param {Function} [userAccess] - optional fn(wb) => boolean; defaults to true
 * @returns {Array}
 */
export function getActiveWorkboards(workboards, currentWorkspaceId, userAccess) {
  if (!Array.isArray(workboards)) return [];

  const seen = new Set();

  return workboards.filter((wb) => {
    if (!wb || !wb.id) return false;
    if (seen.has(wb.id)) return false;

    if (currentWorkspaceId && wb.workspace !== currentWorkspaceId) return false;

    if (wb.archived === true) return false;
    const st = wb.status;
    if (st === 'archived' || st === 'template' || st === 'deleted') return false;

    if (typeof userAccess === 'function' && !userAccess(wb)) return false;

    seen.add(wb.id);
    return true;
  });
}