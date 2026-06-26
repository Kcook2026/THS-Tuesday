import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { useConfirm } from '@/components/shared/ConfirmDialog';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import FormLibraryCard from '@/components/forms/FormLibraryCard';
import { Search, Archive, ChevronLeft } from 'lucide-react';

export default function ArchivedForms() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const confirm = useConfirm();
  const { currentWorkspaceId } = useWorkspace();
  const [forms, setForms] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!currentWorkspaceId) return;
    setLoading(true);
    try {
      const [f, u] = await Promise.all([
        base44.entities.Form.filter({ workspace: currentWorkspaceId }),
        base44.entities.User.list().catch(() => []),
      ]);
      setForms(f.filter(form => form.status === 'archived' || form.archived));
      setUsers(u);
    } catch (e) {
      toast({ title: 'Failed to load archived forms', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [currentWorkspaceId]);

  useEffect(() => { load(); }, [load]);

  const filteredForms = forms.filter(form => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const owner = users.find(u => u.id === form.owner);
    return (
      form.title?.toLowerCase().includes(q) ||
      (form.description || '').toLowerCase().includes(q) ||
      (owner?.full_name || '').toLowerCase().includes(q) ||
      (form.tags || []).some(t => t.toLowerCase().includes(q))
    );
  });

  const handleRestore = async (formId) => {
    try {
      await base44.entities.Form.update(formId, { status: 'draft', archived: false });
      setForms(prev => prev.filter(f => f.id !== formId));
      toast({ title: 'Form restored', duration: 2000 });
    } catch (e) {
      toast({ title: 'Failed to restore', description: e.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (form) => {
    const ok = await confirm({
      title: 'Delete Form Permanently?',
      message: `This will permanently delete "${form.title}" and all its fields and submissions. This cannot be undone.`,
      confirmLabel: 'Delete Permanently',
      requireText: form.title,
    });
    if (!ok) return;

    try {
      const fields = await base44.entities.FormField.filter({ form: form.id });
      await Promise.all(fields.map(f => base44.entities.FormField.delete(f.id).catch(() => {})));
      await base44.entities.Form.delete(form.id);
      setForms(prev => prev.filter(f => f.id !== form.id));
      toast({ title: 'Form deleted permanently', duration: 2000 });
    } catch (e) {
      toast({ title: 'Failed to delete', description: e.message, variant: 'destructive' });
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
      toast({ title: 'Form duplicated', duration: 2000 });
      navigate('/forms');
    } catch (e) {
      toast({ title: 'Failed to duplicate', description: e.message, variant: 'destructive' });
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/forms')}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Forms
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Archive className="w-6 h-6" /> Archived Forms
        </h1>
        <p className="text-sm text-muted-foreground">Restore, duplicate, or permanently delete archived forms</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search archived forms..."
          className="pl-9"
        />
      </div>

      {filteredForms.length === 0 ? (
        <div className="rounded-lg border border-dashed p-16 text-center">
          <Archive className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">No archived forms found</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredForms.map(form => (
            <FormLibraryCard
              key={form.id}
              form={form}
              users={users}
              onRestore={handleRestore}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
            />
          ))}
        </div>
      )}
    </div>
  );
}