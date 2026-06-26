import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { useWorkspace } from '@/lib/WorkspaceContext';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import FormLibraryCard from '@/components/forms/FormLibraryCard';
import { Search, Plus, FileText, Archive } from 'lucide-react';

export default function FormsLibrary() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentWorkspaceId } = useWorkspace();
  const [forms, setForms] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', description: '', form_type: 'standalone_form', workboard: '' });
  const [saving, setSaving] = useState(false);
  const [workboards, setWorkboards] = useState([]);

  const load = useCallback(async () => {
    if (!currentWorkspaceId) return;
    setLoading(true);
    try {
      const [f, u, wb] = await Promise.all([
        base44.entities.Form.filter({ workspace: currentWorkspaceId }),
        base44.entities.User.list().catch(() => []),
        base44.entities.Workboard.filter({ workspace: currentWorkspaceId, status: 'active' }).catch(() => []),
      ]);
      const filtered = f.filter(form => form.status !== 'archived');
      setForms(filtered.sort((a, b) => new Date(b.updated_date || b.created_date) - new Date(a.updated_date || a.created_date)));
      setUsers(u);
      setWorkboards(wb);
    } catch (e) {
      toast({ title: 'Failed to load forms', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [currentWorkspaceId]);

  useEffect(() => { load(); }, [load]);

  const filteredForms = forms.filter(form => {
    if (filterType !== 'all' && form.form_type !== filterType) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const owner = users.find(u => u.id === form.owner);
    return (
      form.title?.toLowerCase().includes(q) ||
      (form.description || '').toLowerCase().includes(q) ||
      (owner?.full_name || '').toLowerCase().includes(q) ||
      (form.tags || []).some(t => t.toLowerCase().includes(q)) ||
      (form.category || '').toLowerCase().includes(q)
    );
  });

  const handleCreate = async () => {
    if (!createForm.title.trim()) return;
    setSaving(true);
    try {
      const form = await base44.entities.Form.create({
        workspace: currentWorkspaceId,
        workboard: createForm.form_type === 'workboard_form' ? createForm.workboard : null,
        title: createForm.title,
        description: createForm.description,
        status: 'draft',
        form_type: createForm.form_type,
        owner: null,
        visibility: 'internal',
        builder_mode: 'classic',
        version: 1,
      });
      setShowCreate(false);
      setCreateForm({ title: '', description: '', form_type: 'standalone_form', workboard: '' });
      toast({ title: 'Form created', duration: 2000 });
      navigate(`/forms/${form.id}/builder`);
    } catch (e) {
      toast({ title: 'Failed to create form', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (formId) => {
    try {
      await base44.entities.Form.update(formId, { status: 'archived', archived: true });
      setForms(prev => prev.filter(f => f.id !== formId));
      toast({ title: 'Form archived', duration: 2000 });
    } catch (e) {
      toast({ title: 'Failed to archive', description: e.message, variant: 'destructive' });
    }
  };

  const handleDuplicate = async (form) => {
    try {
      const newForm = await base44.entities.Form.create({
        workspace: form.workspace,
        workboard: form.workboard,
        title: `${form.title} (Copy)`,
        description: form.description,
        status: 'draft',
        form_type: form.form_type,
        owner: form.owner,
        visibility: form.visibility,
        builder_mode: form.builder_mode,
        version: 1,
      });
      // Copy fields
      const fields = await base44.entities.FormField.filter({ form: form.id });
      if (fields.length > 0) {
        await base44.entities.FormField.bulkCreate(fields.map(f => ({
          workspace: f.workspace,
          form: newForm.id,
          workboard: f.workboard,
          label: f.label,
          field_type: f.field_type,
          required: f.required,
          help_text: f.help_text,
          placeholder: f.placeholder,
          options: f.options,
          mapped_column: f.mapped_column,
          mapped_system_field: f.mapped_system_field,
          sort_order: f.sort_order,
          hidden: f.hidden,
          column_span: f.column_span,
        })));
      }
      setForms(prev => [newForm, ...prev]);
      toast({ title: 'Form duplicated', duration: 2000 });
    } catch (e) {
      toast({ title: 'Failed to duplicate', description: e.message, variant: 'destructive' });
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Forms</h1>
          <p className="text-sm text-muted-foreground">Create and manage forms for your workspace</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/forms/archived')}>
            <Archive className="w-4 h-4 mr-1.5" /> Archived
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Create Form
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, description, owner, tags..."
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="workboard_form">Workboard Forms</SelectItem>
            <SelectItem value="standalone_form">Standalone Forms</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredForms.length === 0 ? (
        <div className="rounded-lg border border-dashed p-16 text-center">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground mb-4">
            {search || filterType !== 'all' ? 'No forms match your search.' : 'No forms yet. Create your first form to get started.'}
          </p>
          {!search && filterType === 'all' && (
            <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1.5" /> Create Form</Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredForms.map(form => (
            <FormLibraryCard
              key={form.id}
              form={form}
              users={users}
              onArchive={handleArchive}
              onDuplicate={handleDuplicate}
            />
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Form</DialogTitle>
            <DialogDescription>Choose a form type and configure basic settings.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Form Title</Label>
              <Input value={createForm.title} onChange={e => setCreateForm({ ...createForm, title: e.target.value })} placeholder="e.g. HR Request" autoFocus />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} placeholder="What is this form for?" rows={2} />
            </div>
            <div>
              <Label>Form Type</Label>
              <Select value={createForm.form_type} onValueChange={v => setCreateForm({ ...createForm, form_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standalone_form">Standalone Form (no workboard)</SelectItem>
                  <SelectItem value="workboard_form">Workboard Form (creates items)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {createForm.form_type === 'workboard_form' && (
              <div>
                <Label>Target Workboard</Label>
                <Select value={createForm.workboard} onValueChange={v => setCreateForm({ ...createForm, workboard: v })}>
                  <SelectTrigger><SelectValue placeholder="Select workboard..." /></SelectTrigger>
                  <SelectContent>
                    {workboards.map(wb => <SelectItem key={wb.id} value={wb.id}>{wb.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !createForm.title.trim() || (createForm.form_type === 'workboard_form' && !createForm.workboard)}>
              {saving ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : 'Create & Build'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}