import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, X } from 'lucide-react';
import { ACTION_TYPES, getActionMeta } from './AutomationConstants';
import SearchablePicker from './SearchablePicker';
import {
  buildStatusOptions, buildPriorityOptions, buildGroupOptions,
  buildUserOptions, buildColumnOptions, buildBoardOptions,
  getColumnChoices, findColumn,
} from './PickerOptions';

export default function ActionEditor({ actions, onChange, boardData }) {
  let parsed = [];
  try { parsed = JSON.parse(actions || '[]'); } catch {}

  const update = (idx, field, value) => {
    const next = [...parsed];
    next[idx] = { ...next[idx], [field]: value };
    onChange(JSON.stringify(next));
  };

  const updateType = (idx, newType) => {
    const base = { type: newType };
    if (newType === 'create_sub_item') {
      base.value = ''; base.target_workboard = null; base.use_parent_group = true; base.target_group = null;
    } else if (newType === 'notify_specific_user') {
      base.value = ''; base.message = '';
    } else if (newType === 'set_custom_column') {
      base.column = ''; base.value = '';
    } else if (newType === 'clear_custom_column') {
      base.column = '';
    } else {
      base.value = '';
    }
    const next = [...parsed];
    next[idx] = base;
    onChange(JSON.stringify(next));
  };

  const add = () => {
    onChange(JSON.stringify([...parsed, { type: 'change_status', value: '' }]));
  };

  const remove = (idx) => {
    onChange(JSON.stringify(parsed.filter((_, i) => i !== idx)));
  };

  const renderStandardPicker = (action, idx, meta) => {
    if (meta.valueType === 'status') {
      return (
        <SearchablePicker value={action.value || ''} onValueChange={v => update(idx, 'value', v)}
          options={buildStatusOptions(boardData?.statuses, boardData?.boardMap)}
          placeholder="Select status" emptyMessage="No statuses found" className="w-44" />
      );
    }
    if (meta.valueType === 'priority') {
      return (
        <SearchablePicker value={action.value || ''} onValueChange={v => update(idx, 'value', v)}
          options={buildPriorityOptions(boardData?.priorities, boardData?.boardMap)}
          placeholder="Select priority" emptyMessage="No priorities found" className="w-44" />
      );
    }
    if (meta.valueType === 'user') {
      return (
        <SearchablePicker value={action.value || ''} onValueChange={v => update(idx, 'value', v)}
          options={buildUserOptions(boardData?.users)}
          placeholder="Select user" emptyMessage="No active users found" className="w-44" />
      );
    }
    if (meta.valueType === 'group') {
      return (
        <SearchablePicker value={action.value || ''} onValueChange={v => update(idx, 'value', v)}
          options={buildGroupOptions(boardData?.groups, boardData?.boardMap)}
          placeholder="Select group" emptyMessage="No groups found" className="w-44" />
      );
    }
    return <Input className="h-8 flex-1 min-w-40" value={action.value || ''} onChange={e => update(idx, 'value', e.target.value)} placeholder={meta.valueLabel || 'Value'} />;
  };

  const renderCustomColumnFields = (action, idx) => {
    const column = findColumn(boardData?.columns, action.column);
    const choices = column ? getColumnChoices(column) : [];

    let valuePicker = null;
    if (column) {
      if (column.column_type === 'status') {
        valuePicker = (
          <SearchablePicker value={action.value || ''} onValueChange={v => update(idx, 'value', v)}
            options={buildStatusOptions(boardData?.statuses, boardData?.boardMap)}
            placeholder="Status value" emptyMessage="No statuses" className="w-44" />
        );
      } else if (column.column_type === 'priority') {
        valuePicker = (
          <SearchablePicker value={action.value || ''} onValueChange={v => update(idx, 'value', v)}
            options={buildPriorityOptions(boardData?.priorities, boardData?.boardMap)}
            placeholder="Priority value" emptyMessage="No priorities" className="w-44" />
        );
      } else if (column.column_type === 'person') {
        valuePicker = (
          <SearchablePicker value={action.value || ''} onValueChange={v => update(idx, 'value', v)}
            options={buildUserOptions(boardData?.users)}
            placeholder="Select person" emptyMessage="No users" className="w-44" />
        );
      } else if (column.column_type === 'dropdown' || column.column_type === 'multi_select') {
        valuePicker = (
          <SearchablePicker value={action.value || ''} onValueChange={v => update(idx, 'value', v)}
            options={choices.map(c => ({ value: c, label: c }))}
            placeholder="Select option" emptyMessage="No choices configured" className="w-44" />
        );
      } else if (column.column_type === 'date') {
        valuePicker = <Input type="date" className="h-8 w-44" value={action.value || ''} onChange={e => update(idx, 'value', e.target.value)} />;
      } else if (column.column_type === 'number' || column.column_type === 'currency') {
        valuePicker = <Input type="number" className="h-8 w-44" value={action.value || ''} onChange={e => update(idx, 'value', e.target.value)} />;
      } else {
        valuePicker = <Input className="h-8 w-44" value={action.value || ''} onChange={e => update(idx, 'value', e.target.value)} placeholder="Value" />;
      }
    }

    return (
      <div className="flex items-center gap-2 flex-wrap pl-1">
        <SearchablePicker value={action.column || ''} onValueChange={v => update(idx, 'column', v)}
          options={buildColumnOptions(boardData?.columns, boardData?.boardMap)}
          placeholder="Select column" emptyMessage="No custom columns found" className="w-48" />
        {action.column && valuePicker}
      </div>
    );
  };

  const renderSubItemFields = (action, idx) => (
    <div className="space-y-2 pl-1">
      <Input className="h-8 w-44" value={action.value || ''} onChange={e => update(idx, 'value', e.target.value)} placeholder="Sub-item title" />
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Target workboard:</span>
        <SearchablePicker
          value={action.target_workboard || ''}
          onValueChange={v => update(idx, 'target_workboard', v || null)}
          options={[{ value: '', label: 'Use triggering item\'s workboard' }, ...buildBoardOptions(boardData?.boards)]}
          placeholder="Triggering item's workboard"
          className="w-56"
        />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Switch checked={action.use_parent_group !== false} onCheckedChange={v => update(idx, 'use_parent_group', v)} />
        <span className="text-xs text-muted-foreground">Use parent item's group</span>
        {action.use_parent_group === false && (
          <SearchablePicker
            value={action.target_group || ''} onValueChange={v => update(idx, 'target_group', v)}
            options={buildGroupOptions(boardData?.groups, boardData?.boardMap)}
            placeholder="Select group" emptyMessage="No groups found" className="w-44" />
        )}
      </div>
    </div>
  );

  const renderNotifyUserFields = (action, idx) => (
    <div className="flex items-center gap-2 flex-wrap pl-1">
      <SearchablePicker value={action.value || ''} onValueChange={v => update(idx, 'value', v)}
        options={buildUserOptions(boardData?.users)}
        placeholder="Select user" emptyMessage="No active users found" className="w-44" />
      <Input className="h-8 flex-1 min-w-40" value={action.message || ''} onChange={e => update(idx, 'message', e.target.value)} placeholder="Notification message (optional)" />
    </div>
  );

  const isComplex = (type) => ['create_sub_item', 'notify_specific_user', 'set_custom_column', 'clear_custom_column'].includes(type);

  return (
    <div className="space-y-3">
      {parsed.length === 0 && (
        <p className="text-xs text-muted-foreground">No actions — add at least one action for the automation to do something.</p>
      )}
      {parsed.map((action, idx) => {
        const meta = getActionMeta(action.type);
        const complex = isComplex(action.type);
        return (
          <div key={idx} className="space-y-2 border rounded-lg p-2.5 bg-muted/20">
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={action.type} onValueChange={v => updateType(idx, v)}>
                <SelectTrigger className="h-8 w-52"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem disabled className="font-semibold text-muted-foreground">Item Actions</SelectItem>
                  {ACTION_TYPES.filter(a => a.category === 'item').map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                  <SelectItem disabled className="font-semibold text-muted-foreground">Notifications</SelectItem>
                  {ACTION_TYPES.filter(a => a.category === 'notification').map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                  <SelectItem disabled className="font-semibold text-muted-foreground">Form Actions</SelectItem>
                  {ACTION_TYPES.filter(a => a.category === 'form').map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                  <SelectItem disabled className="font-semibold text-muted-foreground">File Actions</SelectItem>
                  {ACTION_TYPES.filter(a => a.category === 'file').map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {!complex && meta.hasValue && renderStandardPicker(action, idx, meta)}
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 ml-auto" onClick={() => remove(idx)}>
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </div>
            {action.type === 'create_sub_item' && renderSubItemFields(action, idx)}
            {action.type === 'notify_specific_user' && renderNotifyUserFields(action, idx)}
            {action.type === 'set_custom_column' && renderCustomColumnFields(action, idx)}
            {action.type === 'clear_custom_column' && renderCustomColumnFields(action, idx)}
          </div>
        );
      })}
      <Button variant="outline" size="sm" onClick={add}>
        <Plus className="w-3.5 h-3.5 mr-1.5" /> Add action
      </Button>
    </div>
  );
}