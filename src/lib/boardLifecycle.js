import { base44 } from '@/api/base44Client';

/**
 * Detects if a board is orphaned:
 * - no owner set, OR
 * - owner user no longer exists, OR
 * - no active WorkboardMember exists for the board
 *
 * @param {object} board     - the workboard record
 * @param {array}  members   - WorkboardMember records for this board
 * @param {array}  allUsers  - all users (to check owner existence)
 */
export function isOrphanedBoard(board, members = [], allUsers = []) {
  if (!board) return false;
  if (!board.owner) return true;
  if (allUsers.length > 0 && !allUsers.some(u => u.id === board.owner)) return true;
  if (!members.some(m => m.status === 'active')) return true;
  return false;
}

/**
 * Safely deletes all data related to a workboard.
 * Each collection is fetched independently with catch fallbacks,
 * so a missing or empty collection never blocks deletion.
 */
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

/**
 * Assigns the current admin as owner of an orphaned board.
 * - sets board.owner
 * - sets board.created_by if missing
 * - creates a WorkboardMember as owner (prevents duplicates)
 */
export async function assignBoardToMe(boardId, workspaceId, user) {
  const [board, existing] = await Promise.all([
    base44.entities.Workboard.get(boardId),
    base44.entities.WorkboardMember.filter({ workboard: boardId, user: user.id }).catch(() => []),
  ]);

  const updates = { owner: user.id };
  if (!board.created_by) updates.created_by = user.id;
  await base44.entities.Workboard.update(boardId, updates);

  if (existing.length === 0) {
    await base44.entities.WorkboardMember.create({
      workspace: workspaceId,
      workboard: boardId,
      workboard_name: board.name,
      user: user.id,
      user_name: user.full_name || user.email || 'Admin',
      user_email: user.email || '',
      role: 'workboard_owner',
      status: 'active',
      added_by: user.id,
      joined_date: new Date().toISOString().split('T')[0],
    });
  }
}