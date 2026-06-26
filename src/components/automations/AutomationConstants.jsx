export const TRIGGER_TYPES = [
  { value: 'item_created', label: 'Item is created', category: 'item' },
  { value: 'item_updated', label: 'Item is updated', category: 'item' },
  { value: 'status_changed', label: 'Status changes', category: 'item', hasValue: true, valueLabel: 'to', valueType: 'status' },
  { value: 'priority_changed', label: 'Priority changes', category: 'item', hasValue: true, valueLabel: 'to', valueType: 'priority' },
  { value: 'owner_changed', label: 'Owner changes', category: 'item' },
  { value: 'assignee_changed', label: 'Assignee changes', category: 'item' },
  { value: 'due_date_changed', label: 'Due date changes', category: 'item' },
  { value: 'item_moved_to_group', label: 'Item moved to group', category: 'item', hasValue: true, valueLabel: 'to', valueType: 'group' },
  { value: 'sub_item_created', label: 'Sub-item is created', category: 'item' },
  { value: 'comment_added', label: 'Comment is added', category: 'item' },
  { value: 'file_uploaded', label: 'File is uploaded', category: 'item' },
  { value: 'form_submitted', label: 'Form is submitted', category: 'form' },
  { value: 'form_submission_creates_item', label: 'Form submission creates item', category: 'form' },
  { value: 'due_date_arrives', label: 'Due date arrives', category: 'date' },
  { value: 'due_date_overdue', label: 'Due date is overdue', category: 'date' },
  { value: 'due_date_x_days_away', label: 'Due date is X days away', category: 'date', hasValue: true, valueLabel: 'days', valueType: 'number' },
  { value: 'manual', label: 'Run manually on selected item', category: 'manual' },
];

export const CONDITION_TYPES = [
  { value: 'status', label: 'Status', operators: ['equals', 'not_equals'], valueType: 'status' },
  { value: 'priority', label: 'Priority', operators: ['equals', 'not_equals'], valueType: 'priority' },
  { value: 'owner', label: 'Owner', operators: ['equals', 'not_equals'], valueType: 'user' },
  { value: 'assignee', label: 'Assignee', operators: ['equals', 'not_equals'], valueType: 'user' },
  { value: 'group', label: 'Group', operators: ['equals', 'not_equals'], valueType: 'group' },
  { value: 'due_date', label: 'Due Date', operators: ['is_empty', 'is_not_empty', 'is_before_today', 'is_after_today'] },
  { value: 'created_from_form', label: 'Created from form', operators: ['equals'] },
  { value: 'custom_column', label: 'Custom column', operators: ['equals'] },
];

export const OPERATOR_LABELS = {
  equals: 'equals',
  not_equals: 'does not equal',
  is_empty: 'is empty',
  is_not_empty: 'is not empty',
  is_before_today: 'is before today',
  is_after_today: 'is after today',
};

export const ACTION_TYPES = [
  { value: 'change_status', label: 'Change status', category: 'item', hasValue: true, valueType: 'status' },
  { value: 'change_priority', label: 'Change priority', category: 'item', hasValue: true, valueType: 'priority' },
  { value: 'assign_owner', label: 'Assign owner', category: 'item', hasValue: true, valueType: 'user' },
  { value: 'assign_assignee', label: 'Assign assignee', category: 'item', hasValue: true, valueType: 'user' },
  { value: 'move_to_group', label: 'Move to group', category: 'item', hasValue: true, valueType: 'group' },
  { value: 'create_sub_item', label: 'Create sub-item', category: 'item', hasValue: true, valueType: 'text', valueLabel: 'title' },
  { value: 'create_comment', label: 'Create update/comment', category: 'item', hasValue: true, valueType: 'text', valueLabel: 'message' },
  { value: 'archive_item', label: 'Archive item', category: 'item' },
  { value: 'notify_owner', label: 'Notify owner', category: 'notification', hasValue: true, valueType: 'text', valueLabel: 'message' },
  { value: 'notify_assignee', label: 'Notify assignee', category: 'notification', hasValue: true, valueType: 'text', valueLabel: 'message' },
  { value: 'notify_specific_user', label: 'Notify specific user', category: 'notification', hasValue: true, valueType: 'user' },
  { value: 'notify_workboard_owners', label: 'Notify workboard owners', category: 'notification', hasValue: true, valueType: 'text', valueLabel: 'message' },
  { value: 'notify_watchers', label: 'Notify watchers', category: 'notification', hasValue: true, valueType: 'text', valueLabel: 'message' },
  { value: 'link_submission_to_item', label: 'Link submission to item', category: 'form' },
  { value: 'add_comment_with_summary', label: 'Add comment with submission summary', category: 'form' },
  { value: 'add_file_note', label: 'Add file note/comment', category: 'file', hasValue: true, valueType: 'text', valueLabel: 'message' },
];

export function getTriggerMeta(type) {
  return TRIGGER_TYPES.find(t => t.value === type) || {};
}

export function getActionMeta(type) {
  return ACTION_TYPES.find(a => a.value === type) || {};
}

export function getConditionMeta(field) {
  return CONDITION_TYPES.find(c => c.value === field) || {};
}