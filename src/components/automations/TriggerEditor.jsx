import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TRIGGER_TYPES, getTriggerMeta } from './AutomationConstants';
import SearchablePicker from './SearchablePicker';
import { buildStatusOptions, buildPriorityOptions, buildGroupOptions } from './PickerOptions';

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

    if (meta.valueType === 'status') {
      return (
        <SearchablePicker
          value={val}
          onValueChange={v => updateConfig('value', v)}
          options={buildStatusOptions(boardData?.statuses, boardData?.boardMap)}
          placeholder="Select status"
          emptyMessage="No statuses found for this scope"
        />
      );
    }
    if (meta.valueType === 'priority') {
      return (
        <SearchablePicker
          value={val}
          onValueChange={v => updateConfig('value', v)}
          options={buildPriorityOptions(boardData?.priorities, boardData?.boardMap)}
          placeholder="Select priority"
          emptyMessage="No priorities found for this scope"
        />
      );
    }
    if (meta.valueType === 'group') {
      return (
        <SearchablePicker
          value={val}
          onValueChange={v => updateConfig('value', v)}
          options={buildGroupOptions(boardData?.groups, boardData?.boardMap)}
          placeholder="Select group"
          emptyMessage="No groups found for this scope"
        />
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