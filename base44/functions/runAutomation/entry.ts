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
    if (!item) {
      const query = { workspace: rule.workspace, archived: false };
      if (rule.workboard) query.workboard = rule.workboard;
      const items = await sr.entities.WorkboardItem.filter(query, '-updated_date', 1).catch(() => []);
      if (items.length > 0) item = items[0];
    }
    if (!item) return Response.json({ error: 'No items found to test with' }, { status: 404 });

    const triggerLabel = {
      item_created: 'Item is created', item_updated: 'Item is updated',
      status_changed: 'Status changes', priority_changed: 'Priority changes',
      owner_changed: 'Owner changes', assignee_changed: 'Assignee changes',
      due_date_changed: 'Due date changes', item_moved_to_group: 'Item moved to group',
      sub_item_created: 'Sub-item is created', comment_added: 'Comment is added',
      file_uploaded: 'File is uploaded', form_submitted: 'Form is submitted',
      manual: 'Run manually',
    }[rule.trigger_type] || rule.trigger_type;

    const result = await sr.functions.invoke('processAutomationEvent', {
      event: { type: 'create', entity_name: 'WorkboardItem', entity_id: item.id },
      data: item,
      force_rule_id: ruleId,
    });

    const testResult = result?.data || result;
    const ruleResult = testResult?.results?.[0] || {};

    const status = ruleResult.success ? 'success' : (ruleResult.skipped ? 'skipped' : 'failed');

    return Response.json({
      success: true,
      test: {
        rule_name: rule.name,
        trigger_type: rule.trigger_type,
        trigger_label: triggerLabel,
        item_title: item.title,
        item_id: item.id,
        workboard: item.workboard,
        status,
        actions_performed: ruleResult.actions || [],
        skipped_reason: ruleResult.skipped || null,
        error: ruleResult.error || null,
        run_id: ruleResult.run_id || null,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});