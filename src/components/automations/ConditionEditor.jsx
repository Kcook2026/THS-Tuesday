import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X } from 'lucide-react';
import { CONDITION_TYPES, OPERATOR_LABELS, getConditionMeta } from './AutomationConstants';

export default function ConditionEditor({ conditions, onChange, boardData }) {
  let parsed = [];
  try { parsed = JSON.parse(conditions || '[]'); } catch {}

  const update = (idx, field, value) => {
    const next = [...parsed];
    next[idx] = { ...next[idx], [field]: value };
    onChange(JSON.stringify(next));
  };

  const add = () => {
    onChange(JSON.stringify([...parsed, { field: 'status', operator: 'equals', value: '' }]));
  };

  const remove = (idx) => {
    onChange(JSON.stringify(parsed.filter((_, i) => i !== idx)));
  };

  const renderValueInput = (cond, idx) => {
    const meta = getConditionMeta(cond.field);
    if (!meta.valueType || cond.operator === 'is_empty' || cond.operator === 'is_not_empty' || cond.operator === 'is_before_today' || cond.operator === 'is_after_today') {
      return null;
    }
    if (meta.valueType === 'status' && boardData?.statuses?.length > 0) {
      return (
        <Select value={cond.value || ''} onValueChange={v => update(idx, 'value', v)}>
          <SelectTrigger className="h-8 w-32"><SelectValue placeholder="Value" /></SelectTrigger>
          <SelectContent>
            {boardData.statuses.map(s => <SelectItem key={s.id} value={s.label}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
    if (meta.valueType === 'priority' && boardData?.priorities?.length > 0) {
      return (
        <Select value={cond.value || ''} onValueChange={v => update(idx, 'value', v)}>
          <SelectTrigger className="h-8 w-32"><SelectValue placeholder="Value" /></SelectTrigger>
          <SelectContent>
            {boardData.priorities.map(p => <SelectItem key={p.id} value={p.label}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
    if (meta.valueType === 'user' && boardData?.users?.length > 0) {
      return (
        <Select value={cond.value || ''} onValueChange={v => update(idx, 'value', v)}>
          <SelectTrigger className="h-8 w-32"><SelectValue placeholder="User" /></SelectTrigger>
          <SelectContent>
            {boardData.users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
    if (meta.valueType === 'group' && boardData?.groups?.length > 0) {
      return (
        <Select value={cond.value || ''} onValueChange={v => update(idx, 'value', v)}>
          <SelectTrigger className="h-8 w-32"><SelectValue placeholder="Group" /></SelectTrigger>
          <SelectContent>
            {boardData.groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
    return <Input className="h-8 w-32" value={cond.value || ''} onChange={e => update(idx, 'value', e.target.value)} placeholder="Value" />;
  };

  return (
    <div className="space-y-3">
      {parsed.length === 0 && (
        <p className="text-xs text-muted-foreground">No conditions — the automation will always run when triggered.</p>
      )}
      {parsed.map((cond, idx) => {
        const meta = getConditionMeta(cond.field);
        return (
          <div key={idx} className="flex items-center gap-2 flex-wrap">
            {idx > 0 && <span className="text-xs font-medium text-muted-foreground">AND</span>}
            <Select value={cond.field} onValueChange={v => update(idx, 'field', v)}>
              <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONDITION_TYPES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={cond.operator} onValueChange={v => update(idx, 'operator', v)}>
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