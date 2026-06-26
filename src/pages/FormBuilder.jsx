import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { FIELD_TYPES, FIELD_CATEGORIES, SYSTEM_FIELDS, FIELD_TYPES_WITH_OPTIONS, DISPLAY_ONLY_TYPES } from '@/components/forms/FormConstants';
import FormFieldRenderer from '@/components/forms/FormFieldRenderer';
import { ChevronLeft, Plus, ArrowUp, ArrowDown, Trash2, Eye, GripVertical, X } from 'lucide-react';

const STATUS_COLORS = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-emerald-100 text-emerald-700',
  archived: 'bg-amber-100 text-amber-700',
};

export default function FormBuilder() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState(null);
  const [fields, setFields] = useState([]);
  const [columns, setColumns] = useState([]);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);

  const load = useCallback(async () => {
    if (!formId) return;
    setLoading(true);
    try {
      const [f, flds, user] = await Promise.all([
        base44.entities.Form.get(formId),
        base44.entities.FormField.filter({ form: formId }),
        base44.auth.me(),
      ]);
      setForm(f);
      setFields(flds.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
      setUsers(user ? [user] : []);

      if (f?.workboard) {
        const [cols, tms, allUsers] = await Promise.all([
          base44.entities.BoardColumn.filter({ workboard: f.workboard }).catch(() => []),
          base44.entities.Team.filter({ workspace: f.workspace }).catch(() => []),
          base44.entities.User.list().catch(() => []),
        ]);
        setColumns(cols.filter(c => !c.hidden && !c.system_column));
        setTeams(tms);
        setUsers(allUsers);
      }
    } catch (e) {
      toast({ title: 'Failed to load form', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [formId]);

  useEffect(() => { load(); }, [load]);

  const updateForm = async (updates) => {
    try {
      await base44.entities.Form.update(form.id, updates);
      setForm({ ...form, ...updates });
    } catch (e) {
      toast({ title: 'Failed to save', description: e.message, variant: 'destructive' });
    }
  };

  const handleAddField = async (fieldType) => {
    const config = FIELD_TYPES[fieldType];
    try {
      const newField = await base44.entities.FormField.create({
        workspace: form.workspace,
        form: form.id,
        workboard: form.workboard,
        label: config.label,
        field_type: fieldType,
        sort_order: fields.length,
        required: false,
        hidden: false,
      });
      setFields(prev => [...prev, newField]);
      setSelectedFieldId(newField.id);
    } catch (e) {
      toast({ title: 'Failed to add field', description: e.message, variant: 'destructive' });
    }
  };

  const updateField = async (fieldId, updates) => {
    setFields(prev => prev.map(f => f.id === fieldId ? { ...f, ...updates } : f));
    try {
      await base44.entities.FormField.update(fieldId, updates);
    } catch (e) {
      toast({ title: 'Failed to save field', description: e.message, variant: 'destructive' });
      load();
    }
  };

  const handleReorder = async (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) return;
    const newFields = [...fields];
    const a = newFields[index];
    const b = newFields[targetIndex];
    const tempSort = a.sort_order;
    newFields[index] = { ...b, sort_order: tempSort };
    newFields[targetIndex] = { ...a, sort_order: b.sort_order };
    setFields(newFields);
    await Promise.all([
      base44.entities.FormField.update(b.id, { sort_order: tempSort }),
      base44.entities.FormField.update(a.id, { sort_order: b.sort_order }),
    ]).catch(() => load());
  };

  const handleDeleteField = async (fieldId) => {
    try {
      await base44.entities.FormField.delete(fieldId);
      setFields(prev => prev.filter(f => f.id !== fieldId));
      if (selectedFieldId === fieldId) setSelectedFieldId(null);
    } catch (e) {
      toast({ title: 'Failed to delete field', description: e.message, variant: 'destructive' });
    }
  };

  const handlePublish = async () => {
    const newStatus = form.status === 'active' ? 'draft' : 'active';
    await updateForm({ status: newStatus });
    toast({ title: newStatus === 'active' ? 'Form published' : 'Form unpublished', duration: 2000 });
  };

  if (loading) return <LoadingSpinner />;
  if (!form) return <div className="p-8 text-center text-muted-foreground">Form not found</div>;

  const selectedField = fields.find(f => f.id === selectedFieldId);

  const mappingValue = selectedField?.mapped_system_field
    ? `system:${selectedField.mapped_system_field}`
    : selectedField?.mapped_column
      ? `column:${selectedField.mapped_column}`
      : 'none';

  const handleMappingChange = (val) => {
    if (val === 'none') {
      updateField(selectedField.id, { mapped_system_field: null, mapped_column: null });
    } else if (val.startsWith('system:')) {
      updateField(selectedField.id, { mapped_system_field: val.replace('system:', ''), mapped_column: null });
    } else if (val.startsWith('column:')) {
      updateField(selectedField.id, { mapped_column: val.replace('column:', ''), mapped_system_field: null });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/workboards/${form.workboard}`)}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <Input
              defaultValue={form.title}
              onBlur={e => { if (e.target.value !== form.title) updateForm({ title: e.target.value }); }}
              className="text-base font-semibold border-none px-0 h-auto focus-visible:ring-0 w-64"
            />
            <Badge variant="secondary" className={STATUS_COLORS[form.status]}>{form.status}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPreviewMode(!previewMode)}>
            <Eye className="w-4 h-4 mr-1.5" /> {previewMode ? 'Exit Preview' : 'Preview'}
          </Button>
          <Button size="sm" onClick={handlePublish} disabled={fields.length === 0}>
            {form.status === 'active' ? 'Unpublish' : 'Publish'}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Field Palette */}
        {!previewMode && (
          <div className="w-56 border-r overflow-auto p-3 space-y-4 shrink-0 hidden md:block">
            {FIELD_CATEGORIES.map(cat => {
              const types = Object.entries(FIELD_TYPES).filter(([, c]) => c.category === cat.id);
              if (types.length === 0) return null;
              return (
                <div key={cat.id}>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">{cat.label}</p>
                  <div className="space-y-1">
                    {types.map(([key, config]) => {
                      const Icon = config.icon;
                      return (
                        <button
                          key={key}
                          disabled={config.comingSoon}
                          onClick={() => handleAddField(key)}
                          className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span className="flex-1 truncate">{config.label}</span>
                          {config.comingSoon && <span className="text-[10px] text-muted-foreground">Soon</span>}
                          {!config.comingSoon && <Plus className="w-3 h-3 text-muted-foreground" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Center: Form Preview */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="space-y-2 pb-4 border-b">
              <Textarea
                defaultValue={form.description || ''}
                onBlur={e => { if (e.target.value !== (form.description || '')) updateForm({ description: e.target.value }); }}
                placeholder="Form description..."
                className="border-none px-0 focus-visible:ring-0 text-sm text-muted-foreground resize-none"
                rows={2}
              />
            </div>

            {fields.length === 0 ? (
              <div className="rounded-lg border border-dashed p-12 text-center">
                <p className="text-sm text-muted-foreground mb-3">No fields yet. Add fields from the left panel.</p>
                <Button variant="outline" onClick={() => handleAddField('short_text')}>
                  <Plus className="w-4 h-4 mr-1.5" /> Add Short Text
                </Button>
              </div>
            ) : (
              fields.map((field, index) => (
                <div
                  key={field.id}
                  className={`relative rounded-lg border p-4 transition-colors ${
                    selectedFieldId === field.id ? 'border-primary ring-1 ring-primary/30' : 'border-border'
                  } ${!previewMode ? 'cursor-pointer' : ''}`}
                  onClick={() => !previewMode && setSelectedFieldId(field.id)}
                >
                  {!previewMode && (
                    <div className="absolute right-2 top-2 flex items-center gap-0.5">
                      <button onClick={(e) => { e.stopPropagation(); handleReorder(index, 'up'); }} disabled={index === 0} className="p-1 hover:bg-accent rounded disabled:opacity-30">
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleReorder(index, 'down'); }} disabled={index === fields.length - 1} className="p-1 hover:bg-accent rounded disabled:opacity-30">
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteField(field.id); }} className="p-1 hover:bg-destructive/10 hover:text-destructive rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <FormFieldRenderer
                    field={field}
                    value={null}
                    onChange={() => {}}
                    readOnly={false}
                    users={users}
                    teams={teams}
                  />
                  {(field.mapped_system_field || field.mapped_column) && !previewMode && (
                    <p className="text-xs text-primary mt-2">
                      Maps to: {field.mapped_system_field ? SYSTEM_FIELDS.find(s => s.value === field.mapped_system_field)?.label : columns.find(c => c.id === field.mapped_column)?.name}
                    </p>
                  )}
                </div>
              ))
            )}

            {!previewMode && (
              <Button variant="outline" className="w-full border-dashed" onClick={() => handleAddField('short_text')}>
                <Plus className="w-4 h-4 mr-1.5" /> Add Field
              </Button>
            )}
          </div>
        </div>

        {/* Right: Field Settings */}
        {!previewMode && (
          <div className="w-72 border-l overflow-auto p-4 space-y-4 shrink-0 hidden md:block">
            {selectedField ? (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Field Settings</h3>
                  <button onClick={() => setSelectedFieldId(null)} className="p-1 hover:bg-accent rounded">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Label</Label>
                    <Input
                      defaultValue={selectedField.label}
                      onBlur={e => { if (e.target.value !== selectedField.label) updateField(selectedField.id, { label: e.target.value }); }}
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Field Type</Label>
                    <p className="text-sm text-muted-foreground">{FIELD_TYPES[selectedField.field_type]?.label}</p>
                  </div>

                  {!DISPLAY_ONLY_TYPES.includes(selectedField.field_type) && (
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Required</Label>
                      <Switch
                        checked={selectedField.required}
                        onCheckedChange={checked => updateField(selectedField.id, { required: checked })}
                      />
                    </div>
                  )}

                  <div>
                    <Label className="text-xs">Help Text</Label>
                    <Input
                      defaultValue={selectedField.help_text || ''}
                      onBlur={e => { if (e.target.value !== (selectedField.help_text || '')) updateField(selectedField.id, { help_text: e.target.value }); }}
                      placeholder="Shown below field"
                    />
                  </div>

                  {!DISPLAY_ONLY_TYPES.includes(selectedField.field_type) && (
                    <div>
                      <Label className="text-xs">Placeholder</Label>
                      <Input
                        defaultValue={selectedField.placeholder || ''}
                        onBlur={e => { if (e.target.value !== (selectedField.placeholder || '')) updateField(selectedField.id, { placeholder: e.target.value }); }}
                        placeholder="e.g. Enter text..."
                      />
                    </div>
                  )}

                  {FIELD_TYPES_WITH_OPTIONS.includes(selectedField.field_type) && (
                    <OptionsEditor field={selectedField} onUpdate={updateField} />
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
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">Select a field to edit its settings</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function OptionsEditor({ field, onUpdate }) {
  const [newOption, setNewOption] = useState('');

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

  return (
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
  );
}