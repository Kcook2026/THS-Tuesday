import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    // Authenticate user
    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { workspace, workboard } = body;

    if (!workspace) {
      return Response.json({ error: 'workspace is required' }, { status: 400 });
    }

    // Fetch all active automation rules with date triggers
    const rules = await sr.entities.AutomationRule.filter({
      workspace,
      status: 'active',
      archived: false,
    }).catch(() => []);

    const dateTriggers = ['due_date_arrives', 'due_date_overdue', 'due_date_x_days_away'];
    const dateRules = rules.filter(r => dateTriggers.includes(r.trigger_type));

    if (dateRules.length === 0) {
      return Response.json({ processed: 0, message: 'No date-based automations found' });
    }

    // Fetch items to evaluate
    const itemQuery = { workspace, archived: false };
    if (workboard) itemQuery.workboard = workboard;
    
    const items = await sr.entities.WorkboardItem.filter(itemQuery).catch(() => []);
    const itemsWithDueDate = items.filter(i => i.due_date);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const results = [];

    for (const rule of dateRules) {
      let tc = {};
      try { tc = JSON.parse(rule.trigger_config || '{}'); } catch {}

      const targetWorkboard = rule.workboard || workboard;
      const applicableItems = targetWorkboard
        ? itemsWithDueDate.filter(i => i.workboard === targetWorkboard)
        : itemsWithDueDate;

      for (const item of applicableItems) {
        if (!item.due_date) continue;

        const dueDate = new Date(item.due_date);
        const dueDateStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
        
        let shouldTrigger = false;

        if (rule.trigger_type === 'due_date_arrives') {
          // Trigger when due date is today
          shouldTrigger = dueDateStart.getTime() === today.getTime();
        } else if (rule.trigger_type === 'due_date_overdue') {
          // Trigger when due date is in the past
          shouldTrigger = dueDateStart.getTime() < today.getTime();
        } else if (rule.trigger_type === 'due_date_x_days_away') {
          const daysAhead = tc.days || tc.value || 0;
          const targetDate = new Date(today);
          targetDate.setDate(targetDate.getDate() + parseInt(daysAhead, 10));
          shouldTrigger = dueDateStart.getTime() === targetDate.getTime();
        }

        if (!shouldTrigger) continue;

        // Check cooldown: don't notify same item+rule more than once per day
        const dayAgo = new Date(Date.now() - 86400000).toISOString();
        const recentRuns = await sr.entities.AutomationRun.filter({
          rule: rule.id,
          item: item.id,
          started_date: { $gte: dayAgo },
          status: 'success',
        }).catch(() => []);

        if (recentRuns.length > 0) {
          results.push({ rule: rule.name, item: item.title, skipped: 'already_notified_today' });
          continue;
        }

        // Execute the rule
        const run = await sr.entities.AutomationRun.create({
          workspace,
          workboard: item.workboard,
          rule: rule.id,
          item: item.id,
          trigger_type: rule.trigger_type,
          status: 'running',
          started_date: new Date().toISOString(),
        });

        try {
          const actionsResult = await performActions(sr, rule, item, item.id, item.workboard, workspace, user);
          await sr.entities.AutomationRun.update(run.id, {
            status: 'success',
            completed_date: new Date().toISOString(),
            actions_performed: JSON.stringify(actionsResult),
          });
          await sr.entities.AutomationRule.update(rule.id, {
            last_run_date: new Date().toISOString(),
            run_count: (rule.run_count || 0) + 1,
          });
          results.push({ rule: rule.name, item: item.title, success: true, actions: actionsResult.length });
        } catch (error) {
          await sr.entities.AutomationRun.update(run.id, {
            status: 'failed',
            completed_date: new Date().toISOString(),
            error_message: error.message,
          });
          results.push({ rule: rule.name, item: item.title, error: error.message });
        }
      }
    }

    return Response.json({ processed: results.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function performActions(sr, rule, data, itemId, workboard, workspace, user) {
  let actions = [];
  try { actions = JSON.parse(rule.actions || '[]'); } catch {}
  const results = [];

  for (const action of actions) {
    switch (action.type) {
      case 'notify_owner': {
        if (data.owner) {
          await sr.entities.Notification.create({
            workspace, workboard, recipient: data.owner,
            sender: user.id, sender_name: user.full_name || 'Automation',
            type: 'deadline', title: rule.name,
            message: action.value || rule.description || `Due date notification: ${data.title}`,
            record_type: 'WorkboardItem', record_id: itemId,
            target_url: workboard ? `/workboards/${workboard}?item=${itemId}&tab=overview` : '',
            read_status: false,
          });
          results.push({ action: 'notify_owner' });
        }
        break;
      }
      case 'notify_assignee': {
        const recipient = data.assignee || data.owner;
        if (recipient) {
          await sr.entities.Notification.create({
            workspace, workboard, recipient,
            sender: user.id, sender_name: user.full_name || 'Automation',
            type: 'deadline', title: rule.name,
            message: action.value || rule.description || `Due date notification: ${data.title}`,
            record_type: 'WorkboardItem', record_id: itemId,
            target_url: workboard ? `/workboards/${workboard}?item=${itemId}&tab=overview` : '',
            read_status: false,
          });
          results.push({ action: 'notify_assignee' });
        }
        break;
      }
      case 'notify_specific_user': {
        if (action.value) {
          await sr.entities.Notification.create({
            workspace, workboard, recipient: action.value,
            sender: user.id, sender_name: user.full_name || 'Automation',
            type: 'deadline', title: rule.name,
            message: action.message || rule.description || `Due date notification: ${data.title}`,
            record_type: 'WorkboardItem', record_id: itemId,
            target_url: workboard ? `/workboards/${workboard}?item=${itemId}&tab=overview` : '',
            read_status: false,
          });
          results.push({ action: 'notify_specific_user', value: action.value });
        }
        break;
      }
      case 'change_status': {
        if (itemId && data.status !== action.value) {
          let color = data.status_color;
          const opts = await sr.entities.StatusOption.filter({ workboard }).catch(() => []);
          const m = opts.find(s => s.id === action.value || s.label === action.value);
          if (m) color = m.color;
          await sr.entities.WorkboardItem.update(itemId, { status: action.value, status_color: color });
          results.push({ action: 'change_status', value: action.value });
        }
        break;
      }
      case 'change_priority': {
        if (itemId && data.priority !== action.value) {
          let color = data.priority_color;
          const opts = await sr.entities.PriorityOption.filter({ workboard }).catch(() => []);
          const m = opts.find(p => p.id === action.value || p.label === action.value);
          if (m) color = m.color;
          await sr.entities.WorkboardItem.update(itemId, { priority: action.value, priority_color: color });
          results.push({ action: 'change_priority', value: action.value });
        }
        break;
      }
      case 'create_comment': {
        if (itemId) {
          await sr.entities.Comment.create({
            workspace, workboard, item: itemId, record_type: 'WorkboardItem', record_id: itemId,
            user: user.id, user_name: user.full_name || 'Automation', body: action.value,
          });
          results.push({ action: 'create_comment' });
        }
        break;
      }
    }
  }
  return results;
}