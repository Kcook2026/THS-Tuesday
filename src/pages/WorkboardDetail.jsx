import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Plus, Search, MoreHorizontal, Save, X, User, Trash2, Shield, Settings, Archive, Eye, EyeOff, GripVertical, Pencil,
  LayoutList, LayoutGrid, Calendar as CalendarIcon
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Breadcrumbs from '@/components/shared/Breadcrumbs';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { useToast } from '@/components/ui/use-toast';
import { useWorkspace } from '@/lib/WorkspaceContext';
import usePermissions from '@/hooks/usePermissions';
import MembersDrawer from '@/components/workboards/MembersDrawer';
import ColumnManager from '@/components/workboards/ColumnManager';
import ItemDetailDrawer from '@/components/workboards/ItemDetailDrawer';
import KanbanBoard from '@/components/workboards/KanbanBoard';
import CalendarView from '@/components/workboards/CalendarView';
import UpdatesSection from '@/components/workboards/UpdatesSection';
import { STATUS_COLORS, PRIORITY_COLORS } from '@/components/workboards/WorkboardConstants';
import { getUserInitials } from '@/lib/userHelpers';

export default function WorkboardDetail() {
  const { id } = useParams();
  const { currentWorkspaceId } = useWorkspace();
  const { toast } = useToast();
  const permissions = usePermissions();

  const [board, setBoard] = useState(null);
  const [items, setItems] = useState([]);
  const [groups, setGroups] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [priorityOptions, setPriorityOptions] = useState([]);
  const [users, setUsers] = useState([]);
  const [user, setUser] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showNewItem, setShowNewItem] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemGroup, setNewItemGroup] = useState('');
  const [saving, setSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [showBoardSettings, setShowBoardSettings] = useState(false);
  const [columns, setColumns] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showItemDetail, setShowItemDetail] = useState(false);
  const [activeView, setActiveView] = useState('list');

  const isLoadingRef = useRef(false);

  const load = useCallback(async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setLoading(true);
    
    try {
      const [b, g, s, p, i, u, me] = await Promise.all([
        base44.entities.Workboard.get(id),
        base44.entities.BoardGroup.filter({ workboard: id, archived: false }),
        base44.entities.StatusOption.filter({ workboard: id }),
        base44.entities.PriorityOption.filter({ workboard: id }),
        base44.entities.WorkboardItem.filter({ workboard: id, archived: false }),
        base44.entities.User.list(),
        base44.auth.me(),
      ]);
      
      setBoard(b);
      setGroups(g.sort((a, b) => a.sort_order - b.sort_order));
      setStatusOptions(s.sort((a, b) => a.sort_order - b.sort_order));
      setPriorityOptions(p.sort((a, b) => a.sort_order - b.sort_order));
      setItems(i);
      setUsers(u);
      setUser(me);
    } catch (error) {
      console.error('Error loading board:', error);
      toast({ title: 'Error loading board', description: error.message, variant: 'destructive', duration: 6000 });
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [id, toast]);

  useEffect(() => { 
    load(); 
  }, [load]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!id) return;
    const unsubscribe = base44.entities.WorkboardItem.subscribe((event) => {
      if (event.type === 'create' && event.data) {
        setItems(prev => prev.some(item => item.id === event.data.id) ? prev : [...prev, event.data]);
      } else if (event.type === 'update' && event.data) {
        setItems(prev => prev.map(it => it.id === event.data.id ? { ...it, ...event.data } : it));
      } else if (event.type === 'delete') {
        setItems(prev => prev.filter(it => it.id !== event.entity_id));
      }
    });
    return () => unsubscribe();
  }, [id]);

  const userMap = Object.fromEntries(users.map(u => [u.id, u.full_name || u.email || 'Unassigned']));
  
  const getUserDisplay = (userId) => {
    if (!userId) return 'Unassigned';
    const user = users.find(u => u.id === userId);
    return user?.full_name || user?.email || 'Unassigned';
  };

  const filteredItems = items.filter(item => {
    if (search && !item.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const ensureDefaults = async () => {
    let targetGroups = groups;
    let targetStatusOptions = statusOptions;
    let targetPriorityOptions = priorityOptions;

    if (groups.length === 0) {
      const defaultGroups = [
        { name: 'This Week', workspace: currentWorkspaceId, workboard: id, sort_order: 0, color: 'blue' },
        { name: 'Next Week', workspace: currentWorkspaceId, workboard: id, sort_order: 1, color: 'green' },
        { name: 'Backlog', workspace: currentWorkspaceId, workboard: id, sort_order: 2, color: 'gray' },
        { name: 'Completed', workspace: currentWorkspaceId, workboard: id, sort_order: 3, color: 'green' },
      ];
      const createdGroups = await Promise.all(defaultGroups.map(g => base44.entities.BoardGroup.create(g)));
      targetGroups = createdGroups.sort((a, b) => a.sort_order - b.sort_order);
      setGroups(targetGroups);
    }
    
    if (statusOptions.length === 0) {
      const defaultStatuses = [
        { label: 'Not Started', workspace: currentWorkspaceId, workboard: id, color: 'gray', sort_order: 0, is_default: true },
        { label: 'Working On It', workspace: currentWorkspaceId, workboard: id, color: 'blue', sort_order: 1 },
        { label: 'Stuck', workspace: currentWorkspaceId, workboard: id, color: 'red', sort_order: 2 },
        { label: 'Waiting', workspace: currentWorkspaceId, workboard: id, color: 'yellow', sort_order: 3 },
        { label: 'Done', workspace: currentWorkspaceId, workboard: id, color: 'green', sort_order: 4 },
      ];
      const createdStatuses = await Promise.all(defaultStatuses.map(s => base44.entities.StatusOption.create(s)));
      targetStatusOptions = createdStatuses.sort((a, b) => a.sort_order - b.sort_order);
      setStatusOptions(targetStatusOptions);
    }
    
    if (priorityOptions.length === 0) {
      const defaultPriorities = [
        { label: 'Low', workspace: currentWorkspaceId, workboard: id, color: 'blue', sort_order: 0 },
        { label: 'Medium', workspace: currentWorkspaceId, workboard: id, color: 'yellow', sort_order: 1, is_default: true },
        { label: 'High', workspace: currentWorkspaceId, workboard: id, color: 'orange', sort_order: 2 },
        { label: 'Critical', workspace: currentWorkspaceId, workboard: id, color: 'red', sort_order: 3 },
      ];
      const createdPriorities = await Promise.all(defaultPriorities.map(p => base44.entities.PriorityOption.create(p)));
      targetPriorityOptions = createdPriorities.sort((a, b) => a.sort_order - b.sort_order);
      setPriorityOptions(targetPriorityOptions);
    }

    return { targetGroups, targetStatusOptions, targetPriorityOptions };
  };

  const handleInlineEdit = async (itemId, field, value) => {
    setSaving(true);
    try {
      const updateData = { [field]: value };
      
      if (field === 'status') {
        const status = statusOptions.find(s => s.label === value);
        if (status) updateData.status_color = status.color;
      }
      if (field === 'priority') {
        const priority = priorityOptions.find(p => p.label === value);
        if (priority) updateData.priority_color = priority.color;
      }
      if (field === 'progress_percentage') {
        updateData.progress_percentage = parseInt(value) || 0;
      }
      
      await base44.entities.WorkboardItem.update(itemId, updateData);
      setItems(prev => prev.map(it => it.id === itemId ? { ...it, ...updateData } : it));
      toast({ title: 'Updated', duration: 2000 });
    } catch (error) {
      console.error('Error updating:', error);
      toast({ title: 'Update failed', description: error.message, variant: 'destructive', duration: 5000 });
    } finally {
      setSaving(false);
      setEditingCell(null);
    }
  };

  const handleCreateItem = async () => {
    if (!newItemTitle.trim() || isCreating) return;
    
    setIsCreating(true);
    setSaving(true);
    
    try {
      const { targetGroups, targetStatusOptions, targetPriorityOptions } = await ensureDefaults();
      
      const defaultStatus = targetStatusOptions.find(s => s.is_default) || targetStatusOptions[0];
      const defaultPriority = targetPriorityOptions.find(p => p.is_default) || targetPriorityOptions[0];
      const selectedGroup = targetGroups.find(g => g.id === newItemGroup) || targetGroups[0];
      
      const newItem = {
        title: newItemTitle.trim(),
        workspace: currentWorkspaceId,
        workboard: id,
        group: selectedGroup?.id,
        status: defaultStatus?.label || 'Not Started',
        status_color: defaultStatus?.color || 'gray',
        priority: defaultPriority?.label || 'Medium',
        priority_color: defaultPriority?.color || 'yellow',
        progress_percentage: 0,
        sort_order: items.length,
        created_by: user?.id,
        archived: false,
      };
      
      await base44.entities.WorkboardItem.create(newItem);
      
      toast({ title: 'Item created', description: `"${newItem.title}" added`, duration: 2000 });
      setNewItemTitle('');
      setShowNewItem(false);
    } catch (error) {
      console.error('Error creating item:', error);
      toast({ title: 'Failed to create item', description: error.message, variant: 'destructive', duration: 5000 });
    } finally {
      setSaving(false);
      setIsCreating(false);
    }
  };

  const handleDeleteItem = async (item) => {
    if (!confirm(`Delete "${item.title}"?`)) return;
    
    setSaving(true);
    try {
      await base44.entities.WorkboardItem.delete(item.id);
      toast({ title: 'Item deleted', duration: 2000 });
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({ title: 'Failed to delete item', description: error.message, variant: 'destructive', duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  const handleItemClick = (item) => {
    setSelectedItem(item);
    setShowItemDetail(true);
  };

  const handleItemUpdate = (updatedItem) => {
    setItems(prev => prev.map(it => it.id === updatedItem.id ? { ...it, ...updatedItem } : it));
  };

  const renderInlineEdit = (item, field) => {
    const isEditing = editingCell?.itemId === item.id && editingCell?.field === field;
    
    if (isEditing) {
      if (field === 'status') {
        return (
          <Select value={item.status} onValueChange={(value) => handleInlineEdit(item.id, 'status', value)} onOpenChange={() => setEditingCell(null)}>
            <SelectTrigger className="h-7 w-auto"><SelectValue /></SelectTrigger>
            <SelectContent>{statusOptions.map(s => <SelectItem key={s.id} value={s.label}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        );
      }
      if (field === 'priority') {
        return (
          <Select value={item.priority} onValueChange={(value) => handleInlineEdit(item.id, 'priority', value)} onOpenChange={() => setEditingCell(null)}>
            <SelectTrigger className="h-7 w-auto"><SelectValue /></SelectTrigger>
            <SelectContent>{priorityOptions.map(p => <SelectItem key={p.id} value={p.label}>{p.label}</SelectItem>)}</SelectContent>
          </Select>
        );
      }
      if (field === 'owner') {
        return (
          <Select value={item.owner || ''} onValueChange={(value) => handleInlineEdit(item.id, 'owner', value)} onOpenChange={() => setEditingCell(null)}>
            <SelectTrigger className="h-7 w-auto"><SelectValue placeholder="Select user" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Unassigned</SelectItem>
              {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email || 'Unassigned'}</SelectItem>)}
            </SelectContent>
          </Select>
        );
      }
      if (field === 'due_date') {
        return <Input type="date" value={item.due_date ? item.due_date.split('T')[0] : ''} onChange={(e) => handleInlineEdit(item.id, 'due_date', e.target.value)} onBlur={() => setEditingCell(null)} className="h-7 w-auto" autoFocus />;
      }
      if (field === 'progress_percentage') {
        return <Input type="number" min="0" max="100" value={item.progress_percentage || 0} onChange={(e) => handleInlineEdit(item.id, 'progress_percentage', e.target.value)} onBlur={() => setEditingCell(null)} className="h-7 w-16" autoFocus />;
      }
    }
    
    return (
      <div className="cursor-pointer hover:bg-accent rounded px-2 py-1 -mx-2" onClick={() => setEditingCell({ itemId: item.id, field })}>
        {renderCell(item, field)}
      </div>
    );
  };

  const renderCell = (item, field) => {
    if (field === 'status') {
      const colorClass = STATUS_COLORS[item.status_color] || STATUS_COLORS.gray;
      return <Badge variant="secondary" className={colorClass}>{item.status || 'Not Started'}</Badge>;
    }
    if (field === 'priority') {
      const colorClass = PRIORITY_COLORS[item.priority_color] || PRIORITY_COLORS.gray;
      return <Badge variant="secondary" className={colorClass}>{item.priority || 'Medium'}</Badge>;
    }
    if (field === 'owner') {
      const userName = getUserDisplay(item.owner);
      return (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
            {getUserInitials(users.find(u => u.id === item.owner))}
          </div>
          <span className="text-sm">{userName}</span>
        </div>
      );
    }
    if (field === 'due_date') {
      return <span className="text-sm">{item.due_date ? new Date(item.due_date).toLocaleDateString() : '—'}</span>;
    }
    if (field === 'progress_percentage') {
      const percent = item.progress_percentage || 0;
      return (
        <div className="flex items-center gap-2">
          <Progress value={percent} className="h-2 w-20" />
          <span className="text-xs text-muted-foreground w-8">{percent}%</span>
        </div>
      );
    }
    return <span className="text-sm">{item[field] || '—'}</span>;
  };

  if (loading) return <LoadingSpinner />;
  if (!board) return <div className="py-16 text-center text-muted-foreground"><h2 className="text-lg font-semibold">Board not found</h2></div>;
  
  const workboardPerms = permissions.getWorkboardPermissions(id);
  const canCreate = permissions.isSystemAdmin || permissions.isExecutive || permissions.isManager || workboardPerms.canCreateItems;
  const canEdit = canCreate;
  const canDelete = workboardPerms.canDeleteItems || permissions.isSystemAdmin;

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: 'Workboards', path: '/workboards' }, { label: board.name }]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{board.name}</h1>
          {board.description && <p className="text-sm text-muted-foreground mt-0.5">{board.description}</p>}
        </div>
        <div className="flex gap-2">
          <MembersDrawer workboardId={id} wb={board} />
          <ColumnManager boardId={id} workspaceId={currentWorkspaceId} columns={columns} onColumnsChange={setColumns} statusOptions={statusOptions} priorityOptions={priorityOptions} />
          <Button variant="outline" size="sm" onClick={() => setShowBoardSettings(true)}>
            <Settings className="w-4 h-4 mr-1.5" />
            Settings
          </Button>
          {canCreate && <Button onClick={() => setShowNewItem(true)} disabled={isCreating}><Plus className="w-4 h-4 mr-1.5" />Add Item</Button>}
        </div>
      </div>

      {/* Board Settings Dialog */}
      <Dialog open={showBoardSettings} onOpenChange={setShowBoardSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Board Settings</DialogTitle>
            <DialogDescription>Manage board settings and configuration</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Board Name</Label>
              <Input value={board.name} onChange={async (e) => {
                await base44.entities.Workboard.update(id, { name: e.target.value });
                setBoard({ ...board, name: e.target.value });
                toast({ title: 'Board renamed', duration: 2000 });
              }} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={board.description || ''} onChange={async (e) => {
                await base44.entities.Workboard.update(id, { description: e.target.value });
                setBoard({ ...board, description: e.target.value });
              }} rows={3} />
            </div>
            <div>
              <Label>Visibility</Label>
              <Select value={board.visibility} onValueChange={async (v) => {
                await base44.entities.Workboard.update(id, { visibility: v });
                setBoard({ ...board, visibility: v });
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public_workspace">Public (Workspace)</SelectItem>
                  <SelectItem value="private">Private (Members Only)</SelectItem>
                  <SelectItem value="restricted">Restricted (Assigned Users)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="pt-4 border-t">
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start" onClick={() => {
                  setShowBoardSettings(false);
                  // Archive logic here
                }}>
                  <Archive className="w-4 h-4 mr-2" />
                  Archive Board
                </Button>
                {canDelete && (
                  <Button variant="destructive" className="w-full justify-start" onClick={async () => {
                    if (!confirm(`Delete "${board.name}"?\n\nThis will permanently delete all items, groups, and members.`)) return;
                    setSaving(true);
                    try {
                      const [itemsData, groupsData, statuses, priorities, members] = await Promise.all([
                        base44.entities.WorkboardItem.filter({ workboard: id }),
                        base44.entities.BoardGroup.filter({ workboard: id }),
                        base44.entities.StatusOption.filter({ workboard: id }),
                        base44.entities.PriorityOption.filter({ workboard: id }),
                        base44.entities.WorkboardMember.filter({ workboard: id }),
                      ]);
                      for (const item of itemsData) await base44.entities.WorkboardItem.delete(item.id);
                      for (const g of groupsData) await base44.entities.BoardGroup.delete(g.id);
                      for (const s of statuses) await base44.entities.StatusOption.delete(s.id);
                      for (const p of priorities) await base44.entities.PriorityOption.delete(p.id);
                      for (const m of members) await base44.entities.WorkboardMember.delete(m.id);
                      await base44.entities.Workboard.delete(id);
                      toast({ title: 'Board deleted', duration: 2000 });
                      window.location.href = '/workboards';
                    } catch (error) {
                      toast({ title: 'Failed to delete board', description: error.message, variant: 'destructive', duration: 5000 });
                    } finally {
                      setSaving(false);
                    }
                  }} disabled={saving}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Board
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Tabs & Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
          <TabsList>
            <TabsTrigger value="list" className="gap-2">
              <LayoutList className="w-4 h-4" />
              List
            </TabsTrigger>
            <TabsTrigger value="kanban" className="gap-2">
              <LayoutGrid className="w-4 h-4" />
              Kanban
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <CalendarIcon className="w-4 h-4" />
              Calendar
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {showNewItem && (
        <Card className="border-primary/50 bg-accent/50 mb-4">
          <CardContent className="p-3">
            <div className="flex gap-2 items-center">
              <Input value={newItemTitle} onChange={e => setNewItemTitle(e.target.value)} placeholder="Enter item title..." className="flex-1" autoFocus disabled={isCreating} />
              <Select value={newItemGroup} onValueChange={setNewItemGroup} disabled={isCreating}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Select group" /></SelectTrigger>
                <SelectContent>
                  {groups.length > 0 ? groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>) : (
                    <><SelectItem value="This Week">This Week</SelectItem><SelectItem value="Next Week">Next Week</SelectItem><SelectItem value="Backlog">Backlog</SelectItem><SelectItem value="Completed">Completed</SelectItem></>
                  )}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleCreateItem} disabled={saving || isCreating}>{saving ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}</Button>
              <Button variant="ghost" size="sm" onClick={() => setShowNewItem(false)} disabled={isCreating}><X className="w-4 h-4" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Content */}
      <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
        <TabsContent value="list" className="mt-0">
          {/* Group-based List View */}
          {groups.length > 0 ? (
            <div className="space-y-6">
              {groups.map(group => {
                const groupItems = filteredItems.filter(item => item.group === group.id);
                const colorClass = group.color ? `bg-${group.color}-500` : 'bg-gray-500';
                return (
                  <div key={group.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${colorClass}`} />
                      <h3 className="font-semibold text-sm">{group.name}</h3>
                      <Badge variant="secondary" className="text-xs">{groupItems.length}</Badge>
                    </div>
                    <div className="border rounded-xl overflow-hidden bg-card">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="min-w-[250px]">Item Name</TableHead>
                              <TableHead className="min-w-[150px]">Owner</TableHead>
                              <TableHead className="min-w-[120px]">Status</TableHead>
                              <TableHead className="min-w-[120px]">Priority</TableHead>
                              <TableHead className="min-w-[120px]">Due Date</TableHead>
                              <TableHead className="min-w-[120px]">Progress</TableHead>
                              <TableHead className="w-10"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {groupItems.length === 0 ? (
                              <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground text-sm">No items in this group</TableCell></TableRow>
                            ) : (
                              groupItems.map(item => (
                                <TableRow key={item.id} className="hover:bg-accent/50 cursor-pointer" onClick={() => handleItemClick(item)}>
                                  <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                                      {item.title}
                                    </div>
                                  </TableCell>
                                  <TableCell onClick={(e) => e.stopPropagation()}>{canEdit ? renderInlineEdit(item, 'owner') : renderCell(item, 'owner')}</TableCell>
                                  <TableCell onClick={(e) => e.stopPropagation()}>{canEdit ? renderInlineEdit(item, 'status') : renderCell(item, 'status')}</TableCell>
                                  <TableCell onClick={(e) => e.stopPropagation()}>{canEdit ? renderInlineEdit(item, 'priority') : renderCell(item, 'priority')}</TableCell>
                                  <TableCell onClick={(e) => e.stopPropagation()}>{canEdit ? renderInlineEdit(item, 'due_date') : renderCell(item, 'due_date')}</TableCell>
                                  <TableCell onClick={(e) => e.stopPropagation()}>{canEdit ? renderInlineEdit(item, 'progress_percentage') : renderCell(item, 'progress_percentage')}</TableCell>
                                  <TableCell onClick={(e) => e.stopPropagation()}>
                                    {canDelete && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteItem(item)}><Trash2 className="w-3.5 h-3.5" /></Button>}
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden bg-card">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[250px]">Item Name</TableHead>
                      <TableHead className="min-w-[150px]">Owner</TableHead>
                      <TableHead className="min-w-[120px]">Status</TableHead>
                      <TableHead className="min-w-[120px]">Priority</TableHead>
                      <TableHead className="min-w-[120px]">Due Date</TableHead>
                      <TableHead className="min-w-[120px]">Progress</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <p>No items yet</p>
                            {canCreate && <Button size="sm" onClick={() => setShowNewItem(true)}><Plus className="w-4 h-4 mr-1.5" />Add First Item</Button>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredItems.map(item => (
                        <TableRow key={item.id} className="hover:bg-accent/50 cursor-pointer" onClick={() => handleItemClick(item)}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                              {item.title}
                            </div>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>{canEdit ? renderInlineEdit(item, 'owner') : renderCell(item, 'owner')}</TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>{canEdit ? renderInlineEdit(item, 'status') : renderCell(item, 'status')}</TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>{canEdit ? renderInlineEdit(item, 'priority') : renderCell(item, 'priority')}</TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>{canEdit ? renderInlineEdit(item, 'due_date') : renderCell(item, 'due_date')}</TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>{canEdit ? renderInlineEdit(item, 'progress_percentage') : renderCell(item, 'progress_percentage')}</TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            {canDelete && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteItem(item)}><Trash2 className="w-3.5 h-3.5" /></Button>}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="kanban" className="mt-0">
          <KanbanBoard
            groups={groups}
            items={filteredItems}
            statusOptions={statusOptions}
            users={users}
            canEdit={canEdit}
            canDelete={canDelete}
            onAddItem={(groupId) => {
              setNewItemGroup(groupId);
              setShowNewItem(true);
            }}
            onItemClick={handleItemClick}
            onDeleteItem={handleDeleteItem}
          />
        </TabsContent>

        <TabsContent value="calendar" className="mt-0">
          <CalendarView
            items={filteredItems}
            users={users}
            onItemClick={handleItemClick}
          />
        </TabsContent>
      </Tabs>

      {/* Item Detail Drawer */}
      {selectedItem && (
        <ItemDetailDrawer
          item={selectedItem}
          boardId={id}
          workspaceId={currentWorkspaceId}
          isOpen={showItemDetail}
          onClose={() => {
            setShowItemDetail(false);
            setSelectedItem(null);
          }}
          onUpdate={handleItemUpdate}
        />
      )}

      {/* Updates Section (for item detail) */}
      {selectedItem && showItemDetail && (
        <div className="hidden">
          <UpdatesSection itemId={selectedItem.id} boardId={id} />
        </div>
      )}
    </div>
  );
}