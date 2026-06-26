import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { FIELD_TYPES, SYSTEM_FIELDS, FIELD_TYPES_WITH_OPTIONS, DISPLAY_ONLY_TYPES } from '@/components/forms/FormConstants';
import { X, Plus } from 'lucide-react';

export default function FieldSettings({ field, onUpdate, onClose, columns }) {
  const [newOption, setNewOption] = useState('');

  const mappingValue = field?.mapped_system_field
    ? `system:${field.mapped_system_field}`
    : field?.mapped_column
      ? `column:${field.mapped_column}`
      : 'none';

  const handleMappingChange = (val) => {
    if (val === 'none') {
      onUpdate(field.id, { mapped_system_field: null, mapped_column: null });
    } else if (val.startsWith('system:')) {
      onUpdate(field.id, { mapped_system_field: val.replace('system:', ''), mapped_column: null });
    } else if (val.startsWith('column:')) {
      onUpdate(field.id, { mapped_column: val.replace('column:', ''), mapped_system_field: null });
    }
  };

  const addOption = () => {
    if (!newOption.trim()) return;
    const options = [...(field.options || []), newOption.trim()];
    onUpdate(field.id, { options });
    setNewOption('');
  };

  const removeOption = (index) => {
    const options = (field.options || []).filter((_, i) => i !== index);
    onUpdate(field.id, { options });
  };

  if (!field) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">Select a field to edit its settings</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Field Settings</h3>
        <button onClick={onClose} className="p-1 hover:bg-accent rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs">Label</Label>
          <Input
            defaultValue={field.label}
            onBlur={e => { if (e.target.value !== field.label) onUpdate(field.id, { label: e.target.value }); }}
          />
        </div>

        <div>
          <Label className="text-xs">Field Type</Label>
          <p className="text-sm text-muted-foreground">{FIELD_TYPES[field.field_type]?.label}</p>
        </div>

        {!DISPLAY_ONLY_TYPES.includes(field.field_type) && (
          <div className="flex items-center justify-between">
            <Label className="text-sm">Required</Label>
            <Switch
              checked={field.required}
              onCheckedChange={checked => onUpdate(field.id, { required: checked })}
            />
          </div>
        )}

        <div>
          <Label className="text-xs">Help Text</Label>
          <Input
            defaultValue={field.help_text || ''}
            onBlur={e => { if (e.target.value !== (field.help_text || '')) onUpdate(field.id, { help_text: e.target.value }); }}
            placeholder="Shown below field"
          />
        </div>

        {!DISPLAY_ONLY_TYPES.includes(field.field_type) && (
          <div>
            <Label className="text-xs">Placeholder</Label>
            <Input
              defaultValue={field.placeholder || ''}
              onBlur={e => { if (e.target.value !== (field.placeholder || '')) onUpdate(field.id, { placeholder: e.target.value }); }}
              placeholder="e.g. Enter text..."
            />
          </div>
        )}

        {FIELD_TYPES_WITH_OPTIONS.includes(field.field_type) && (
          <div>
            <Label className="text-xs">Options</Label>
            <div className="space-y-1">
              {(field.options || []).map((opt, i) => (
                <div key={i} className="flex items-center gap-1">
                  <Input
                    defaultValue={opt}
                    onBlur={e => {
                      const options = [...(field.options || [])];
                      options[i] = e.target.value;
                      onUpdate(field.id, { options });
                    }}
                    className="h-8 text-sm"
                  />
                  <button onClick={() => removeOption(i)} className="p-1 hover:bg-destructive/10 hover:text-destructive rounded">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-1">
                <Input
                  value={newOption}
                  onChange={e => setNewOption(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } }}
                  placeholder="Add option..."
                  className="h-8 text-sm"
                />
                <Button size="sm" variant="ghost" onClick={addOption} disabled={!newOption.trim()}>
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        <div>
          <Label className="text-xs">Map to Workboard Field</Label>
          <Select value={mappingValue} onValueChange={handleMappingChange}>
            <SelectTrigger><SelectValue placeholder="No mapping" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No mapping</SelectItem>
              <SelectGroup>
                <SelectLabel>System Fields</SelectLabel>
                {SYSTEM_FIELDS.map(sf => <SelectItem key={sf.value} value={`system:${sf.value}`}>{sf.label}</SelectItem>)}
              </SelectGroup>
              {columns.length > 0 && (
                <SelectGroup>
                  <SelectLabel>Custom Columns</SelectLabel>
                  {columns.map(col => <SelectItem key={col.id} value={`column:${col.id}`}>{col.name}</SelectItem>)}
                </SelectGroup>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );
}