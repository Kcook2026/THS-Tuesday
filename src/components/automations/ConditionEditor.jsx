import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X } from 'lucide-react';
import { CONDITION_TYPES, OPERATOR_LABELS, getConditionMeta } from './AutomationConstants';
import SearchablePicker from './SearchablePicker';
import {
  buildStatusOptions, buildPriorityOptions, buildGroupOptions,
  buildUserOptions, buildTeamOptions, buildColumnOptions,
  getColumnChoices, findColumn,
} from './PickerOptions';

export default function ConditionEditor({ conditions, onChange, boardData }) {
  let parsed = [];
  try { parsed = JSON.parse(conditions || '[]'); } catch {}

  const update = (idx, field, value) => {
    const next = [...parsed];
    next[idx] = { ...next[idx], [field]: value };
    onChange(JSON.stringify(next));
  };

  const updateField = (idx, newField) => {
    const meta = getConditionMeta(newField);
    const next = [...parsed];
    next[idx] = { field: newField, operator: (meta.operators || ['equals'])[0], value: '', column: '' };
    onChange(JSON.stringify(next));
  };

  const updateOperator = (idx, newOp) => {
    const next = [...parsed];
    next[idx] = { ...next[idx], operator: newOp };
    if (newOp === 'is_empty' || newOp === 'is_not_empty') {
      next[idx].value = '';
    }
    onChange(JSON.stringify(next));
  };

  const add = () => {
    onChange(JSON.stringify([...parsed, { field: 'status', operator: 'equals', value: '' }]));
  };

  const remove = (idx) => {
    onChange(JSON.stringify(parsed.filter((_, i) => i !== idx)));
  };

  const needsValue = (cond) => {
    const op = cond.operator;
    return op !== 'is_empty' && op !== 'is_not_empty' && op !== 'is_before_today' && op !== 'is_after_today';
  };

  const renderValueInput = (cond, idx) => {
    const meta = getConditionMeta(cond.field);
    if (!meta.valueType || !needsValue(cond)) return null;

    if (cond.field === 'custom_column') {
      return renderCustomColumnValueInput(cond, idx);
    }
    if (meta.valueType === 'status') {
      return (
        <SearchablePicker value={cond.value || ''} onValueChange={v => update(idx, 'value', v)}
          options={buildStatusOptions(boardData?.statuses, boardData?.boardMap)}
          placeholder="Status" emptyMessage="No statuses" className="w-36" />
      );
    }
    if (meta.valueType === 'priority') {
      return (
        <SearchablePicker value={cond.value || ''} onValueChange={v => update(idx, 'value', v)}
          options={buildPriorityOptions(boardData?.priorities, boardData?.boardMap)}
          placeholder="Priority" emptyMessage="No priorities" className="w-36" />
      );
    }
    if (meta.valueType === 'user') {
      return (
        <SearchablePicker value={cond.value || ''} onValueChange={v => update(idx, 'value', v)}
          options={buildUserOptions(boardData?.users)}
          placeholder="Select user" emptyMessage="No users found" className="w-36" />
      );
    }
    if (meta.valueType === 'group') {
      return (
        <SearchablePicker value={cond.value || ''} onValueChange={v => update(idx, 'value', v)}
          options={buildGroupOptions(boardData?.groups, boardData?.boardMap)}
          placeholder="Select group" emptyMessage="No groups" className="w-36" />
      );
    }
    if (meta.valueType === 'team') {
      return (
        <SearchablePicker value={cond.value || ''} onValueChange={v => update(idx, 'value', v)}
          options={buildTeamOptions(boardData?.teams)}
          placeholder="Select team" emptyMessage="No teams found" className="w-36" />
      );
    }
    return <Input className="h-8 w-36" value={cond.value || ''} onChange={e => update(idx, 'value', e.target.value)} placeholder="Value" />;
  };

  const renderCustomColumnValueInput = (cond, idx) => {
    const column = findColumn(boardData?.columns, cond.column);
    if (!column) {
      return (
        <SearchablePicker value={cond.column || ''} onValueChange={v => update(idx, 'column', v)}
          options={buildColumnOptions(boardData?.columns, boardData?.boardMap)}
          placeholder="Select column first" emptyMessage="No custom columns" className="w-48" />
      );
    }
    const choices = getColumnChoices(column);
    if (column.column_type === 'status') {
      return (
        <SearchablePicker value={cond.value || ''} onValueChange={v => update(idx, 'value', v)}
          options={buildStatusOptions(boardData?.statuses, boardData?.boardMap)}
          placeholder="Status value" emptyMessage="No statuses" className="w-36" />
      );
    }
    if (column.column_type === 'priority') {
      return (
        <SearchablePicker value={cond.value || ''} onValueChange={v => update(idx, 'value', v)}
          options={buildPriorityOptions(boardData?.priorities, boardData?.boardMap)}
          placeholder="Priority value" emptyMessage="No priorities" className="w-36" />
      );
    }
    if (column.column_type === 'person') {
      return (
        <SearchablePicker value={cond.value || ''} onValueChange={v => update(idx, 'value', v)}
          options={buildUserOptions(boardData?.users)}
          placeholder="Select person" emptyMessage="No users" className="w-36" />
      );
    }
    if (column.column_type === 'dropdown' || column.column_type === 'multi_select') {
      const opts = choices.map(c => ({ value: c, label: c }));
      return (
        <SearchablePicker value={cond.value || ''} onValueChange={v => update(idx, 'value', v)}
          options={opts} placeholder="Select option" emptyMessage="No choices" className="w-36" />
      );
    }
    if (column.column_type === 'date') {
      return <Input type="date" className="h-8 w-36" value={cond.value || ''} onChange={e => update(idx, 'value', e.target.value)} />;
    }
    if (column.column_type === 'number' || column.column_type === 'currency') {
      return <Input type="number" className="h-8 w-36" value={cond.value || ''} onChange={e => update(idx, 'value', e.target.value)} />;
    }
    return <Input className="h-8 w-36" value={cond.value || ''} onChange={e => update(idx, 'value', e.target.value)} placeholder="Value" />;
  };

  return (
    <div className="space-y-3">
      {parsed.length === 0 && (
        <p className="text-xs text-muted-foreground">No conditions — the automation will always run when triggered.</p>
      )}
      {parsed.map((cond, idx) => {
        const meta = getConditionMeta(cond.field);
        const isCustomColumn = cond.field === 'custom_column';
        return (
          <div key={idx} className="flex items-center gap-2 flex-wrap">
            {idx > 0 && <span className="text-xs font-medium text-muted-foreground">AND</span>}
            <Select value={cond.field} onValueChange={v => updateField(idx, v)}>
              <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONDITION_TYPES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {isCustomColumn && (
              <SearchablePicker value={cond.column || ''} onValueChange={v => update(idx, 'column', v)}
                options={buildColumnOptions(boardData?.columns, boardData?.boardMap)}
                placeholder="Select column" emptyMessage="No custom columns" className="w-48" />
            )}
            <Select value={cond.operator} onValueChange={v => updateOperator(idx, v)}>
              <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(meta.operators || ['equals']).map(op => <SelectItem key={op} value={op}>{OPERATOR_LABELS[op]}</SelectItem>)}
              </SelectContent>
            </Select>
            {renderValueInput(cond, idx)}
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => remove(idx)}>
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </div>
        );
      })}
      <Button variant="outline" size="sm" onClick={add}>
        <Plus className="w-3.5 h-3.5 mr-1.5" /> Add condition
      </Button>
    </div>
  );
}