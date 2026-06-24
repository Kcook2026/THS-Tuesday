import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { useToast } from '@/components/ui/use-toast';
import { Building2, Briefcase, Users, FolderKanban, Wrench } from 'lucide-react';

const TYPES = [
  { value: 'company_workspace', label: 'Company', icon: Building2, desc: 'Your entire organization' },
  { value: 'department_workspace', label: 'Department', icon: Briefcase, desc: 'A specific department' },
  { value: 'team_workspace', label: 'Team', icon: Users, desc: 'A single team' },
  { value: 'project_workspace', label: 'Project', icon: FolderKanban, desc: 'A project workspace' },
  { value: 'operations_workspace', label: 'Operations', icon: Wrench, desc: 'Operations team' },
];

const COLORS = [
  { value: 'violet', class: 'bg-violet-500' },
  { value: 'blue', class: 'bg-blue-500' },
  { value: 'emerald', class: 'bg-emerald-500' },
  { value: 'amber', class: 'bg-amber-500' },
  { value: 'rose', class: 'bg-rose-500' },
  { value: 'cyan', class: 'bg-cyan-500' },
];

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
      toast({ title: 'Workspace created', description: `${form.workspace_name.trim()} is ready to use.` });
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Create New Workspace</DialogTitle>
          <DialogDescription>
            Set up a workspace for your team. You can customize everything later.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Workspace Name *</Label>
            <Input
              value={form.workspace_name}
              onChange={e => setForm(f => ({ ...f, workspace_name: e.target.value }))}
              placeholder="e.g. Marketing Team"
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">This is how your workspace will appear in the switcher.</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Description</Label>
            <Textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              placeholder="What is this workspace for?"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Workspace Type</Label>
            <Select value={form.workspace_type} onValueChange={v => setForm(f => ({ ...f, workspace_type: v }))}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    <div className="flex items-center gap-2">
                      <t.icon className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <span className="font-medium">{t.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">{t.desc}</span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Visibility</Label>
              <Select value={form.visibility} onValueChange={v => setForm(f => ({ ...f, visibility: v }))}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Color</Label>
              <div className="flex items-center gap-2 h-10">
                {COLORS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setForm(f => ({ ...f, color: c.value }))}
                    className={`w-7 h-7 rounded-lg ${c.class} transition-all ${form.color === c.value ? 'ring-2 ring-offset-2 ring-foreground/20 scale-110' : 'hover:scale-105'}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Departments</Label>
            <Input
              value={form.departments}
              onChange={e => setForm(f => ({ ...f, departments: e.target.value }))}
              placeholder="e.g. Engineering, Sales, Marketing"
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">Comma-separated list of departments in this workspace.</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onClose} className="min-w-[80px]">Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.workspace_name.trim()} className="min-w-[140px]">
            {saving ? 'Creating...' : 'Create Workspace'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}