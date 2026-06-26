import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Search, MoreHorizontal, Pencil, Trash2, LayoutGrid, ArrowRight, Archive, Copy, ArchiveX, UserPlus, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { logActivity } from '@/hooks/useActivityLogger';
import usePermissions from '@/hooks/usePermissions';
import { useToast } from '@/components/ui/use-toast';
import { useConfirm } from '@/components/shared/ConfirmDialog';
import { getActiveWorkboards, getArchivedWorkboards } from '@/lib/workboardHelpers';
import { isOrphanedBoard, safeDeleteBoardData, assignBoardToMe } from '@/lib/boardLifecycle';
import ArchivedBoards from '@/components/workboards/ArchivedBoards';
import DuplicateBoardDialog from '@/components/workboards/DuplicateBoardDialog';

const BOARD_TYPES = {
  project_board: { label: 'Project Board', color: 'bg-violet-500/10 text-violet-700 dark:text-violet-300' },
  task_board: { label: 'Task Board', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300' },
  process_board: { label: 'SOP Board', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  operations_board: { label: 'Operations Board', color: 'bg-orange-500/10 text-orange-700 dark:text-orange-300' },
  planning_board: { label: 'Planning Board', color: 'bg-teal-500/10 text-teal-700 dark:text-teal-300' },
  team_board: { label: 'Team Board', color: 'bg-pink-500/10 text-pink-700 dark:text-pink-300' },
};

export default function Workboards() {
  const [searchParams] = useSearchParams();
  const [boards, setBoards] = useState([]);
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editBoard, setEditBoard] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', board_type: 'task_board', linked_project: '', team: '', color: 'violet' });
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [archivedCount, setArchivedCount] = useState(0);
  const [duplicateTarget, setDuplicateTarget] = useState(null);
  const [wbMembers, setWbMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const isLoadingRef = useRef(false);
  const { can, isSystemAdmin } = usePermissions();
  const { currentWorkspaceId } = useWorkspace();
  const { toast } = useToast();
  const confirm = useConfirm();

  const load = useCallback(async () => {
    if (!currentWorkspaceId || isLoadingRef.current) return;
    isLoadingRef.current = true;
    setLoading(true);
    try {
      const [b, p, t, me, members, users] = await Promise.all([
        base44.entities.Workboard.filter({ workspace: currentWorkspaceId }).catch(() => []),
        base44.entities.Project.filter({ workspace: currentWorkspaceId }).catch(() => []),
        base44.entities.Team.filter({ workspace: currentWorkspaceId }).catch(() => []),
        base44.auth.me().catch(() => null),
        base44.entities.WorkboardMember.filter({ workspace: currentWorkspaceId }).catch(() => []),
        base44.entities.User.list().catch(() => []),
      ]);
      const validBoards = getActiveWorkboards(b || [], currentWorkspaceId);
      setWbMembers(members || []);
      setAllUsers(users || []);
      // Migrate any legacy client_board records to operations_board
      for (const board of validBoards) {
        if (board.board_type === 'client_board') {
          base44.entities.Workboard.update(board.id, { board_type: 'operations_board' }).catch(() => {});
          board.board_type = 'operations_board';
        }
      }
      setBoards(validBoards);
      setArchivedCount(getArchivedWorkboards(b || [], currentWorkspaceId).length);
      setProjects(p || []);
      setTeams(t || []);
      setUser(me);
    } catch (error) {
      console.error('Error loading workboards:', error);
      // Suppress rate limit errors - they're temporary and auto-retried by the client
      const isRateLimit = (error.message || '').toLowerCase().includes('rate limit');
      if (!isRateLimit) {
        toast({ title: 'Error loading workboards', description: error.message, variant: 'destructive', duration: 6000 });
      }
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [currentWorkspaceId, toast]);

  useEffect(() => {
    load();
    // Open create dialog if URL has ?create=true
    if (searchParams.get('create') === 'true') {
      setDialogOpen(true);
      // Clean up the URL parameter
      window.history.replaceState({}, document.title, '/workboards');
    }
  }, [load]);

  const openForm = (board) => {
    setEditBoard(board);
    if (board) {
      setForm({ name: board.name || '', description: board.description || '', board_type: board.board_type || 'task_board', linked_project: board.linked_project || '', team: board.team || '', color: board.color || 'violet' });
    } else {
      setForm({ name: '', description: '', board_type: 'task_board', linked_project: '', team: '', color: 'violet' });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user?.id) {
      toast({ title: 'Unable to save board', description: 'User session not found. Please refresh the page.', variant: 'destructive', duration: 6000 });
      return;
    }
    setSaving(true);
    try {
      const data = { ...form };
      if (!data.linked_project) delete data.linked_project;
      if (!data.team) delete data.team;
      
      if (editBoard) {
        await base44.entities.Workboard.update(editBoard.id, data);
        logActivity(user, 'updated workboard', 'Workboard', editBoard.id, editBoard.name);
        toast({ title: 'Workboard updated', duration: 3000 });
      } else {
        const newBoard = await base44.entities.Workboard.create({ 
          ...data, 
          workspace: currentWorkspaceId, 
          owner: user.id,
          created_by: user.id,
          status: 'active',
        });
        
        logActivity(user, 'created workboard', 'Workboard', newBoard.id, form.name);
        toast({ title: 'Workboard created', duration: 3000 });
        
        // Create WorkboardMember for creator as owner (prevent duplicates)
        const existingMembers = await base44.entities.WorkboardMember.filter({
          workboard: newBoard.id,
          user: user.id,
        });
        
        if (existingMembers.length === 0) {
          await base44.entities.WorkboardMember.create({
            workspace: currentWorkspaceId,
            workboard: newBoard.id,
            workboard_name: newBoard.name,
            user: user.id,
            user_name: user.full_name || user.email || 'Unassigned',
            user_email: user.email || '',
            role: 'workboard_owner',
            status: 'active',
            added_by: user.id,
            joined_date: new Date().toISOString().split('T')[0],
          });
        }
        
        // System columns (Item Name, Owner, Status, Priority, Due Date, Progress)
        // are built-in and NOT created as BoardColumn records.
        // Only truly custom columns are created via the Column Manager.
        
        // Create default groups
        const defaultGroups = [
          { name: 'This Week', workspace: currentWorkspaceId, workboard: newBoard.id, sort_order: 0, color: 'blue' },
          { name: 'Next Week', workspace: currentWorkspaceId, workboard: newBoard.id, sort_order: 1, color: 'green' },
          { name: 'Backlog', workspace: currentWorkspaceId, workboard: newBoard.id, sort_order: 2, color: 'gray' },
          { name: 'Completed', workspace: currentWorkspaceId, workboard: newBoard.id, sort_order: 3, color: 'green' },
        ];
        await Promise.all(defaultGroups.map(g => base44.entities.BoardGroup.create(g)));
        
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
        
        setBoards(prev => [...prev, newBoard]);
      }
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving workboard:', error);
      toast({ title: 'Error saving workboard', description: error.message, variant: 'destructive', duration: 6000 });
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (b) => {
    const ok = await confirm({
      title: 'Archive Board?',
      message: `Archive "${b.name}"? It will be hidden from active lists but can be restored later.`,
      confirmLabel: 'Archive',
    });
    if (!ok) return;
    try {
      await base44.entities.Workboard.update(b.id, {
        status: 'archived',
        archived: true,
        archived_date: new Date().toISOString(),
        archived_by: user?.id,
      });
      logActivity(user, 'archived workboard', 'Workboard', b.id, b.name);
      toast({ title: 'Board archived', duration: 3000 });
      setBoards(prev => prev.filter(board => board.id !== b.id));
      window.dispatchEvent(new Event('workboards-changed'));
    } catch (error) {
      toast({ title: 'Error archiving workboard', description: error.message, variant: 'destructive', duration: 6000 });
    }
  };

  const handlePermanentDelete = async (b) => {
    const ok = await confirm({
      title: 'Permanently Delete Board?',
      message: `This will permanently delete "${b.name}" and ALL related items, groups, columns, statuses, priorities, and memberships. This cannot be undone.`,
      confirmLabel: 'Delete Permanently',
      requireText: b.name,
    });
    if (!ok) return;
    setSaving(true);
    try {
      await safeDeleteBoardData(b.id);

      await base44.entities.Workboard.update(b.id, {
        status: 'deleted',
        deleted_date: new Date().toISOString(),
        deleted_by: user?.id,
      });
      logActivity(user, 'deleted workboard', 'Workboard', b.id, b.name);
      toast({ title: 'Workboard permanently deleted', duration: 3000 });
      setBoards(prev => prev.filter(board => board.id !== b.id));
      window.dispatchEvent(new Event('workboards-changed'));
    } catch (error) {
      console.error('Delete error:', error);
      toast({ title: 'Error deleting workboard', description: error.message, variant: 'destructive', duration: 6000 });
    } finally {
      setSaving(false);
    }
  };

  const orphanedBoardIds = useMemo(() => {
    const set = new Set();
    for (const wb of boards) {
      const members = wbMembers.filter(m => m.workboard === wb.id);
      if (isOrphanedBoard(wb, members, allUsers)) set.add(wb.id);
    }
    return set;
  }, [boards, wbMembers, allUsers]);

  const handleAssignToMe = async (b) => {
    setSaving(true);
    try {
      await assignBoardToMe(b.id, currentWorkspaceId, user);
      toast({ title: 'Board assigned to you', duration: 3000 });
      await load();
      window.dispatchEvent(new Event('workboards-changed'));
    } catch (error) {
      toast({ title: 'Failed to assign board', description: error.message, variant: 'destructive', duration: 6000 });
    } finally {
      setSaving(false);
    }
  };

  const filtered = boards.filter(b => !search || b.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Workboards" subtitle={`${boards.length} active board${boards.length !== 1 ? 's' : ''}`}>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowArchived(s => !s)}>
            <ArchiveX className="w-4 h-4 mr-1.5" /> {showArchived ? 'Hide Archived' : `Archived (${archivedCount})`}
          </Button>
          {can('canManageBoards') && <Button onClick={() => openForm(null)}><Plus className="w-4 h-4 mr-1.5" /> New Workboard</Button>}
        </div>
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
                        {can('canManageBoards') && <DropdownMenuItem onClick={() => setDuplicateTarget(b)}><Copy className="w-3.5 h-3.5 mr-2" /> Duplicate</DropdownMenuItem>}
                        {isSystemAdmin && orphanedBoardIds.has(b.id) && <DropdownMenuItem onClick={() => handleAssignToMe(b)}><UserPlus className="w-3.5 h-3.5 mr-2" /> Assign Owner to Me</DropdownMenuItem>}
                        {can('canManageBoards') && <DropdownMenuItem onClick={() => handleArchive(b)}><Archive className="w-3.5 h-3.5 mr-2" /> Archive</DropdownMenuItem>}
                        {can('canManageBoards') && <DropdownMenuItem className="text-destructive" onClick={() => handlePermanentDelete(b)}><Trash2 className="w-3.5 h-3.5 mr-2" /> Delete Permanently</DropdownMenuItem>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className={`text-[11px] ${typeConfig.color}`}>{typeConfig.label}</Badge>
                    {isSystemAdmin && orphanedBoardIds.has(b.id) && <Badge variant="destructive" className="text-[11px] gap-1"><AlertTriangle className="w-3 h-3" /> Orphaned</Badge>}
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

      {showArchived && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-3">Archived Boards</h2>
          <ArchivedBoards workspaceId={currentWorkspaceId} onRefresh={load} />
        </div>
      )}

      <DuplicateBoardDialog
        board={duplicateTarget}
        workspaceId={currentWorkspaceId}
        userId={user?.id}
        isOpen={!!duplicateTarget}
        onClose={() => setDuplicateTarget(null)}
        onSuccess={() => { load(); window.dispatchEvent(new Event('workboards-changed')); }}
      />
    </div>
  );
}