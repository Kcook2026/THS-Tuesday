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
        name: 'When status changes to Done, archive item',
        description: 'Automatically archive items when their status changes to Done.',
        trigger_type: 'status_changed',
        trigger_config: JSON.stringify({ value: 'Done' }),
        conditions: '[]',
        actions: JSON.stringify([{ type: 'archive_item' }]),
      },
      {
        name: 'When priority changes to Critical, notify workboard owners',
        description: 'Alert workboard owners when an item priority changes to Critical.',
        trigger_type: 'priority_changed',
        trigger_config: JSON.stringify({ value: 'Critical' }),
        conditions: '[]',
        actions: JSON.stringify([{ type: 'notify_workboard_owners', value: 'An item priority was changed to Critical.' }]),
      },
      {
        name: 'When owner changes, notify assignee',
        description: 'Send a notification when an item is assigned to a new owner.',
        trigger_type: 'owner_changed',
        trigger_config: '{}',
        conditions: '[]',
        actions: JSON.stringify([{ type: 'notify_owner', value: 'You were assigned to an item.' }]),
      },
      {
        name: 'When due date is overdue, notify owner',
        description: 'Notify the item owner when the due date has passed.',
        trigger_type: 'due_date_overdue',
        trigger_config: '{}',
        conditions: '[]',
        actions: JSON.stringify([{ type: 'notify_owner', value: 'This item is overdue.' }]),
      },
      {
        name: 'When status changes to Stuck, notify workboard owners',
        description: 'Alert workboard owners when an item gets stuck.',
        trigger_type: 'status_changed',
        trigger_config: JSON.stringify({ value: 'Stuck' }),
        conditions: '[]',
        actions: JSON.stringify([{ type: 'notify_workboard_owners', value: 'An item is marked as Stuck.' }]),
      },
      {
        name: 'When item is created, create default sub-item',
        description: 'Create a follow-up sub-item automatically when a new item is created.',
        trigger_type: 'item_created',
        trigger_config: '{}',
        conditions: '[]',
        actions: JSON.stringify([{ type: 'create_sub_item', value: 'Follow-up task' }]),
      },
      {
        name: 'When form is submitted, notify workboard owners',
        description: 'Alert workboard owners when a form is submitted.',
        trigger_type: 'form_submitted',
        trigger_config: '{}',
        conditions: '[]',
        actions: JSON.stringify([{ type: 'notify_workboard_owners', value: 'A new form submission was received.' }]),
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