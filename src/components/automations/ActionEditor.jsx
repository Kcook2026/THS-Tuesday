import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X } from 'lucide-react';
import { ACTION_TYPES, getActionMeta } from './AutomationConstants';

export default function ActionEditor({ actions, onChange, boardData }) {
  let parsed = [];
  try { parsed = JSON.parse(actions || '[]'); } catch {}

  const update = (idx, field, value) => {
    const next = [...parsed];
    next[idx] = { ...next[idx], [field]: value };
    onChange(JSON.stringify(next));
  };

  const add = () => {
    onChange(JSON.stringify([...parsed, { type: 'change_status', value: '' }]));
  };

  const remove = (idx) => {
    onChange(JSON.stringify(parsed.filter((_, i) => i !== idx)));
  };

  const renderValueInput = (action, idx) => {
    const meta = getActionMeta(action.type);
    if (!meta.hasValue) return null;

    if (meta.valueType === 'status' && boardData?.statuses?.length > 0) {
      return (
        <Select value={action.value || ''} onValueChange={v => update(idx, 'value', v)}>
          <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Select status" /></SelectTrigger>
          <SelectContent>
            {boardData.statuses.map(s => <SelectItem key={s.id} value={s.label}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
    if (meta.valueType === 'priority' && boardData?.priorities?.length > 0) {
      return (
        <Select value={action.value || ''} onValueChange={v => update(idx, 'value', v)}>
          <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Select priority" /></SelectTrigger>
          <SelectContent>
            {boardData.priorities.map(p => <SelectItem key={p.id} value={p.label}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
    if (meta.valueType === 'user' && boardData?.users?.length > 0) {
      return (
        <Select value={action.value || ''} onValueChange={v => update(idx, 'value', v)}>
          <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Select user" /></SelectTrigger>
          <SelectContent>
            {boardData.users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
    if (meta.valueType === 'group' && boardData?.groups?.length > 0) {
      return (
        <Select value={action.value || ''} onValueChange={v => update(idx, 'value', v)}>
          <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Select group" /></SelectTrigger>
          <SelectContent>
            {boardData.groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
    return <Input className="h-8 flex-1 min-w-40" value={action.value || ''} onChange={e => update(idx, 'value', e.target.value)} placeholder={meta.valueLabel || 'Value'} />;
  };

  return (
    <div className="space-y-3">
      {parsed.length === 0 && (
        <p className="text-xs text-muted-foreground">No actions — add at least one action for the automation to do something.</p>
      )}
      {parsed.map((action, idx) => (
        <div key={idx} className="flex items-center gap-2 flex-wrap">
          <Select value={action.type} onValueChange={v => update(idx, 'type', v)}>
            <SelectTrigger className="h-8 w-48"><SelectValue /></SelectTrigger>
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
          {renderValueInput(action, idx)}
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => remove(idx)}>
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add}>
        <Plus className="w-3.5 h-3.5 mr-1.5" /> Add action
      </Button>
    </div>
  );
}