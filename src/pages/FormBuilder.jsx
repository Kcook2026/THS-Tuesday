import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { useConfirm } from '@/components/shared/ConfirmDialog';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import {
  FIELD_TYPES, FIELD_CATEGORIES, STATUS_COLORS, STATUS_LABELS,
} from '@/components/forms/FormConstants';
import SortableFieldList from '@/components/forms/SortableFieldList';
import CanvasBuilder from '@/components/forms/CanvasBuilder';
import FieldSettings from '@/components/forms/FieldSettings';
import FormVersionHistory from '@/components/forms/FormVersionHistory';
import {
  ChevronLeft, Plus, Eye, X, History, Save, Send, Layout, List, Trash2,
} from 'lucide-react';

export default function FormBuilder() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [form, setForm] = useState(null);
  const [fields, setFields] = useState([]);
  const [columns, setColumns] = useState([]);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [canvasBlocks, setCanvasBlocks] = useState([]);
  const [selectedBlockId, setSelectedBlockId] = useState(null);

  const autosaveTimer = useRef(null);
  const formChanges = useRef({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const load = useCallback(async () => {
    if (!formId) return;
    setLoading(true);
    try {
      const [f, flds] = await Promise.all([
        base44.entities.Form.get(formId),
        base44.entities.FormField.filter({ form: formId }),
      ]);
      setForm(f);
      setFields(flds.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));

      // Parse canvas layout
      if (f.canvas_layout) {
        try { setCanvasBlocks(JSON.parse(f.canvas_layout)); } catch { setCanvasBlocks([]); }
      }

      const [allUsers, allTeams] = await Promise.all([
        base44.entities.User.list().catch(() => []),
        base44.entities.Team.filter({ workspace: f.workspace }).catch(() => []),
      ]);
      setUsers(allUsers);
      setTeams(allTeams);

      if (f.workboard) {
        const cols = await base44.entities.BoardColumn.filter({ workboard: f.workboard }).catch(() => []);
        setColumns(cols.filter(c => !c.hidden && !c.system_column));
      }
    } catch (e) {
      toast({ title: 'Failed to load form', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [formId]);

  useEffect(() => { load(); }, [load]);

  // Autosave
  const scheduleAutosave = useCallback((changes) => {
    formChanges.current = { ...formChanges.current, ...changes };
    setSaveStatus('unsaved');
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      if (Object.keys(formChanges.current).length === 0) return;
      setSaveStatus('saving');
      try {
        await base44.entities.Form.update(form.id, formChanges.current);
        setForm(prev => ({ ...prev, ...formChanges.current }));
        formChanges.current = {};
        setSaveStatus('saved');
      } catch {
        setSaveStatus('error');
      }
    }, 3000);
  }, [form?.id]);

  const updateForm = (updates) => {
    scheduleAutosave(updates);
  };

  const handleAddField = async (fieldType) => {
    const config = FIELD_TYPES[fieldType];
    try {
      const newField = await base44.entities.FormField.create({
        workspace: form.workspace,
        form: form.id,
        workboard: form.workboard || null,
        label: config.label,
        field_type: fieldType,
        sort_order: fields.length,
        required: false,
        hidden: false,
      });
      setFields(prev => [...prev, newField]);

      // If canvas mode, also add a canvas block
      if (form.builder_mode === 'canvas') {
        const newBlock = {
          id: `block-${Date.now()}`,
          type: 'field',
          span: 2,
          field_id: newField.id,
        };
        const updatedBlocks = [...canvasBlocks, newBlock];
        setCanvasBlocks(updatedBlocks);
        await base44.entities.Form.update(form.id, { canvas_layout: JSON.stringify(updatedBlocks) });
      }

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

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = fields.findIndex(f => f.id === active.id);
    const newIndex = fields.findIndex(f => f.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newFields = arrayMove(fields, oldIndex, newIndex);
    setFields(newFields);

    // Update sort orders
    const updates = newFields.map((f, i) => ({ id: f.id, sort_order: i }));
    try {
      await base44.entities.FormField.bulkUpdate(updates);
    } catch {
      // silent
    }
  };

  const handleCanvasDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = canvasBlocks.findIndex(b => b.id === active.id);
    const newIndex = canvasBlocks.findIndex(b => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newBlocks = arrayMove(canvasBlocks, oldIndex, newIndex);
    setCanvasBlocks(newBlocks);
    await base44.entities.Form.update(form.id, { canvas_layout: JSON.stringify(newBlocks) });
  };

  const handleDeleteField = async (fieldId) => {
    try {
      await base44.entities.FormField.delete(fieldId);
      setFields(prev => prev.filter(f => f.id !== fieldId));
      if (selectedFieldId === fieldId) setSelectedFieldId(null);
      // Also remove from canvas blocks
      if (form.builder_mode === 'canvas') {
        const newBlocks = canvasBlocks.filter(b => b.field_id !== fieldId);
        setCanvasBlocks(newBlocks);
        await base44.entities.Form.update(form.id, { canvas_layout: JSON.stringify(newBlocks) });
      }
    } catch (e) {
      toast({ title: 'Failed to delete field', description: e.message, variant: 'destructive' });
    }
  };

  const handleAddCanvasBlock = async (blockType) => {
    if (blockType === 'field') {
      await handleAddField('short_text');
      return;
    }
    const newBlock = {
      id: `block-${Date.now()}`,
      type: blockType,
      span: 4,
      props: {},
    };
    if (blockType === 'section' || blockType === 'header') {
      newBlock.props = { text: blockType === 'section' ? 'New Section' : 'New Header', level: 2 };
    }
    if (blockType === 'richtext') {
      newBlock.props = { content: 'Enter your rich text content here...' };
    }
    const newBlocks = [...canvasBlocks, newBlock];
    setCanvasBlocks(newBlocks);
    await base44.entities.Form.update(form.id, { canvas_layout: JSON.stringify(newBlocks) });
  };

  const handleDeleteCanvasBlock = async (blockId) => {
    const block = canvasBlocks.find(b => b.id === blockId);
    const newBlocks = canvasBlocks.filter(b => b.id !== blockId);
    setCanvasBlocks(newBlocks);
    await base44.entities.Form.update(form.id, { canvas_layout: JSON.stringify(newBlocks) });
    if (selectedBlockId === blockId) setSelectedBlockId(null);
  };

  const handleSaveVersion = async (changeDescription = '') => {
    try {
      const snapshot = {
        form: {
          title: form.title,
          description: form.description,
          canvas_layout: form.canvas_layout,
        },
        fields: fields.map(f => {
          const { id, created_date, updated_date, ...rest } = f;
          return rest;
        }),
      };
      await base44.entities.FormVersion.create({
        workspace: form.workspace,
        form: form.id,
        version_number: (form.version || 1) + 1,
        snapshot: JSON.stringify(snapshot),
        change_description: changeDescription,
        created_by: form.created_by,
      });
      await base44.entities.Form.update(form.id, { version: (form.version || 1) + 1 });
      setForm(prev => ({ ...prev, version: (prev.version || 1) + 1 }));
    } catch (e) {
      // silent
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Flush autosave
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      if (Object.keys(formChanges.current).length > 0) {
        await base44.entities.Form.update(form.id, formChanges.current);
        setForm(prev => ({ ...prev, ...formChanges.current }));
        formChanges.current = {};
      }
      await handleSaveVersion('Manual save');
      setSaveStatus('saved');
      toast({ title: 'Form saved', duration: 2000 });
    } catch (e) {
      toast({ title: 'Failed to save', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setSaving(true);
    try {
      const newStatus = form.status === 'published' || form.status === 'active' ? 'draft' : 'published';
      await base44.entities.Form.update(form.id, { status: newStatus });
      setForm(prev => ({ ...prev, status: newStatus }));
      await handleSaveVersion(newStatus === 'published' ? 'Published' : 'Unpublished');
      toast({ title: newStatus === 'published' ? 'Form published' : 'Form unpublished', duration: 2000 });
    } catch (e) {
      toast({ title: 'Failed to publish', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteForm = async () => {
    const ok = await confirm({
      title: 'Delete Form?',
      message: `This will permanently delete "${form.title}" and all its fields and submissions. This cannot be undone.`,
      confirmLabel: 'Delete Permanently',
      requireText: form.title,
    });
    if (!ok) return;

    setSaving(true);
    try {
      // Delete fields
      await Promise.all(fields.map(f => base44.entities.FormField.delete(f.id).catch(() => {})));
      // Delete versions
      const versions = await base44.entities.FormVersion.filter({ form: form.id }).catch(() => []);
      await Promise.all(versions.map(v => base44.entities.FormVersion.delete(v.id).catch(() => {})));
      // Delete form
      await base44.entities.Form.delete(form.id);
      toast({ title: 'Form deleted', duration: 2000 });
      navigate(form.workboard ? `/workboards/${form.workboard}` : '/forms');
    } catch (e) {
      toast({ title: 'Failed to delete', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!form) return <div className="p-8 text-center text-muted-foreground">Form not found</div>;

  const selectedField = fields.find(f => f.id === selectedFieldId);
  const isCanvas = form.builder_mode === 'canvas';
  const backUrl = form.workboard ? `/workboards/${form.workboard}` : '/forms';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(backUrl)}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <Input
            defaultValue={form.title}
            onBlur={e => { if (e.target.value !== form.title) updateForm({ title: e.target.value }); }}
            className="text-base font-semibold border-none px-0 h-auto focus-visible:ring-0 w-48 sm:w-64"
          />
          <Badge variant="secondary" className={STATUS_COLORS[form.status] || STATUS_COLORS.draft}>
            {STATUS_LABELS[form.status] || form.status}
          </Badge>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'unsaved' ? 'Unsaved changes' : saveStatus === 'error' ? 'Save failed' : 'Saved'}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!previewMode && (
            <div className="flex items-center rounded-md border p-0.5">
              <button
                onClick={() => updateForm({ builder_mode: 'classic' })}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${!isCanvas ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <List className="w-3.5 h-3.5" /> Classic
              </button>
              <button
                onClick={() => updateForm({ builder_mode: 'canvas' })}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${isCanvas ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Layout className="w-3.5 h-3.5" /> Canvas
              </button>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowVersionHistory(true)}>
            <History className="w-3.5 h-3.5 mr-1" /> History
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPreviewMode(!previewMode)}>
            <Eye className="w-3.5 h-3.5 mr-1" /> {previewMode ? 'Exit' : 'Preview'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
            <Save className="w-3.5 h-3.5 mr-1" /> Save
          </Button>
          <Button size="sm" onClick={handlePublish} disabled={saving || fields.length === 0}>
            {form.status === 'published' || form.status === 'active' ? 'Unpublish' : 'Publish'}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Field Palette */}
        {!previewMode && (
          <div className="w-52 border-r overflow-auto p-3 space-y-4 shrink-0 hidden md:block">
            {isCanvas ? (
              <>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Canvas Blocks</p>
                  <div className="space-y-1">
                    <button onClick={() => handleAddCanvasBlock('section')} className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left hover:bg-accent">
                      <Plus className="w-3 h-3" /> Section
                    </button>
                    <button onClick={() => handleAddCanvasBlock('divider')} className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left hover:bg-accent">
                      <Plus className="w-3 h-3" /> Divider
                    </button>
                    <button onClick={() => handleAddCanvasBlock('header')} className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left hover:bg-accent">
                      <Plus className="w-3 h-3" /> Header
                    </button>
                    <button onClick={() => handleAddCanvasBlock('richtext')} className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left hover:bg-accent">
                      <Plus className="w-3 h-3" /> Rich Text
                    </button>
                    <button onClick={() => handleAddCanvasBlock('image')} className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left hover:bg-accent">
                      <Plus className="w-3 h-3" /> Image
                    </button>
                    <button onClick={() => handleAddCanvasBlock('spacer')} className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left hover:bg-accent">
                      <Plus className="w-3 h-3" /> Spacer
                    </button>
                  </div>
                </div>
                <div className="border-t pt-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Form Fields</p>
                  <div className="space-y-1">
                    {FIELD_CATEGORIES.map(cat => {
                      const types = Object.entries(FIELD_TYPES).filter(([, c]) => c.category === cat.id);
                      return types.map(([key, config]) => {
                        if (config.comingSoon) return null;
                        const Icon = config.icon;
                        return (
                          <button key={key} onClick={() => handleAddField(key)} className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left hover:bg-accent transition-colors">
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span className="flex-1 truncate">{config.label}</span>
                            <Plus className="w-3 h-3 text-muted-foreground" />
                          </button>
                        );
                      });
                    })}
                  </div>
                </div>
              </>
            ) : (
              FIELD_CATEGORIES.map(cat => {
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
              })
            )}
            <div className="border-t pt-3">
              <Button variant="ghost" size="sm" onClick={handleDeleteForm} className="w-full justify-start text-destructive hover:text-destructive">
                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete Form
              </Button>
            </div>
          </div>
        )}

        {/* Center: Builder */}
        <div className="flex-1 overflow-auto p-6">
          <div className={isCanvas ? "max-w-4xl mx-auto" : "max-w-2xl mx-auto space-y-4"}>
            <div className="space-y-2 pb-4 border-b mb-4">
              <Textarea
                defaultValue={form.description || ''}
                onBlur={e => { if (e.target.value !== (form.description || '')) updateForm({ description: e.target.value }); }}
                placeholder="Form description..."
                className="border-none px-0 focus-visible:ring-0 text-sm text-muted-foreground resize-none"
                rows={2}
              />
            </div>

            {isCanvas ? (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCanvasDragEnd}>
                <SortableContext items={canvasBlocks.map(b => b.id)}>
                  <CanvasBuilder
                    blocks={canvasBlocks}
                    fields={fields}
                    selectedBlockId={selectedBlockId}
                    onSelectBlock={setSelectedBlockId}
                    onDeleteBlock={handleDeleteCanvasBlock}
                    onAddBlock={handleAddCanvasBlock}
                    users={users}
                    teams={teams}
                    previewMode={previewMode}
                  />
                </SortableContext>
              </DndContext>
            ) : fields.length === 0 ? (
              <div className="rounded-lg border border-dashed p-12 text-center">
                <p className="text-sm text-muted-foreground mb-3">No fields yet. Add fields from the left panel.</p>
                <Button variant="outline" onClick={() => handleAddField('short_text')}>
                  <Plus className="w-4 h-4 mr-1.5" /> Add Short Text
                </Button>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                  <SortableFieldList
                    fields={fields}
                    selectedFieldId={selectedFieldId}
                    onSelect={setSelectedFieldId}
                    onDelete={handleDeleteField}
                    onReorder={() => {}}
                    users={users}
                    teams={teams}
                    columns={columns}
                  />
                </SortableContext>
              </DndContext>
            )}

            {!previewMode && !isCanvas && (
              <Button variant="outline" className="w-full border-dashed mt-3" onClick={() => handleAddField('short_text')}>
                <Plus className="w-4 h-4 mr-1.5" /> Add Field
              </Button>
            )}
          </div>
        </div>

        {/* Right: Settings */}
        {!previewMode && !isCanvas && (
          <div className="w-72 border-l overflow-auto p-4 space-y-4 shrink-0 hidden md:block">
            <FieldSettings
              field={selectedField}
              onUpdate={updateField}
              onClose={() => setSelectedFieldId(null)}
              columns={columns}
            />
          </div>
        )}
      </div>

      {showVersionHistory && (
        <FormVersionHistory form={form} onClose={() => setShowVersionHistory(false)} />
      )}
    </div>
  );
}