import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Find all active rules, then filter for due-date triggers
    const allRules = await sr.entities.AutomationRule.filter({
      status: 'active',
      archived: false,
    }).catch(() => []);
    const rules = allRules.filter(r =>
      ['due_date_arrives', 'due_date_overdue', 'due_date_x_days_away'].includes(r.trigger_type)
    );

    let totalProcessed = 0;
    let totalSkipped = 0;

    for (const rule of rules) {
      if (!rule.workspace) continue;

      // Find items for this rule's workspace (and workboard if specified)
      const query = { workspace: rule.workspace, archived: false };
      if (rule.workboard) query.workboard = rule.workboard;

      const items = await sr.entities.WorkboardItem.filter(query).catch(() => []);
      const matchingItems = [];

      let tc = {};
      try { tc = JSON.parse(rule.trigger_config || '{}'); } catch {}

      for (const item of items) {
        if (!item.due_date) continue;
        const dueDate = new Date(item.due_date);
        dueDate.setHours(0, 0, 0, 0);
        const diffDays = Math.round((dueDate - today) / (1000 * 60 * 60 * 24));

        let matches = false;
        if (rule.trigger_type === 'due_date_arrives' && diffDays === 0) matches = true;
        if (rule.trigger_type === 'due_date_overdue' && diffDays < 0) matches = true;
        if (rule.trigger_type === 'due_date_x_days_away' && diffDays === (tc.days || 0)) matches = true;

        if (!matches) continue;

        // Check if already ran today for this item+rule
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const existing = await sr.entities.AutomationRun.filter({
          rule: rule.id, item: item.id, started_date: { $gte: todayStart.toISOString() },
        }).catch(() => []);
        if (existing.length > 0) { totalSkipped++; continue; }

        matchingItems.push(item);
      }

      for (const item of matchingItems) {
        try {
          await sr.functions.invoke('processAutomationEvent', {
            event: { type: 'create', entity_name: 'WorkboardItem', entity_id: item.id },
            data: item,
            force_rule_id: rule.id,
          });
          totalProcessed++;
        } catch (e) {
          // Continue on individual errors
        }
      }
    }

    return Response.json({ success: true, rules_checked: rules.length, processed: totalProcessed, skipped: totalSkipped });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});