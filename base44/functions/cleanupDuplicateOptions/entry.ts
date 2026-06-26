import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

    const sr = base44.asServiceRole;
    const results = { statusDeleted: 0, priorityDeleted: 0, statusBoardsAffected: 0, priorityBoardsAffected: 0 };

    // --- Dedupe StatusOptions by workboard + label + color ---
    const statuses = await sr.entities.StatusOption.filter({}, '-created_date', 500).catch(() => []);
    const statusGroups = {};
    for (const s of statuses) {
      const key = `${s.workboard || ''}|${s.label || ''}|${s.color || ''}`;
      if (!statusGroups[key]) statusGroups[key] = [];
      statusGroups[key].push(s);
    }
    const statusToDelete = [];
    for (const key of Object.keys(statusGroups)) {
      const group = statusGroups[key];
      if (group.length <= 1) continue;
      results.statusBoardsAffected++;
      // Keep the one with the lowest sort_order (then oldest created_date)
      const sorted = group.sort((a, b) => {
        const so = (a.sort_order ?? 0) - (b.sort_order ?? 0);
        if (so !== 0) return so;
        return new Date(a.created_date || 0) - new Date(b.created_date || 0);
      });
      const keepId = sorted[0].id;
      for (const dup of sorted.slice(1)) {
        // Re-point any WorkboardItem referencing the dup's label to the kept record
        await sr.entities.WorkboardItem.updateMany(
          { workboard: dup.workboard, status: dup.label },
          { $set: { status_color: sorted[0].color } }
        ).catch(() => {});
        statusToDelete.push(dup.id);
      }
    }
    if (statusToDelete.length > 0) {
      for (const id of statusToDelete) {
        await sr.entities.StatusOption.delete(id).catch(() => {});
        results.statusDeleted++;
      }
    }

    // --- Dedupe PriorityOptions by workboard + label + color ---
    const priorities = await sr.entities.PriorityOption.filter({}, '-created_date', 500).catch(() => []);
    const priorityGroups = {};
    for (const p of priorities) {
      const key = `${p.workboard || ''}|${p.label || ''}|${p.color || ''}`;
      if (!priorityGroups[key]) priorityGroups[key] = [];
      priorityGroups[key].push(p);
    }
    const priorityToDelete = [];
    for (const key of Object.keys(priorityGroups)) {
      const group = priorityGroups[key];
      if (group.length <= 1) continue;
      results.priorityBoardsAffected++;
      const sorted = group.sort((a, b) => {
        const so = (a.sort_order ?? 0) - (b.sort_order ?? 0);
        if (so !== 0) return so;
        return new Date(a.created_date || 0) - new Date(b.created_date || 0);
      });
      const keepId = sorted[0].id;
      for (const dup of sorted.slice(1)) {
        await sr.entities.WorkboardItem.updateMany(
          { workboard: dup.workboard, priority: dup.label },
          { $set: { priority_color: sorted[0].color } }
        ).catch(() => {});
        priorityToDelete.push(dup.id);
      }
    }
    if (priorityToDelete.length > 0) {
      for (const id of priorityToDelete) {
        await sr.entities.PriorityOption.delete(id).catch(() => {});
        results.priorityDeleted++;
      }
    }

    return Response.json({
      success: true,
      ...results,
      statusBefore: statuses.length,
      priorityBefore: priorities.length,
      statusAfter: statuses.length - results.statusDeleted,
      priorityAfter: priorities.length - results.priorityDeleted,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});