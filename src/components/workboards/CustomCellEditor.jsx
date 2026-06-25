import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, X, ChevronDown } from 'lucide-react';
import { parseSettings } from './CustomCellRenderer';

/**
 * Inline editor for custom column values.
 * Calls onSave(value, displayValue) on commit.
 * Calls onCancel when the user dismisses without saving.
 */
export default function CustomCellEditor({ column, valueRecord, users = [], teams = [], onSave, onCancel, canEdit }) {
  const colType = column?.column_type || 'text';
  const settings = parseSettings(column);
  const existingValue = valueRecord?.value || '';
  const [editValue, setEditValue] = useState(existingValue);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const handleSave = async (val) => {
    if (saving) return;
    setSaving(true);
    try {
      await onSave(val);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave(editValue);
    if (e.key === 'Escape') onCancel();
  };

  // -- Type-specific renderers --

  if (colType === 'checkbox') {
    return (
      <Checkbox
        checked={editValue === 'true'}
        onCheckedChange={async (checked) => {
          const val = checked ? 'true' : 'false';
          setEditValue(val);
          await handleSave(val);
        }}
      />
    );
  }

  if (colType === 'dropdown') {
    const options = settings.options || [];
    return (
      <Select
        value={editValue}
        onValueChange={async (v) => { setEditValue(v); await handleSave(v); }}
        onOpenChange={(open) => { if (!open) onCancel(); }}
      >
        <SelectTrigger className="h-7 w-full"><SelectValue placeholder="Select..." /></SelectTrigger>
        <SelectContent>
          {options.map((opt, i) => (
            <SelectItem key={i} value={opt}>{opt}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (colType === 'multi_select' || colType === 'tags') {
    const options = settings.options || [];
    let current = [];
    try { current = JSON.parse(editValue); } catch { current = editValue.split(',').filter(Boolean); }
    if (!Array.isArray(current)) current = [];

    const toggle = async (opt) => {
      const next = current.includes(opt) ? current.filter(o => o !== opt) : [...current, opt];
      const val = JSON.stringify(next);
      setEditValue(val);
      await handleSave(val);
    };

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 w-full justify-between text-xs">
            {current.length > 0 ? `${current.length} selected` : 'Select...'}
            <ChevronDown className="w-3 h-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-1" align="start">
          {options.length === 0 ? (
            <p className="text-xs text-muted-foreground p-2">No options configured</p>
          ) : (
            options.map((opt, i) => (
              <button
                key={i}
                onClick={() => toggle(opt)}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-accent text-left text-sm"
              >
                <Checkbox checked={current.includes(opt)} className="pointer-events-none" />
                {opt}
              </button>
            ))
          )}
          <div className="border-t mt-1 pt-1 px-1">
            <Button size="sm" variant="ghost" className="w-full h-7" onClick={onCancel}>Done</Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  if (colType === 'person') {
    return (
      <Select
        value={editValue}
        onValueChange={async (v) => { setEditValue(v); await handleSave(v); }}
        onOpenChange={(open) => { if (!open) onCancel(); }}
      >
        <SelectTrigger className="h-7 w-full"><SelectValue placeholder="Select user..." /></SelectTrigger>
        <SelectContent>
          <SelectItem value={null}>Unassigned</SelectItem>
          {users.map(u => (
            <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (colType === 'team') {
    return (
      <Select
        value={editValue}
        onValueChange={async (v) => { setEditValue(v); await handleSave(v); }}
        onOpenChange={(open) => { if (!open) onCancel(); }}
      >
        <SelectTrigger className="h-7 w-full"><SelectValue placeholder="Select team..." /></SelectTrigger>
        <SelectContent>
          <SelectItem value={null}>None</SelectItem>
          {teams.map(t => (
            <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (colType === 'department') {
    const depts = settings.departments || ['Engineering', 'Design', 'Marketing', 'Sales', 'Operations', 'Finance', 'HR'];
    return (
      <Select
        value={editValue}
        onValueChange={async (v) => { setEditValue(v); await handleSave(v); }}
        onOpenChange={(open) => { if (!open) onCancel(); }}
      >
        <SelectTrigger className="h-7 w-full"><SelectValue placeholder="Select..." /></SelectTrigger>
        <SelectContent>
          <SelectItem value={null}>None</SelectItem>
          {depts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
        </SelectContent>
      </Select>
    );
  }

  if (colType === 'progress') {
    return (
      <Input
        ref={inputRef}
        type="number"
        min="0"
        max="100"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={() => handleSave(editValue)}
        onKeyDown={handleKeyDown}
        className="h-7 w-16"
        disabled={saving}
      />
    );
  }

  // Simple input types: text, long_text, number, currency, date, email, phone, link
  const inputProps = {
    ref: inputRef,
    value: editValue,
    onChange: (e) => setEditValue(e.target.value),
    onKeyDown: handleKeyDown,
    onBlur: () => handleSave(editValue),
    className: 'h-7 w-full',
    disabled: saving,
  };

  if (colType === 'number' || colType === 'currency') {
    return <Input {...inputProps} type="number" step={colType === 'currency' ? '0.01' : '1'} />;
  }
  if (colType === 'date') {
    return <Input {...inputProps} type="date" />;
  }
  if (colType === 'email') {
    return <Input {...inputProps} type="email" />;
  }
  if (colType === 'phone') {
    return <Input {...inputProps} type="tel" />;
  }
  if (colType === 'link') {
    return <Input {...inputProps} type="url" />;
  }
  if (colType === 'long_text') {
    return (
      <textarea
        {...inputProps}
        className="h-auto min-h-[60px] text-sm w-full resize-none border rounded-md px-3 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
      />
    );
  }

  return <Input {...inputProps} />;
}