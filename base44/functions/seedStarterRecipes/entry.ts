import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { workspace, workboard } = await req.json();
    if (!workspace) return Response.json({ error: 'workspace is required' }, { status: 400 });

    const sr = base44.asServiceRole;

    // Check for existing starter recipes to avoid duplicates
    const existing = await sr.entities.AutomationRule.filter({ workspace, is_starter: true }).catch(() => []);
    const existingNames = new Set(existing.map(r => r.name));
    if (workboard) {
      const boardExisting = await sr.entities.AutomationRule.filter({ workspace, workboard, is_starter: true }).catch(() => []);
      boardExisting.forEach(r => existingNames.add(r.name));
    }

    const recipes = [
      {
        name: 'Auto-complete items when status is Done',
        description: 'When an item\'s status changes to Done, archive it automatically.',
        trigger_type: 'status_changed',
        trigger_config: JSON.stringify({ value: 'Done' }),
        conditions: '[]',
        actions: JSON.stringify([{ type: 'archive_item' }]),
      },
      {
        name: 'Critical priority alerts',
        description: 'Notify workboard owners when an item\'s priority changes to Critical.',
        trigger_type: 'priority_changed',
        trigger_config: JSON.stringify({ value: 'Critical' }),
        conditions: '[]',
        actions: JSON.stringify([{ type: 'notify_workboard_owners', value: 'An item priority was changed to Critical.' }]),
      },
      {
        name: 'Assignee notification',
        description: 'Send a notification to the assignee when an item is assigned.',
        trigger_type: 'assignee_changed',
        trigger_config: '{}',
        conditions: '[]',
        actions: JSON.stringify([{ type: 'notify_assignee', value: 'You were assigned to an item.' }]),
      },
      {
        name: 'Form submission auto-assign',
        description: 'When a form is submitted, assign an owner to the created item. Configure the owner after adding.',
        trigger_type: 'form_submitted',
        trigger_config: '{}',
        conditions: '[]',
        actions: JSON.stringify([{ type: 'assign_owner', value: '' }]),
      },
      {
        name: 'Overdue item alert',
        description: 'Notify the item owner when the due date has passed.',
        trigger_type: 'due_date_overdue',
        trigger_config: '{}',
        conditions: '[]',
        actions: JSON.stringify([{ type: 'notify_owner', value: 'This item is overdue.' }]),
      },
      {
        name: 'Stuck item escalation',
        description: 'Notify workboard owners when an item is marked as Stuck.',
        trigger_type: 'status_changed',
        trigger_config: JSON.stringify({ value: 'Stuck' }),
        conditions: '[]',
        actions: JSON.stringify([{ type: 'notify_workboard_owners', value: 'An item is marked as Stuck.' }]),
      },
      {
        name: 'Auto-create sub-items',
        description: 'When a new item is created, automatically create three default sub-items: Review request, Assign owner, and Complete follow-up.',
        trigger_type: 'item_created',
        trigger_config: '{}',
        conditions: '[]',
        actions: JSON.stringify([
          { type: 'create_sub_item', value: 'Review request' },
          { type: 'create_sub_item', value: 'Assign owner' },
          { type: 'create_sub_item', value: 'Complete follow-up' },
        ]),
      },
    ];

    const created = [];
    for (const recipe of recipes) {
      if (existingNames.has(recipe.name)) continue;
      const rule = await sr.entities.AutomationRule.create({
        ...recipe,
        workspace,
        workboard: workboard || null,
        status: 'paused',
        owner: user.id,
        created_by: user.id,
        archived: false,
        run_count: 0,
        failure_count: 0,
        is_starter: true,
      });
      created.push(rule);
    }

    return Response.json({ success: true, created: created.length, rules: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});