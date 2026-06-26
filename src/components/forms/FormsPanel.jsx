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
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { Plus, FileText } from 'lucide-react';

export default function FormsPanel({ board, workspaceId, users, items, onItemClick }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', description: '' });
  const [saving, setSaving] = useState(false);

  const loadForms = useCallback(async () => {
    if (!board?.id) return;
    setLoading(true);
    try {
      const data = await base44.entities.Form.filter({ workboard: board.id });
      setForms(data.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch (e) {
      toast({ title: 'Failed to load forms', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [board?.id]);

  useEffect(() => { loadForms(); }, [loadForms]);

  const handleCreate = async () => {
    if (!createForm.title.trim()) return;
    setSaving(true);
    try {
      const form = await base44.entities.Form.create({
        workspace: workspaceId,
        workboard: board.id,
        title: createForm.title,
        description: createForm.description,
        status: 'draft',
        form_type: 'workboard_form',
        owner: board.owner,
        visibility: 'internal',
        builder_mode: 'classic',
        version: 1,
      });
      setShowCreate(false);
      setCreateForm({ title: '', description: '' });
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
      setForms(prev => prev.map(f => f.id === formId ? { ...f, status: 'archived', archived: true } : f));
      toast({ title: 'Form archived', duration: 2000 });
    } catch (e) {
      toast({ title: 'Failed to archive', description: e.message, variant: 'destructive' });
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Forms</h2>
          <p className="text-sm text-muted-foreground">Create forms that generate items on this board</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/forms')}>
            <FileText className="w-4 h-4 mr-1.5" /> All Forms
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Create Form
          </Button>
        </div>
      </div>

      {forms.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">No forms yet for this workboard.</p>
          <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1.5" /> Create Form</Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {forms.map(form => (
            <div
              key={form.id}
              className="rounded-lg border p-4 hover:shadow-sm transition-shadow cursor-pointer"
              onClick={() => navigate(`/forms/${form.id}/builder`)}
            >
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm truncate flex-1">{form.title}</span>
              </div>
              {form.description && <p className="text-xs text-muted-foreground line-clamp-2">{form.description}</p>}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">{form.status}</span>
                <span className="text-xs text-muted-foreground">{form.submission_count || 0} submissions</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Form</DialogTitle>
            <DialogDescription>Create a new workboard form. You'll be taken to the builder next.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Form Title</Label>
              <Input value={createForm.title} onChange={e => setCreateForm({ ...createForm, title: e.target.value })} placeholder="e.g. Equipment Request" autoFocus onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} placeholder="What is this form for?" rows={2} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !createForm.title.trim()}>
              {saving ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : 'Create & Build'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}