import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    const body = await req.json();
    const { event, data, old_data, changed_fields, force_rule_id } = body;

    // ---- Manual / scheduled trigger: run a specific rule ----
    if (force_rule_id) {
      const rule = await sr.entities.AutomationRule.get(force_rule_id).catch(() => null);
      if (!rule || rule.status !== 'active' || rule.archived) {
        return Response.json({ processed: false, reason: 'rule_not_found_or_inactive' });
      }
      let itemData = data;
      if (!itemData && event?.entity_id) {
        itemData = await sr.entities.WorkboardItem.get(event.entity_id).catch(() => null);
      }
      if (!itemData) return Response.json({ processed: false, reason: 'no_data' });
      const result = await processRule(sr, rule, itemData, itemData.id || event?.entity_id, itemData.workboard, itemData.workspace);
      return Response.json({ processed: true, results: [result] });
    }

    // ---- Entity event processing ----
    if (!event || !event.entity_name) {
      return Response.json({ processed: false, reason: 'invalid_payload' });
    }

    // Fetch entity data if payload_too_large
    let entityData = data;
    if (!entityData && event.entity_id) {
      const apis = {
        WorkboardItem: sr.entities.WorkboardItem,
        FormSubmission: sr.entities.FormSubmission,
        Comment: sr.entities.Comment,
        Attachment: sr.entities.Attachment,
      };
      const api = apis[event.entity_name];
      if (api) entityData = await api.get(event.entity_id).catch(() => null);
    }
    if (!entityData) return Response.json({ processed: false, reason: 'no_data' });

    const workspace = entityData.workspace;
    if (!workspace) return Response.json({ processed: false, reason: 'no_workspace' });

    // Determine which trigger types match
    const triggers = determineTriggers(event, entityData, changed_fields);
    if (triggers.length === 0) return Response.json({ processed: false, reason: 'no_triggers' });

    // Load related WorkboardItem for Comment / Attachment / FormSubmission events
    let contextData = entityData;
    let contextItemId = null;
    let contextWorkboard = entityData.workboard;

    if (event.entity_name === 'Comment' || event.entity_name === 'Attachment') {
      if (entityData.item) {
        const item = await sr.entities.WorkboardItem.get(entityData.item).catch(() => null);
        if (item) { contextData = item; contextItemId = item.id; contextWorkboard = item.workboard; }
      }
    } else if (event.entity_name === 'WorkboardItem') {
      contextItemId = event.entity_id;
    } else if (event.entity_name === 'FormSubmission') {
      contextItemId = entityData.created_item || entityData.linked_item;
      if (contextItemId) {
        const item = await sr.entities.WorkboardItem.get(contextItemId).catch(() => null);
        if (item) { contextData = item; contextWorkboard = item.workboard; }
      }
    }

    // Find matching active rules
    const rules = await sr.entities.AutomationRule.filter({ workspace, status: 'active', archived: false }).catch(() => []);

    const matchingRules = rules.filter(rule => {
      if (!triggers.includes(rule.trigger_type)) return false;
      if (rule.workboard && rule.workboard !== contextWorkboard) return false;

      let tc = {};
      try { tc = JSON.parse(rule.trigger_config || '{}'); } catch {}

      if (rule.trigger_type === 'status_changed' && tc.value) return contextData.status === tc.value;
      if (rule.trigger_type === 'priority_changed' && tc.value) return contextData.priority === tc.value;
      if (rule.trigger_type === 'item_moved_to_group' && tc.value) return contextData.group === tc.value;
      return true;
    });

    if (matchingRules.length === 0) return Response.json({ processed: false, reason: 'no_matching_rules' });

    const results = [];
    for (const rule of matchingRules) {
      const result = await processRule(sr, rule, contextData, contextItemId, contextWorkboard, workspace);
      results.push(result);
    }
    return Response.json({ processed: true, triggers, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// =====================================================
// HELPERS
// =====================================================

function determineTriggers(event, data, changed_fields) {
  const triggers = [];
  const cf = changed_fields || [];
  if (event.entity_name === 'WorkboardItem') {
    if (event.type === 'create') { triggers.push('item_created'); if (data.parent_item) triggers.push('sub_item_created'); }
    if (event.type === 'update') {
      triggers.push('item_updated');
      if (cf.includes('status')) triggers.push('status_changed');
      if (cf.includes('priority')) triggers.push('priority_changed');
      if (cf.includes('owner')) triggers.push('owner_changed');
      if (cf.includes('assignee')) triggers.push('assignee_changed');
      if (cf.includes('due_date')) triggers.push('due_date_changed');
      if (cf.includes('group')) triggers.push('item_moved_to_group');
    }
  }
  if (event.entity_name === 'FormSubmission' && event.type === 'create') {
    triggers.push('form_submitted');
    if (data.created_item) triggers.push('form_submission_creates_item');
  }
  if (event.entity_name === 'Comment' && event.type === 'create') triggers.push('comment_added');
  if (event.entity_name === 'Attachment' && event.type === 'create') triggers.push('file_uploaded');
  return triggers;
}

function evaluateConditions(rule, data) {
  let conditions = [];
  try { conditions = JSON.parse(rule.conditions || '[]'); } catch {}
  if (!conditions || conditions.length === 0) return true;
  for (const cond of conditions) {
    const val = data ? data[cond.field] : null;
    switch (cond.operator) {
      case 'equals': if (String(val || '') !== String(cond.value || '')) return false; break;
      case 'not_equals': if (String(val || '') === String(cond.value || '')) return false; break;
      case 'is_empty': if (val) return false; break;
      case 'is_before_today': if (!val || new Date(val) >= new Date()) return false; break;
      case 'is_after_today': if (!val || new Date(val) <= new Date()) return false; break;
    }
  }
  return true;
}

async function processRule(sr, rule, itemData, itemId, workboard, workspace) {
  // Cooldown: skip if same rule ran on same item within 60s
  if (itemId) {
    const cooldown = new Date(Date.now() - 60000).toISOString();
    const recent = await sr.entities.AutomationRun.filter({ rule: rule.id, item: itemId, started_date: { $gte: cooldown } }).catch(() => []);
    if (recent.length > 0) return { rule_id: rule.id, rule_name: rule.name, skipped: 'cooldown' };
  }

  if (!evaluateConditions(rule, itemData)) {
    return { rule_id: rule.id, rule_name: rule.name, skipped: 'conditions_not_met' };
  }

  const run = await sr.entities.AutomationRun.create({
    workspace, workboard: workboard || rule.workboard || null, rule: rule.id,
    item: itemId, trigger_type: rule.trigger_type, status: 'running', started_date: new Date().toISOString(),
  });

  try {
    const actionsResult = await performActions(sr, rule, itemData, itemId, workboard, workspace);
    await sr.entities.AutomationRun.update(run.id, {
      status: 'success', completed_date: new Date().toISOString(), actions_performed: JSON.stringify(actionsResult),
    });
    await sr.entities.AutomationRule.update(rule.id, { last_run_date: new Date().toISOString(), run_count: (rule.run_count || 0) + 1 });
    await sr.entities.AutomationLog.create({
      workspace, workboard: workboard || rule.workboard || null, rule: rule.id, run: run.id,
      message: `Executed successfully. ${actionsResult.length} action(s) performed.`, level: 'info',
    }).catch(() => {});
    return { rule_id: rule.id, rule_name: rule.name, run_id: run.id, success: true, actions: actionsResult };
  } catch (error) {
    await sr.entities.AutomationRun.update(run.id, {
      status: 'failed', completed_date: new Date().toISOString(), error_message: error.message,
    });
    await sr.entities.AutomationRule.update(rule.id, { failure_count: (rule.failure_count || 0) + 1 });
    await sr.entities.AutomationLog.create({
      workspace, workboard: workboard || rule.workboard || null, rule: rule.id, run: run.id,
      message: `Failed: ${error.message}`, level: 'error',
    }).catch(() => {});
    return { rule_id: rule.id, rule_name: rule.name, run_id: run.id, success: false, error: error.message };
  }
}

async function performActions(sr, rule, data, itemId, workboard, workspace) {
  let actions = [];
  try { actions = JSON.parse(rule.actions || '[]'); } catch {}
  const results = [];

  for (const action of actions) {
    switch (action.type) {
      case 'change_status': {
        if (itemId && data.status !== action.value) {
          let color = data.status_color;
          if (workboard) { const opts = await sr.entities.StatusOption.filter({ workboard }).catch(() => []); const m = opts.find(s => s.label === action.value); if (m) color = m.color; }
          await sr.entities.WorkboardItem.update(itemId, { status: action.value, status_color: color });
          results.push({ action: 'change_status', value: action.value });
        }
        break;
      }
      case 'change_priority': {
        if (itemId && data.priority !== action.value) {
          let color = data.priority_color;
          if (workboard) { const opts = await sr.entities.PriorityOption.filter({ workboard }).catch(() => []); const m = opts.find(p => p.label === action.value); if (m) color = m.color; }
          await sr.entities.WorkboardItem.update(itemId, { priority: action.value, priority_color: color });
          results.push({ action: 'change_priority', value: action.value });
        }
        break;
      }
      case 'assign_owner': {
        if (itemId && data.owner !== action.value) {
          await sr.entities.WorkboardItem.update(itemId, { owner: action.value, assignee: action.value });
          results.push({ action: 'assign_owner', value: action.value });
        }
        break;
      }
      case 'assign_assignee': {
        if (itemId && data.assignee !== action.value) {
          await sr.entities.WorkboardItem.update(itemId, { assignee: action.value });
          results.push({ action: 'assign_assignee', value: action.value });
        }
        break;
      }
      case 'move_to_group': {
        if (itemId && data.group !== action.value) {
          await sr.entities.WorkboardItem.update(itemId, { group: action.value });
          results.push({ action: 'move_to_group', value: action.value });
        }
        break;
      }
      case 'create_sub_item': {
        if (itemId) {
          await sr.entities.WorkboardItem.create({
            workspace, workboard, parent_item: itemId, group: data.group, title: action.value,
            item_type: 'sub_item', status: 'Not Started', status_color: 'gray', sort_order: 0, archived: false,
          });
          results.push({ action: 'create_sub_item', value: action.value });
        }
        break;
      }
      case 'create_comment': {
        if (itemId) {
          await sr.entities.Comment.create({
            workspace, workboard, item: itemId, record_type: 'WorkboardItem', record_id: itemId,
            user: rule.created_by || data.created_by, user_name: 'Automation', body: action.value,
          });
          results.push({ action: 'create_comment' });
        }
        break;
      }
      case 'archive_item': {
        if (itemId && !data.archived) {
          await sr.entities.WorkboardItem.update(itemId, { archived: true });
          results.push({ action: 'archive_item' });
        }
        break;
      }
      case 'notify_owner': {
        if (data.owner) {
          await sr.entities.Notification.create({
            workspace, workboard, recipient: data.owner, sender: rule.created_by || data.created_by,
            sender_name: 'Automation', type: 'assignment', title: rule.name,
            message: action.value || rule.description || rule.name, record_type: 'WorkboardItem',
            record_id: itemId, target_url: workboard ? `/workboards/${workboard}?item=${itemId}&tab=overview` : '', read_status: false,
          });
          results.push({ action: 'notify_owner' });
        }
        break;
      }
      case 'notify_assignee': {
        const recipient = data.assignee || data.owner;
        if (recipient) {
          await sr.entities.Notification.create({
            workspace, workboard, recipient, sender: rule.created_by || data.created_by,
            sender_name: 'Automation', type: 'assignment', title: rule.name,
            message: action.value || rule.description || rule.name, record_type: 'WorkboardItem',
            record_id: itemId, target_url: workboard ? `/workboards/${workboard}?item=${itemId}&tab=overview` : '', read_status: false,
          });
          results.push({ action: 'notify_assignee' });
        }
        break;
      }
      case 'notify_specific_user': {
        if (action.value) {
          await sr.entities.Notification.create({
            workspace, workboard, recipient: action.value, sender: rule.created_by || data.created_by,
            sender_name: 'Automation', type: 'system', title: rule.name,
            message: action.message || rule.description || rule.name, record_type: 'WorkboardItem',
            record_id: itemId, target_url: workboard ? `/workboards/${workboard}?item=${itemId}&tab=overview` : '', read_status: false,
          });
          results.push({ action: 'notify_specific_user', value: action.value });
        }
        break;
      }
      case 'notify_workboard_owners': {
        if (workboard) {
          const board = await sr.entities.Workboard.get(workboard).catch(() => null);
          if (board?.owner) {
            await sr.entities.Notification.create({
              workspace, workboard, recipient: board.owner, sender: rule.created_by || data.created_by,
              sender_name: 'Automation', type: 'system', title: rule.name,
              message: action.value || rule.description || rule.name, record_type: 'WorkboardItem',
              record_id: itemId, target_url: `/workboards/${workboard}?item=${itemId}&tab=overview`, read_status: false,
            });
            results.push({ action: 'notify_workboard_owners' });
          }
        }
        break;
      }
      case 'notify_watchers': {
        if (itemId) {
          const watchers = await sr.entities.ItemWatcher.filter({ item: itemId }).catch(() => []);
          for (const w of watchers) {
            await sr.entities.Notification.create({
              workspace, workboard, recipient: w.user, sender: rule.created_by || data.created_by,
              sender_name: 'Automation', type: 'system', title: rule.name,
              message: action.value || rule.description || rule.name, record_type: 'WorkboardItem',
              record_id: itemId, target_url: workboard ? `/workboards/${workboard}?item=${itemId}&tab=overview` : '', read_status: false,
            }).catch(() => {});
          }
          results.push({ action: 'notify_watchers', count: watchers.length });
        }
        break;
      }
      case 'add_comment_with_summary': {
        if (itemId) {
          await sr.entities.Comment.create({
            workspace, workboard, item: itemId, record_type: 'WorkboardItem', record_id: itemId,
            user: rule.created_by || data.created_by, user_name: 'Automation',
            body: action.value || `Automation: ${rule.name}`,
          });
          results.push({ action: 'add_comment_with_summary' });
        }
        break;
      }
      case 'add_file_note': {
        if (itemId) {
          await sr.entities.Comment.create({
            workspace, workboard, item: itemId, record_type: 'WorkboardItem', record_id: itemId,
            user: rule.created_by || data.created_by, user_name: 'Automation',
            body: action.value || 'File uploaded via automation',
          });
          results.push({ action: 'add_file_note' });
        }
        break;
      }
      case 'link_submission_to_item': {
        results.push({ action: 'link_submission_to_item', skipped: 'automatic' });
        break;
      }
    }
  }
  return results;
}