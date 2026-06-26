import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { ruleId, itemId } = await req.json();
    if (!ruleId) return Response.json({ error: 'ruleId is required' }, { status: 400 });

    const sr = base44.asServiceRole;
    const rule = await sr.entities.AutomationRule.get(ruleId).catch(() => null);
    if (!rule) return Response.json({ error: 'Rule not found' }, { status: 404 });

    let item = null;
    if (itemId) {
      item = await sr.entities.WorkboardItem.get(itemId).catch(() => null);
    }
    // If no itemId, auto-find a recent item from the rule's workboard or workspace
    if (!item) {
      const query = { workspace: rule.workspace, archived: false };
      if (rule.workboard) query.workboard = rule.workboard;
      const items = await sr.entities.WorkboardItem.filter(query, '-updated_date', 1).catch(() => []);
      if (items.length > 0) item = items[0];
    }
    if (!item) return Response.json({ error: 'No items found to test with' }, { status: 404 });

    // Delegate to processAutomationEvent with force_rule_id
    const result = await sr.functions.invoke('processAutomationEvent', {
      event: { type: 'create', entity_name: 'WorkboardItem', entity_id: itemId },
      data: item,
      force_rule_id: ruleId,
    });

    return Response.json({ success: true, result: result?.data || result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});