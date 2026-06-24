import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/lib/WorkspaceContext';
import usePermissions from '@/hooks/usePermissions';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Building2, Briefcase, Users, FolderKanban, Wrench, Check, Trash2, Archive } from 'lucide-react';

const TYPE_ICONS = {
  company_workspace: Building2,
  department_workspace: Briefcase,
  team_workspace: Users,
  project_workspace: FolderKanban,
  operations_workspace: Wrench,
};

const TYPE_LABELS = {
  company_workspace: 'Company',
  department_workspace: 'Department',
  team_workspace: 'Team',
  project_workspace: 'Project',
  operations_workspace: 'Operations',
};

const VISIBILITY_LABELS = {
  private: 'Private',
  department: 'Department',
  company: 'Company-wide',
};

export default function WorkspaceSettings() {
  const { user, currentWorkspace, currentWorkspaceId, workspaces, refresh, isAdmin } = useWorkspace();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [workspaceType, setWorkspaceType] = useState('company_workspace');
  const [visibility, setVisibility] = useState('company');
  const [departments, setDepartments] = useState('');
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmName, setConfirmName] = useState('');

  useEffect(() => {
    if (currentWorkspace) {
      setName(currentWorkspace.workspace_name || '');
      setDescription(currentWorkspace.description || '');
      setWorkspaceType(currentWorkspace.workspace_type || 'company_workspace');
      setVisibility(currentWorkspace.visibility || 'company');
      setDepartments((currentWorkspace.departments || []).join(', '));
    }
  }, [currentWorkspace]);

  const handleSave = async () => {
    if (!currentWorkspaceId) return;
    setSaving(true);
    try {
      const deptList = departments.split(',').map(d => d.trim()).filter(Boolean);
      await base44.entities.Workspace.update(currentWorkspaceId, {
        workspace_name: name,
        description,
        workspace_type: workspaceType,
        visibility,
        departments: deptList,
      });
      toast({ title: 'Workspace updated' });
      refresh();
    } catch (e) {
      toast({ title: 'Failed to update', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async (data) => {
    setSaving(true);
    try {
      const ws = await base44.entities.Workspace.create({
        workspace_name: data.name,
        description: data.description,
        workspace_type: data.workspaceType,
        visibility: data.visibility,
        owner: user.id,
        status: 'active',
        departments: data.departments ? data.departments.split(',').map(d => d.trim()).filter(Boolean) : [],
        color: 'violet',
        icon: 'Building2',
      });
      await base44.entities.WorkspaceMember.create({
        workspace: ws.id,
        workspace_name: ws.workspace_name,
        user: user.id,
        user_name: user.full_name,
        user_email: user.email,
        role: 'workspace_owner',
        status: 'active',
        invited_by: user.id,
        created_by: user.id,
        joined_date: new Date().toISOString().split('T')[0],
      });
      toast({ title: 'Workspace created', description: ws.workspace_name });
      setCreateOpen(false);
      refresh();
    } catch (e) {
      toast({ title: 'Failed to create', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const { switchWorkspace } = useWorkspace();
  
  const handleArchiveWorkspace = async () => {
    if (!currentWorkspaceId) return;
    setSaving(true);
    try {
      // Archive all related workboards first
      const workboards = await base44.entities.Workboard.filter({ workspace: currentWorkspaceId });
      await Promise.all(workboards.map(wb => base44.entities.Workboard.update(wb.id, { status: 'archived' })));
      
      // Archive workspace
      await base44.entities.Workspace.update(currentWorkspaceId, { status: 'archived' });
      toast({ title: 'Workspace archived', description: currentWorkspace?.workspace_name, duration: 3000 });
      setArchiveOpen(false);
      await refresh();
      // Switch to another active workspace if available
      const remainingActive = workspaces.filter(w => w.id !== currentWorkspaceId && w.status !== 'archived');
      if (remainingActive.length > 0) {
        switchWorkspace(remainingActive[0].id);
      }
    } catch (e) {
      toast({ title: 'Failed to archive', description: e.message, variant: 'destructive', duration: 6000 });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!currentWorkspaceId) return;
    if (confirmName !== currentWorkspace?.workspace_name) {
      toast({ title: 'Confirmation failed', description: 'Please type the workspace name correctly', variant: 'destructive', duration: 6000 });
      return;
    }
    setSaving(true);
    try {
      // Cascade delete all related records
      const workboards = await base44.entities.Workboard.filter({ workspace: currentWorkspaceId });
      
      // Delete all workboard items, groups, columns, members for each workboard
      for (const wb of workboards) {
        const [items, groups, columns, statuses, priorities, wbMembers] = await Promise.all([
          base44.entities.WorkboardItem.filter({ workboard: wb.id }),
          base44.entities.BoardGroup.filter({ workboard: wb.id }),
          base44.entities.BoardColumn.filter({ workboard: wb.id }),
          base44.entities.StatusOption.filter({ workboard: wb.id }),
          base44.entities.PriorityOption.filter({ workboard: wb.id }),
          base44.entities.WorkboardMember.filter({ workboard: wb.id }),
        ]);
        
        // Delete items first
        for (const item of items) await base44.entities.WorkboardItem.delete(item.id);
        // Then groups, columns, statuses, priorities
        for (const g of groups) await base44.entities.BoardGroup.delete(g.id);
        for (const c of columns) await base44.entities.BoardColumn.delete(c.id);
        for (const s of statuses) await base44.entities.StatusOption.delete(s.id);
        for (const p of priorities) await base44.entities.PriorityOption.delete(p.id);
        for (const m of wbMembers) await base44.entities.WorkboardMember.delete(m.id);
        
        // Finally delete the workboard
        await base44.entities.Workboard.delete(wb.id);
      }
      
      // Delete other related records
      const [projects, teams, wsMembers] = await Promise.all([
        base44.entities.Project.filter({ workspace: currentWorkspaceId }),
        base44.entities.Team.filter({ workspace: currentWorkspaceId }),
        base44.entities.WorkspaceMember.filter({ workspace: currentWorkspaceId }),
      ]);
      
      for (const p of projects) await base44.entities.Project.delete(p.id);
      for (const t of teams) await base44.entities.Team.delete(t.id);
      for (const m of wsMembers) {
        if (m.user !== user.id) await base44.entities.WorkspaceMember.delete(m.id);
      }
      
      // Finally delete the workspace
      await base44.entities.Workspace.delete(currentWorkspaceId);
      
      toast({ title: 'Workspace deleted', description: currentWorkspace?.workspace_name, duration: 3000 });
      setDeleteOpen(false);
      refresh();
      // Switch to another workspace or show create workspace
      const remainingActive = workspaces.filter(w => w.id !== currentWorkspaceId && w.status !== 'archived');
      if (remainingActive.length > 0) {
        switchWorkspace(remainingActive[0].id);
      }
    } catch (e) {
      toast({ title: 'Failed to delete', description: e.message, variant: 'destructive', duration: 6000 });
    } finally {
      setSaving(false);
    }
  };

  if (!currentWorkspace) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Workspace Settings" subtitle="Manage workspace details and configuration">
        {isAdmin && (
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <Plus className="w-4 h-4" /> Create Workspace
          </Button>
        )}
      </PageHeader>

      {/* Current Workspace */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Workspace</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              {React.createElement(TYPE_ICONS[workspaceType] || Building2, { className: 'w-5 h-5 text-primary-foreground' })}
            </div>
            <div>
              <p className="text-sm font-medium">{currentWorkspace.workspace_name}</p>
              <p className="text-xs text-muted-foreground">
                {TYPE_LABELS[workspaceType]} · {VISIBILITY_LABELS[visibility]} · {currentWorkspace.status}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ws-name">Workspace Name</Label>
              <Input id="ws-name" value={name} onChange={e => setName(e.target.value)} disabled={!isAdmin} />
            </div>
            <div>
              <Label>Workspace Type</Label>
              <Select value={workspaceType} onValueChange={setWorkspaceType} disabled={!isAdmin}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="company_workspace">Company Workspace</SelectItem>
                  <SelectItem value="department_workspace">Department Workspace</SelectItem>
                  <SelectItem value="team_workspace">Team Workspace</SelectItem>
                  <SelectItem value="project_workspace">Project Workspace</SelectItem>
                  <SelectItem value="operations_workspace">Operations Workspace</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="ws-desc">Description</Label>
            <Textarea id="ws-desc" value={description} onChange={e => setDescription(e.target.value)} rows={2} disabled={!isAdmin} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Visibility</Label>
              <Select value={visibility} onValueChange={setVisibility} disabled={!isAdmin}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                  <SelectItem value="company">Company-wide</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="ws-dept">Departments (comma-separated)</Label>
              <Input id="ws-dept" value={departments} onChange={e => setDepartments(e.target.value)} placeholder="Engineering, Sales, Marketing" disabled={!isAdmin} />
            </div>
          </div>

          {isAdmin && (
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setArchiveOpen(true)} disabled={saving}>
                  <Archive className="w-4 h-4 mr-2" /> Archive Workspace
                </Button>
                <Button variant="destructive" onClick={() => setDeleteOpen(true)} disabled={saving}>
                  <Trash2 className="w-4 h-4 mr-2" /> Delete Workspace
                </Button>
              </div>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Workspaces */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All Workspaces</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {workspaces.map(ws => {
                const Icon = TYPE_ICONS[ws.workspace_type] || Building2;
                return (
                  <div key={ws.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate flex items-center gap-2">
                        {ws.workspace_name}
                        {ws.id === currentWorkspaceId && <Check className="w-3.5 h-3.5 text-green-500" />}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {TYPE_LABELS[ws.workspace_type]} · {VISIBILITY_LABELS[ws.visibility]}
                      </p>
                    </div>
                    <Badge variant={ws.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                      {ws.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} onCreate={handleCreate} saving={saving} />
      
      {/* Archive Dialog */}
      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Archiving "{currentWorkspace?.workspace_name}" will hide it from the workspace switcher but preserve all data.
            </p>
            <p className="text-sm text-muted-foreground">
              Only System Admins and Workspace Owners can archive workspaces.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveOpen(false)}>Cancel</Button>
            <Button onClick={handleArchiveWorkspace} disabled={saving}>
              {saving ? 'Archiving...' : 'Archive Workspace'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              This will permanently delete "{currentWorkspace?.workspace_name}". This action cannot be undone.
            </p>
            <div>
              <Label htmlFor="confirm-delete">Type workspace name to confirm</Label>
              <Input 
                id="confirm-delete" 
                value={confirmName} 
                onChange={e => setConfirmName(e.target.value)} 
                placeholder={currentWorkspace?.workspace_name} 
              />
            </div>
            <p className="text-sm text-amber-600 font-medium">
              ⚠️ Warning: This will permanently delete ALL workboards, items, projects, teams, and members in this workspace.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteWorkspace} disabled={saving || confirmName !== currentWorkspace?.workspace_name}>
              {saving ? 'Deleting...' : 'Delete Workspace'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateWorkspaceDialog({ open, onOpenChange, onCreate, saving }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [workspaceType, setWorkspaceType] = useState('team_workspace');
  const [visibility, setVisibility] = useState('company');
  const [departments, setDepartments] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) return;
    onCreate({ name, description, workspaceType, visibility, departments });
    setName(''); setDescription(''); setWorkspaceType('team_workspace'); setVisibility('company'); setDepartments('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Workspace</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="new-ws-name">Workspace Name</Label>
            <Input id="new-ws-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Marketing Team" />
          </div>
          <div>
            <Label htmlFor="new-ws-desc">Description</Label>
            <Textarea id="new-ws-desc" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <Select value={workspaceType} onValueChange={setWorkspaceType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="company_workspace">Company</SelectItem>
                  <SelectItem value="department_workspace">Department</SelectItem>
                  <SelectItem value="team_workspace">Team</SelectItem>
                  <SelectItem value="project_workspace">Project</SelectItem>
                  <SelectItem value="operations_workspace">Operations</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Visibility</Label>
              <Select value={visibility} onValueChange={setVisibility}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                  <SelectItem value="company">Company-wide</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="new-ws-dept">Departments (comma-separated)</Label>
            <Input id="new-ws-dept" value={departments} onChange={e => setDepartments(e.target.value)} placeholder="Engineering, Design" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !name.trim()}>
            {saving ? 'Creating...' : 'Create Workspace'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}