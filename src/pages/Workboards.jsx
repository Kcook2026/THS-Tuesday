import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Search, MoreHorizontal, Pencil, Trash2, LayoutGrid, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { logActivity } from '@/hooks/useActivityLogger';
import usePermissions from '@/hooks/usePermissions';
import { useToast } from '@/components/ui/use-toast';

const BOARD_TYPES = {
  project_board: { label: 'Project Board', color: 'bg-violet-500/10 text-violet-700 dark:text-violet-300' },
  task_board: { label: 'Task Board', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300' },
  process_board: { label: 'Process Board', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  operations_board: { label: 'Operations Board', color: 'bg-orange-500/10 text-orange-700 dark:text-orange-300' },
};

export default function Workboards() {
  const [boards, setBoards] = useState([]);
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editBoard, setEditBoard] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', board_type: 'task_board', linked_project: '', team: '', default_view: 'table', color: 'violet' });
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const { can } = usePermissions();
  const { currentWorkspaceId } = useWorkspace();
  const { toast } = useToast();

  const load = () => {
    if (!currentWorkspaceId) return;
    setLoading(true);
    const wsFilter = { workspace: currentWorkspaceId };
    Promise.all([base44.entities.Workboard.filter(wsFilter), base44.entities.Project.filter(wsFilter), base44.entities.Team.filter(wsFilter), base44.auth.me()])
      .then(([b, p, t, me]) => { setBoards(b); setProjects(p); setTeams(t); setUser(me); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('create') === 'true') {
      openForm(null);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => { load(); }, [currentWorkspaceId]);

  const openForm = (board) => {
    setEditBoard(board);
    if (board) {
      setForm({ name: board.name || '', description: board.description || '', board_type: board.board_type || 'task_board', linked_project: board.linked_project || '', team: board.team || '', default_view: board.default_view || 'table', color: board.color || 'violet' });
    } else {
      setForm({ name: '', description: '', board_type: 'task_board', linked_project: '', team: '', default_view: 'table', color: 'violet' });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = { ...form };
      if (!data.linked_project) delete data.linked_project;
      if (!data.team) delete data.team;
      if (editBoard) {
        await base44.entities.Workboard.update(editBoard.id, data);
        logActivity(user, 'updated workboard', 'Workboard', editBoard.id, editBoard.name);
        toast({ title: 'Workboard updated' });
      } else {
        // Create the workboard
        const newBoard = await base44.entities.Workboard.create({ ...data, workspace: currentWorkspaceId, owner: user?.id });
        logActivity(user, 'created workboard', 'Workboard', newBoard.id, form.name);
        toast({ title: 'Workboard created' });
        
        // Create WorkboardMember for creator as owner
        await base44.entities.WorkboardMember.create({
          workspace: currentWorkspaceId,
          workspace_name: '',
          workboard: newBoard.id,
          workboard_name: newBoard.name,
          user: user.id,
          user_name: user.full_name,
          user_email: user.email,
          role: 'workboard_owner',
          status: 'active',
          added_by: user.id,
          joined_date: new Date().toISOString().split('T')[0],
        });
        
        // Create default groups
        const defaultGroups = [
          { name: 'This Week', workspace: currentWorkspaceId, workboard: newBoard.id, sort_order: 0, color: 'blue' },
          { name: 'Next Week', workspace: currentWorkspaceId, workboard: newBoard.id, sort_order: 1, color: 'green' },
          { name: 'Backlog', workspace: currentWorkspaceId, workboard: newBoard.id, sort_order: 2, color: 'gray' },
          { name: 'Completed', workspace: currentWorkspaceId, workboard: newBoard.id, sort_order: 3, color: 'green' },
        ];
        await Promise.all(defaultGroups.map(g => base44.entities.BoardGroup.create(g)));
        
        // Create default columns
        const defaultColumns = [
          { name: 'Item', workspace: currentWorkspaceId, workboard: newBoard.id, column_type: 'text', sort_order: 0, width: 300 },
          { name: 'Owner', workspace: currentWorkspaceId, workboard: newBoard.id, column_type: 'person', sort_order: 1, width: 150 },
          { name: 'Status', workspace: currentWorkspaceId, workboard: newBoard.id, column_type: 'status', sort_order: 2, width: 120 },
          { name: 'Priority', workspace: currentWorkspaceId, workboard: newBoard.id, column_type: 'priority', sort_order: 3, width: 120 },
          { name: 'Timeline', workspace: currentWorkspaceId, workboard: newBoard.id, column_type: 'timeline', sort_order: 4, width: 150 },
          { name: 'Due Date', workspace: currentWorkspaceId, workboard: newBoard.id, column_type: 'date', sort_order: 5, width: 120 },
          { name: 'Progress', workspace: currentWorkspaceId, workboard: newBoard.id, column_type: 'progress', sort_order: 6, width: 120 },
        ];
        await Promise.all(defaultColumns.map(c => base44.entities.BoardColumn.create(c)));
        
        // Create default status options
        const defaultStatuses = [
          { label: 'Not Started', workspace: currentWorkspaceId, workboard: newBoard.id, color: 'gray', sort_order: 0, is_default: true },
          { label: 'Working On It', workspace: currentWorkspaceId, workboard: newBoard.id, color: 'blue', sort_order: 1 },
          { label: 'Stuck', workspace: currentWorkspaceId, workboard: newBoard.id, color: 'red', sort_order: 2 },
          { label: 'Waiting', workspace: currentWorkspaceId, workboard: newBoard.id, color: 'yellow', sort_order: 3 },
          { label: 'Done', workspace: currentWorkspaceId, workboard: newBoard.id, color: 'green', sort_order: 4 },
        ];
        await Promise.all(defaultStatuses.map(s => base44.entities.StatusOption.create(s)));
        
        // Create default priority options
        const defaultPriorities = [
          { label: 'Low', workspace: currentWorkspaceId, workboard: newBoard.id, color: 'blue', sort_order: 0 },
          { label: 'Medium', workspace: currentWorkspaceId, workboard: newBoard.id, color: 'yellow', sort_order: 1, is_default: true },
          { label: 'High', workspace: currentWorkspaceId, workboard: newBoard.id, color: 'orange', sort_order: 2 },
          { label: 'Critical', workspace: currentWorkspaceId, workboard: newBoard.id, color: 'red', sort_order: 3 },
        ];
        await Promise.all(defaultPriorities.map(p => base44.entities.PriorityOption.create(p)));
      }
      setDialogOpen(false);
      load();
    } catch (error) {
      console.error('Error saving workboard:', error);
      toast({ title: 'Error saving workboard', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (b) => {
    try {
      await base44.entities.Workboard.delete(b.id);
      logActivity(user, 'deleted workboard', 'Workboard', b.id, b.name);
      toast({ title: 'Workboard deleted' });
      load();
    } catch (error) {
      toast({ title: 'Error deleting workboard', description: error.message, variant: 'destructive' });
    }
  };

  const filtered = boards.filter(b => !search || b.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Workboards" subtitle={`${boards.length} boards`}>
        {can('canManageBoards') && <Button onClick={() => openForm(null)}><Plus className="w-4 h-4 mr-1.5" /> New Workboard</Button>}
      </PageHeader>

      <div className="mb-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search workboards..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={LayoutGrid} title="No workboards found" description="Create your first workboard to organize work" actionLabel="New Workboard" onAction={() => openForm(null)} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(b => {
            const typeConfig = BOARD_TYPES[b.board_type] || BOARD_TYPES.task_board;
            return (
              <Card key={b.id} className="hover:shadow-md transition-shadow group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${typeConfig.color}`}>
                        <LayoutGrid className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm truncate">{b.name}</h3>
                        {b.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{b.description}</p>}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"><MoreHorizontal className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {can('canManageBoards') && <DropdownMenuItem onClick={() => openForm(b)}><Pencil className="w-3.5 h-3.5 mr-2" /> Edit</DropdownMenuItem>}
                        {can('canManageBoards') && <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(b)}><Trash2 className="w-3.5 h-3.5 mr-2" /> Delete</DropdownMenuItem>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className={`text-[11px] ${typeConfig.color}`}>{typeConfig.label}</Badge>
                    {b.status === 'archived' && <Badge variant="outline" className="text-[11px]">Archived</Badge>}
                  </div>
                  <Link to={`/workboards/${b.id}`} className="flex items-center gap-1 text-sm text-primary hover:gap-2 transition-all">
                    Open board <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editBoard ? 'Edit Workboard' : 'New Workboard'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Board Type</Label>
                <Select value={form.board_type} onValueChange={v => setForm(f => ({...f, board_type: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(BOARD_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Default View</Label>
                <Select value={form.default_view} onValueChange={v => setForm(f => ({...f, default_view: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['table','kanban'].map(v => <SelectItem key={v} value={v}>{v.charAt(0).toUpperCase()+v.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Linked Project</Label>
              <Select value={form.linked_project} onValueChange={v => setForm(f => ({...f, linked_project: v}))}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Team</Label>
              <Select value={form.team} onValueChange={v => setForm(f => ({...f, team: v}))}>
                <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                <SelectContent>{teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.name}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}