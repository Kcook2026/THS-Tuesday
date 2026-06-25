import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import StatusPriorityManager from '@/components/workboards/StatusPriorityManager';
import ItemDetailDrawer from '@/components/workboards/ItemDetailDrawer';
import GroupTable from '@/components/workboards/GroupTable';
import KanbanBoard from '@/components/workboards/KanbanBoard';
import CalendarView from '@/components/workboards/CalendarView';
import { useItemValues } from '@/hooks/useItemValues';
import {
  Plus, Search, Settings, Archive, Trash2, Save, X, Tag,
  LayoutList, LayoutGrid, Calendar as CalendarIcon
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
  const [showBoardSettings, setShowBoardSettings] = useState(false);
  const [columns, setColumns] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showItemDetail, setShowItemDetail] = useState(false);
  const [activeView, setActiveView] = useState('list');
  const { getValue, saveValue } = useItemValues(id, currentWorkspaceId);
  const [cardFields, setCardFields] = useState(() => {
    try {
      const stored = localStorage.getItem(`tuesday_kanban_fields_${id}`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return ['owner', 'status', 'priority', 'due_date'];
  });

  const handleCardFieldsChange = (newFields) => {
    setCardFields(newFields);
    localStorage.setItem(`tuesday_kanban_fields_${id}`, JSON.stringify(newFields));
  };
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const stored = localStorage.getItem(`tuesday_wb_cols_${id}`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return { owner: true, status: true, priority: true, due_date: true, progress_percentage: true };
  });

  const isLoadingRef = useRef(false);

  const load = useCallback(async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setLoading(true);

    try {
      const [b, g, s, p, i, u, me, cols, t] = await Promise.all([
        base44.entities.Workboard.get(id),
        base44.entities.BoardGroup.filter({ workboard: id, archived: false }),
        base44.entities.StatusOption.filter({ workboard: id }),
        base44.entities.PriorityOption.filter({ workboard: id }),
        base44.entities.WorkboardItem.filter({ workspace: currentWorkspaceId, workboard: id, archived: false }),
        base44.entities.User.list(),
        base44.auth.me(),
        base44.entities.BoardColumn.filter({ workboard: id }).catch(() => []),
        base44.entities.Team.filter({ workspace: currentWorkspaceId }).catch(() => []),
      ]);

      setBoard(b);
      setGroups(g.sort((a, b) => a.sort_order - b.sort_order));
      setStatusOptions(s.sort((a, b) => a.sort_order - b.sort_order));
      setPriorityOptions(p.sort((a, b) => a.sort_order - b.sort_order));
      setItems(i);
      setUsers(u);
      setUser(me);
      setColumns(cols);
      setTeams(t);
    } catch (error) {
      toast({ title: 'Error loading board', description: error.message, variant: 'destructive', duration: 6000 });
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [id, toast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!id) return;
    const unsubscribe = base44.entities.WorkboardItem.subscribe((event) => {
      if (event.type === 'create' && event.data && event.data.workboard === id) {
        setItems(prev => prev.some(item => item.id === event.data.id) ? prev : [...prev, event.data]);
      } else if (event.type === 'update' && event.data && event.data.workboard === id) {
        setItems(prev => prev.map(it => it.id === event.data.id ? { ...it, ...event.data } : it));
      } else if (event.type === 'delete') {
        setItems(prev => prev.filter(it => it.id !== event.entity_id));
      }
    });
    return () => unsubscribe();
  }, [id]);

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

  const handleCreateItem = async () => {
    if (!newItemTitle.trim() || isCreating) return;
    if (!currentWorkspaceId) {
      toast({ title: 'No workspace selected', description: 'Please select a workspace first', variant: 'destructive', duration: 5000 });
      return;
    }

    setIsCreating(true);
    setSaving(true);

    try {
      const { targetGroups, targetStatusOptions, targetPriorityOptions } = await ensureDefaults();

      const defaultStatus = targetStatusOptions.find(s => s.is_default) || targetStatusOptions[0];
      const defaultPriority = targetPriorityOptions.find(p => p.is_default) || targetPriorityOptions[0];
      const selectedGroup = targetGroups.find(g => g.id === newItemGroup) || targetGroups[0];

      if (!selectedGroup) {
        toast({ title: 'No group available', description: 'Please create a group first', variant: 'destructive', duration: 5000 });
        return;
      }

      const newItem = {
        title: newItemTitle.trim(),
        workspace: currentWorkspaceId,
        workboard: id,
        group: selectedGroup.id,
        item_type: 'main_item',
        owner: user?.id,
        status: defaultStatus?.label || 'Not Started',
        status_color: defaultStatus?.color || 'gray',
        priority: defaultPriority?.label || 'Medium',
        priority_color: defaultPriority?.color || 'yellow',
        progress_percentage: 0,
        sort_order: items.length,
        created_by: user?.id,
        archived: false,
      };

      const savedItem = await base44.entities.WorkboardItem.create(newItem);

      setItems(prev => prev.some(i => i.id === savedItem.id) ? prev : [...prev, savedItem]);

      toast({ title: 'Item created', description: `"${savedItem.title}" added`, duration: 2000 });
      setNewItemTitle('');
      setNewItemGroup('');
      setShowNewItem(false);
    } catch (error) {
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
      setItems(prev => prev.filter(i => i.id !== item.id));
      toast({ title: 'Item deleted', duration: 2000 });
    } catch (error) {
      toast({ title: 'Failed to delete item', description: error.message, variant: 'destructive', duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  const handleItemClick = (item) => {
    setSelectedItem(item);
    setShowItemDetail(true);
  };

  const handleItemUpdateById = (itemId, updateData) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === itemId);
      if (existing) {
        return prev.map(i => i.id === itemId ? { ...i, ...updateData } : i);
      }
      return [...prev, updateData];
    });
  };

  const handleRenameGroup = (groupId, newName) => {
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, name: newName } : g));
  };

  const handleArchiveGroup = (groupId) => {
    setGroups(prev => prev.filter(g => g.id !== groupId));
    setItems(prev => prev.filter(i => i.group !== groupId));
  };

  const handleDeleteGroup = (groupId) => {
    setGroups(prev => prev.filter(g => g.id !== groupId));
    setItems(prev => prev.filter(i => i.group !== groupId));
  };

  const handleGroupColorChange = (groupId, newColor) => {
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, color: newColor } : g));
  };

  const handleGroupReorder = async (groupId, direction) => {
    const sorted = [...groups];
    const index = sorted.findIndex(g => g.id === groupId);
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= sorted.length) return;
    [sorted[index], sorted[newIndex]] = [sorted[newIndex], sorted[index]];
    const reordered = sorted.map((g, i) => ({ ...g, sort_order: i }));
    setGroups(reordered);
    try {
      await Promise.all(reordered.map((g, i) => base44.entities.BoardGroup.update(g.id, { sort_order: i })));
    } catch (error) {
      toast({ title: 'Failed to persist group order', description: error.message, variant: 'destructive', duration: 5000 });
    }
  };

  const handleVisibleColumnsChange = (newVis) => {
    setVisibleColumns(newVis);
    localStorage.setItem(`tuesday_wb_cols_${id}`, JSON.stringify(newVis));
  };

  // Enrich items with sub-item counts for Kanban display
  const subItemCountMap = items.reduce((acc, item) => {
    if (item.parent_item) {
      acc[item.parent_item] = (acc[item.parent_item] || 0) + 1;
    }
    return acc;
  }, {});

  const filteredItems = items
    .filter(item => {
      if (search && !item.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .map(item => ({ ...item, _subItemCount: subItemCountMap[item.id] || 0 }));

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
          <StatusPriorityManager
            boardId={id}
            workspaceId={currentWorkspaceId}
            statusOptions={statusOptions}
            priorityOptions={priorityOptions}
            onStatusOptionsChange={setStatusOptions}
            onPriorityOptionsChange={setPriorityOptions}
            trigger={
              <Button variant="outline" size="sm">
                <Tag className="w-4 h-4 mr-1.5" />
                Labels
              </Button>
            }
          />
          <ColumnManager
            boardId={id}
            workspaceId={currentWorkspaceId}
            columns={columns}
            onColumnsChange={setColumns}
            visibleColumns={visibleColumns}
            onVisibleColumnsChange={handleVisibleColumnsChange}
          />
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
              <Input defaultValue={board.name} onBlur={async (e) => {
                if (e.target.value !== board.name) {
                  await base44.entities.Workboard.update(id, { name: e.target.value });
                  setBoard({ ...board, name: e.target.value });
                  toast({ title: 'Board renamed', duration: 2000 });
                }
              }} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea defaultValue={board.description || ''} onBlur={async (e) => {
                if (e.target.value !== (board.description || '')) {
                  await base44.entities.Workboard.update(id, { description: e.target.value });
                  setBoard({ ...board, description: e.target.value });
                  toast({ title: 'Description saved', duration: 2000 });
                }
              }} rows={3} />
            </div>
            <div>
              <Label>Visibility</Label>
              <Select defaultValue={board.visibility} onValueChange={async (v) => {
                await base44.entities.Workboard.update(id, { visibility: v });
                setBoard({ ...board, visibility: v });
                toast({ title: 'Visibility updated', duration: 2000 });
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
                <Button variant="outline" className="w-full justify-start" onClick={async () => {
                  await base44.entities.Workboard.update(id, { status: 'archived', archived: true });
                  toast({ title: 'Board archived', duration: 2000 });
                  window.location.href = '/workboards';
                }}>
                  <Archive className="w-4 h-4 mr-2" />
                  Archive Board
                </Button>
                {canDelete && (
                  <Button variant="destructive" className="w-full justify-start" onClick={async () => {
                    if (!confirm(`Delete "${board.name}"?\n\nThis will permanently delete all items, groups, columns, values, and members.`)) return;
                    setSaving(true);
                    try {
                      const [itemsData, groupsData, statuses, priorities, members, colsData, itemValues] = await Promise.all([
                        base44.entities.WorkboardItem.filter({ workboard: id }),
                        base44.entities.BoardGroup.filter({ workboard: id }),
                        base44.entities.StatusOption.filter({ workboard: id }),
                        base44.entities.PriorityOption.filter({ workboard: id }),
                        base44.entities.WorkboardMember.filter({ workboard: id }),
                        base44.entities.BoardColumn.filter({ workboard: id }),
                        base44.entities.WorkboardItemValue.filter({ workboard: id }),
                      ]);
                      for (const iv of itemValues) await base44.entities.WorkboardItemValue.delete(iv.id);
                      for (const item of itemsData) await base44.entities.WorkboardItem.delete(item.id);
                      for (const g of groupsData) await base44.entities.BoardGroup.delete(g.id);
                      for (const c of colsData) await base44.entities.BoardColumn.delete(c.id);
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
      <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
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
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {showNewItem && (
          <Card className="border-primary/50 bg-accent/50 mb-4">
            <CardContent className="p-3">
              <div className="flex gap-2 items-center">
                <Input value={newItemTitle} onChange={e => setNewItemTitle(e.target.value)} placeholder="Enter item title..." className="flex-1" autoFocus disabled={isCreating} onKeyDown={(e) => { if (e.key === 'Enter') handleCreateItem(); if (e.key === 'Escape') setShowNewItem(false); }} />
                <Select value={newItemGroup} onValueChange={setNewItemGroup} disabled={isCreating}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Select group" /></SelectTrigger>
                  <SelectContent>
                    {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleCreateItem} disabled={saving || isCreating || !newItemTitle.trim()}>
                  {saving ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowNewItem(false)} disabled={isCreating}><X className="w-4 h-4" /></Button>
              </div>
            </CardContent>
          </Card>
        )}

        <TabsContent value="list" className="mt-0">
          {groups.length > 0 ? (
            <div className="space-y-6">
              {groups.map(group => (
                <GroupTable
                  key={group.id}
                  group={group}
                  groupIndex={groups.findIndex(g => g.id === group.id)}
                  totalGroups={groups.length}
                  items={filteredItems.filter(i => i.group === group.id)}
                  statusOptions={statusOptions}
                  priorityOptions={priorityOptions}
                  users={users}
                  teams={teams}
                  visibleColumns={visibleColumns}
                  columns={columns}
                  getValue={getValue}
                  saveValue={saveValue}
                  canEdit={canEdit}
                  canCreate={canCreate}
                  canDelete={canDelete}
                  onItemClick={handleItemClick}
                  onItemUpdate={handleItemUpdateById}
                  onDeleteItem={handleDeleteItem}
                  onAddItem={(groupId) => { setNewItemGroup(groupId); setShowNewItem(true); }}
                  onRenameGroup={handleRenameGroup}
                  onArchiveGroup={handleArchiveGroup}
                  onDeleteGroup={handleDeleteGroup}
                  onGroupColorChange={handleGroupColorChange}
                  onGroupReorder={handleGroupReorder}
                />
              ))}
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden bg-card">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead className="min-w-[250px]">Item Name</TableHead>
                      {visibleColumns?.owner !== false && <TableHead className="min-w-[150px]">Owner</TableHead>}
                      {visibleColumns?.status !== false && <TableHead className="min-w-[120px]">Status</TableHead>}
                      {visibleColumns?.priority !== false && <TableHead className="min-w-[120px]">Priority</TableHead>}
                      {visibleColumns?.due_date !== false && <TableHead className="min-w-[120px]">Due Date</TableHead>}
                      {visibleColumns?.progress_percentage !== false && <TableHead className="min-w-[120px]">Progress</TableHead>
                      }
                      {columns.filter(c => !c.hidden).map(column => (
                        <TableHead key={column.id} style={{ minWidth: column.width || 200 }}>{column.name}</TableHead>
                      ))}
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <p>No items yet</p>
                            {canCreate && <Button size="sm" onClick={() => setShowNewItem(true)}><Plus className="w-4 h-4 mr-1.5" />Add First Item</Button>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredItems.filter(i => !i.parent_item).map(item => (
                        <TableRow key={item.id} className="hover:bg-accent/50 cursor-pointer" onClick={() => handleItemClick(item)}>
                          <TableCell><span className="w-1.5 h-1.5 rounded-full bg-primary/50 block mx-auto" /></TableCell>
                          <TableCell className="font-medium">{item.title}</TableCell>
                          <TableCell>—</TableCell>
                          <TableCell>—</TableCell>
                          <TableCell>—</TableCell>
                          <TableCell>—</TableCell>
                          <TableCell>—</TableCell>
                          <TableCell></TableCell>
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
            teams={teams}
            columns={columns}
            cardFields={cardFields}
            onCardFieldsChange={handleCardFieldsChange}
            getValue={getValue}
            canEdit={canEdit}
            canDelete={canDelete}
            onAddItem={(groupId) => { setNewItemGroup(groupId); setShowNewItem(true); }}
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
          onUpdate={(updatedItem) => handleItemUpdateById(updatedItem.id, updatedItem)}
        />
      )}
    </div>
  );
}