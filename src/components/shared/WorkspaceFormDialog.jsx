import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { useToast } from '@/components/ui/use-toast';

const TYPES = [
  { value: 'company_workspace', label: 'Company' },
  { value: 'department_workspace', label: 'Department' },
  { value: 'team_workspace', label: 'Team' },
  { value: 'project_workspace', label: 'Project' },
  { value: 'operations_workspace', label: 'Operations' },
];

const COLORS = ['violet', 'blue', 'emerald', 'amber', 'rose', 'cyan'];

export default function WorkspaceFormDialog({ open, onClose, onSaved }) {
  const { createWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [form, setForm] = useState({
    workspace_name: '', description: '', workspace_type: 'company_workspace',
    visibility: 'company', departments: '', color: 'violet',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        workspace_name: '', description: '', workspace_type: 'company_workspace',
        visibility: 'company', departments: '', color: 'violet',
      });
    }
  }, [open]);

  const handleSave = async () => {
    if (!form.workspace_name.trim()) return;
    setSaving(true);
    try {
      const departments = form.departments
        ? form.departments.split(',').map(d => d.trim()).filter(Boolean)
        : [];
      await createWorkspace({
        workspace_name: form.workspace_name.trim(),
        description: form.description,
        workspace_type: form.workspace_type,
        visibility: form.visibility,
        departments,
        color: form.color,
        icon: 'Building2',
      });
      toast({ title: 'Workspace created', description: form.workspace_name.trim() });
      onSaved?.();
      onClose();
    } catch (error) {
      toast({ title: 'Error creating workspace', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Create Workspace</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Workspace Name *</Label>
            <Input
              value={form.workspace_name}
              onChange={e => setForm(f => ({ ...f, workspace_name: e.target.value }))}
              placeholder="e.g. Marketing Team"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              placeholder="What is this workspace for?"
            />
          </div>
          <div>
            <Label>Workspace Type</Label>
            <Select value={form.workspace_type} onValueChange={v => setForm(f => ({ ...f, workspace_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Visibility</Label>
            <Select value={form.visibility} onValueChange={v => setForm(f => ({ ...f, visibility: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="department">Department</SelectItem>
                <SelectItem value="company">Company</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Departments (comma-separated)</Label>
            <Input
              value={form.departments}
              onChange={e => setForm(f => ({ ...f, departments: e.target.value }))}
              placeholder="e.g. Engineering, Sales, Marketing"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.workspace_name.trim()}>
              {saving ? 'Creating...' : 'Create Workspace'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}