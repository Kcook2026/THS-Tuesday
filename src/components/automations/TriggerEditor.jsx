import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TRIGGER_TYPES, getTriggerMeta } from './AutomationConstants';

export default function TriggerEditor({ triggerType, triggerConfig, onChange, boardData }) {
  const meta = getTriggerMeta(triggerType);
  let tc = {};
  try { tc = JSON.parse(triggerConfig || '{}'); } catch {}

  const updateConfig = (key, value) => {
    onChange({ triggerType, triggerConfig: JSON.stringify({ ...tc, [key]: value }) });
  };

  const renderValueInput = () => {
    if (!meta.hasValue) return null;
    const val = tc.value ?? tc.days ?? '';

    if (meta.valueType === 'status' && boardData?.statuses?.length > 0) {
      return (
        <Select value={val} onValueChange={v => updateConfig('value', v)}>
          <SelectTrigger className="h-8 w-full"><SelectValue placeholder="Select status" /></SelectTrigger>
          <SelectContent>
            {boardData.statuses.map(s => <SelectItem key={s.id} value={s.label}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
    if (meta.valueType === 'priority' && boardData?.priorities?.length > 0) {
      return (
        <Select value={val} onValueChange={v => updateConfig('value', v)}>
          <SelectTrigger className="h-8 w-full"><SelectValue placeholder="Select priority" /></SelectTrigger>
          <SelectContent>
            {boardData.priorities.map(p => <SelectItem key={p.id} value={p.label}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
    if (meta.valueType === 'group' && boardData?.groups?.length > 0) {
      return (
        <Select value={val} onValueChange={v => updateConfig('value', v)}>
          <SelectTrigger className="h-8 w-full"><SelectValue placeholder="Select group" /></SelectTrigger>
          <SelectContent>
            {boardData.groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
    if (meta.valueType === 'number') {
      return <Input type="number" className="h-8 w-24" value={val} onChange={e => updateConfig('days', e.target.value)} placeholder="0" />;
    }
    return <Input className="h-8 w-full" value={val} onChange={e => updateConfig('value', e.target.value)} />;
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">When this happens</Label>
        <Select value={triggerType} onValueChange={v => onChange({ triggerType: v, triggerConfig: '{}' })}>
          <SelectTrigger className="h-9"><SelectValue placeholder="Select trigger" /></SelectTrigger>
          <SelectContent>
            <SelectItem disabled className="font-semibold text-muted-foreground">Item Events</SelectItem>
            {TRIGGER_TYPES.filter(t => t.category === 'item').map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            <SelectItem disabled className="font-semibold text-muted-foreground">Form Events</SelectItem>
            {TRIGGER_TYPES.filter(t => t.category === 'form').map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            <SelectItem disabled className="font-semibold text-muted-foreground">Date Events</SelectItem>
            {TRIGGER_TYPES.filter(t => t.category === 'date').map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            <SelectItem disabled className="font-semibold text-muted-foreground">Manual</SelectItem>
            {TRIGGER_TYPES.filter(t => t.category === 'manual').map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {meta.hasValue && (
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            {meta.valueLabel === 'days' ? 'Number of days' : `${meta.valueLabel || 'value'}`}
          </Label>
          {renderValueInput()}
        </div>
      )}
    </div>
  );
}