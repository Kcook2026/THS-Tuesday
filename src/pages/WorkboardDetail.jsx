import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, Search, MoreHorizontal, ChevronRight, ChevronDown, X, Save,
  Calendar, LayoutList, LayoutGrid, GanttChartSquare, BarChart3, Activity,
  User, Users, Paperclip
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Breadcrumbs from '@/components/shared/Breadcrumbs';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { useToast } from '@/components/ui/use-toast';
import { useWorkspace } from '@/lib/WorkspaceContext';
import usePermissions from '@/hooks/usePermissions';
import ColumnManager from '@/components/workboards/ColumnManager';
import WorkboardMembers from '@/components/workboards/WorkboardMembers';
import { STATUS_COLORS, PRIORITY_COLORS, DEFAULT_GROUPS } from '@/components/workboards/WorkboardConstants';

export default function WorkboardDetail() {
  const { id } = useParams();
  const { currentWorkspaceId } = useWorkspace();
  const { toast } = useToast();
  const permissions = usePermissions();

  const [board, setBoard] = useState(null);
  const [items, setItems] = useState([]);
  const [groups, setGroups] = useState([]);
  const [columns, setColumns] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [priorityOptions, setPriorityOptions] = useState([]);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list');
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [expandedItems, setExpandedItems] = useState({});
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showNewItem, setShowNewItem] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemGroup, setNewItemGroup] = useState('Backlog');
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, i, g, c, s, p, u, t, me] = await Promise.all([
        base44.entities.Workboard.get(id),
        base44.entities.WorkboardItem.filter({ workboard: id, archived: false }),
        base44.entities.BoardGroup.filter({ workboard: id, archived: false }).then(res => res.sort((a, b) => a.sort_order - b.sort_order)),
        base44.entities.BoardColumn.filter({ workboard: id, hidden: false }).then(res => res.sort((a, b) => a.sort_order - b.sort_order)),
        base44.entities.StatusOption.filter({ workboard: id }).then(res => res.sort((a, b) => a.sort_order - b.sort_order)),
        base44.entities.PriorityOption.filter({ workboard: id }).then(res => res.sort((a, b) => a.sort_order - b.sort_order)),
        base44.entities.User.list(),
        base44.entities.Team.filter({ workspace: currentWorkspaceId }),
        base44.auth.me(),
      ]);
      setBoard(b);
      setItems(i);
      setGroups(g);
      setColumns(c);
      setStatusOptions(s);
      setPriorityOptions(p);
      setUsers(u);
      setTeams(t);
      setUser(me);
    } catch (error) {
      console.error('Error loading board:', error);
      toast({ 
        title: 'Error loading board', 
        description: error.message, 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  }, [id, currentWorkspaceId, toast]);

  useEffect(() => { 
    load(); 
  }, [load]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!id) return;
    const unsubscribe = base44.entities.WorkboardItem.subscribe((event) => {
      if (event.type === 'create' || event.type === 'update' || event.type === 'delete') {
        load();
      }
    });
    return unsubscribe;
  }, [id, load]);

  const userMap = Object.fromEntries(users.map(u => [u.id, u.full_name || u.email]));
  const teamMap = Object.fromEntries(teams.map(t => [t.id, t.name]));
  const statusMap = Object.fromEntries(statusOptions.map(s => [s.label, s]));
  const priorityMap = Object.fromEntries(priorityOptions.map(p => [p.label, p]));

  const mainItems = items.filter(item => !item.parent_item);
  const subItemsMap = items.reduce((acc, item) => {
    if (item.parent_item) {
      if (!acc[item.parent_item]) acc[item.parent_item] = [];
      acc[item.parent_item].push(item);
    }
    return acc;
  }, {});

  const filteredItems = mainItems.filter(item => {
    if (search && !item.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (groupFilter !== 'all' && item.group !== groupFilter) return false;
    return true;
  });

  const toggleExpand = (itemId) => {
    setExpandedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleInlineEdit = async (itemId, field, value) => {
    setSaving(true);
    try {
      const currentItem = items.find(i => i.id === itemId);
      const updateData = { [field]: value };
      
      // Update color based on status/priority
      if (field === 'status') {
        const status = statusOptions.find(s => s.label === value);
        if (status) {
          updateData.status_color = status.color;
        }
      }
      if (field === 'priority') {
        const priority = priorityOptions.find(p => p.label === value);
        if (priority) {
          updateData.priority_color = priority.color;
        }
      }
      if (field === 'progress_percentage') {
        updateData.progress_percentage = parseInt(value) || 0;
      }
      
      await base44.entities.WorkboardItem.update(itemId, updateData);
      setItems(prev => prev.map(it => it.id === itemId ? { ...it, ...updateData } : it));
      toast({ title: 'Updated successfully' });
    } catch (error) {
      console.error('Error updating:', error);
      toast({ 
        title: 'Error updating', 
        description: error.message, 
        variant: 'destructive' 
      });
    } finally {
      setSaving(false);
      setEditingCell(null);
    }
  };

  const handleCreateItem = async () => {
    if (!newItemTitle.trim()) {
      toast({ title: 'Title required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const defaultStatus = statusOptions.find(s => s.is_default) || statusOptions[0];
      const defaultPriority = priorityOptions.find(p => p.is_default) || priorityOptions.find(p => p.label === 'Medium') || priorityOptions[0];
      
      const newItem = {
        title: newItemTitle.trim(),
        workspace: currentWorkspaceId,
        workboard: id,
        group: newItemGroup,
        status: defaultStatus?.label || 'Not Started',
        status_color: defaultStatus?.color || 'gray',
        priority: defaultPriority?.label || 'Medium',
        priority_color: defaultPriority?.color || 'yellow',
        item_type: 'main_item',
        progress_percentage: 0,
        sort_order: items.length,
        created_by: user?.id,
      };
      
      const created = await base44.entities.WorkboardItem.create(newItem);
      toast({ title: 'Item created' });
      setNewItemTitle('');
      setShowNewItem(false);
      load();
    } catch (error) {
      console.error('Error creating item:', error);
      toast({ 
        title: 'Error creating item', 
        description: error.message, 
        variant: 'destructive' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSubItem = async (parentItemId) => {
    const title = prompt('Enter sub-item title:');
    if (!title || !title.trim()) return;
    
    setSaving(true);
    try {
      const parent = items.find(i => i.id === parentItemId);
      const defaultStatus = statusOptions.find(s => s.is_default) || statusOptions[0];
      const defaultPriority = priorityOptions.find(p => p.is_default) || priorityOptions[0];
      
      const newItem = {
        title: title.trim(),
        workspace: currentWorkspaceId,
        workboard: id,
        parent_item: parentItemId,
        group: parent?.group || 'Backlog',
        status: defaultStatus?.label || 'Not Started',
        status_color: defaultStatus?.color || 'gray',
        priority: defaultPriority?.label || 'Medium',
        priority_color: defaultPriority?.color || 'yellow',
        item_type: 'sub_item',
        progress_percentage: 0,
        created_by: user?.id,
      };
      
      const created = await base44.entities.WorkboardItem.create(newItem);
      toast({ title: 'Sub-item created' });
      setExpandedItems(prev => ({ ...prev, [parentItemId]: true }));
      load();
    } catch (error) {
      console.error('Error creating sub-item:', error);
      toast({ 
        title: 'Error creating sub-item', 
        description: error.message, 
        variant: 'destructive' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (item) => {
    if (!confirm(`Delete "${item.title}"?`)) return;
    
    setSaving(true);
    try {
      const subItems = subItemsMap[item.id] || [];
      for (const sub of subItems) {
        await base44.entities.WorkboardItem.delete(sub.id);
      }
      await base44.entities.WorkboardItem.delete(item.id);
      toast({ title: 'Item deleted' });
      load();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({ 
        title: 'Error deleting item', 
        description: error.message, 
        variant: 'destructive' 
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusOptions = () => {
    return statusOptions.map(s => ({ label: s.label, color: s.color }));
  };

  const getPriorityOptions = () => {
    return priorityOptions.map(p => ({ label: p.label, color: p.color }));
  };

  const renderCell = (item, col) => {
    const field = col.column_type === 'status' ? 'status' : 
                  col.column_type === 'priority' ? 'priority' :
                  col.column_type === 'person' ? 'owner' :
                  col.column_type === 'team' ? 'assignee' :
                  col.column_type === 'date' ? 'due_date' :
                  col.column_type === 'progress' ? 'progress_percentage' :
                  col.name.toLowerCase();
    
    const value = item[field];
    
    if (col.column_type === 'status') {
      const colorClass = STATUS_COLORS[item.status_color] || STATUS_COLORS.gray;
      return (
        <Badge variant="secondary" className={colorClass}>
          {item.status || 'Not Started'}
        </Badge>
      );
    }
    if (col.column_type === 'priority') {
      const colorClass = PRIORITY_COLORS[item.priority_color] || PRIORITY_COLORS.gray;
      return (
        <Badge variant="secondary" className={colorClass}>
          {item.priority || 'Medium'}
        </Badge>
      );
    }
    if (col.column_type === 'person') {
      return (
        <div className="flex items-center gap-2">
          <User className="w-3 h-3 text-muted-foreground" />
          <span className="text-sm">{userMap[value] || '—'}</span>
        </div>
      );
    }
    if (col.column_type === 'team') {
      return (
        <div className="flex items-center gap-2">
          <Users className="w-3 h-3 text-muted-foreground" />
          <span className="text-sm">{userMap[value] || teamMap[value] || '—'}</span>
        </div>
      );
    }
    if (col.column_type === 'date') {
      return <span className="text-sm">{value ? new Date(value).toLocaleDateString() : '—'}</span>;
    }
    if (col.column_type === 'progress') {
      const percent = item.progress_percentage || 0;
      return (
        <div className="flex items-center gap-2">
          <Progress value={percent} className="h-2 w-20" />
          <span className="text-xs text-muted-foreground w-8">{percent}%</span>
        </div>
      );
    }
    if (col.column_type === 'tags') {
      const tags = item.tags || [];
      return (
        <div className="flex gap-1 flex-wrap">
          {tags.slice(0, 2).map((tag, i) => (
            <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
          ))}
          {tags.length > 2 && <Badge variant="outline" className="text-xs">+{tags.length - 2}</Badge>}
        </div>
      );
    }
    if (col.column_type === 'files') {
      const files = item.files || [];
      return (
        <div className="flex items-center gap-1">
          <Paperclip className="w-3 h-3 text-muted-foreground" />
          <span className="text-sm">{files.length}</span>
        </div>
      );
    }
    return <span className="text-sm truncate">{value || '—'}</span>;
  };

  const renderInlineEdit = (item, col) => {
    const field = col.column_type === 'status' ? 'status' : 
                  col.column_type === 'priority' ? 'priority' :
                  col.column_type === 'person' ? 'owner' :
                  col.column_type === 'date' ? 'due_date' :
                  col.column_type === 'progress' ? 'progress_percentage' : null;
    
    if (!field) return renderCell(item, col);
    
    const isEditing = editingCell?.itemId === item.id && editingCell?.field === field;
    
    if (isEditing) {
      if (col.column_type === 'status') {
        return (
          <Select
            value={item.status}
            onValueChange={(value) => handleInlineEdit(item.id, field, value)}
            onOpenChange={(open) => {
              if (!open) setEditingCell(null);
            }}
          >
            <SelectTrigger className="h-7 w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map(s => (
                <SelectItem key={s.id} value={s.label}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      if (col.column_type === 'priority') {
        return (
          <Select
            value={item.priority}
            onValueChange={(value) => handleInlineEdit(item.id, field, value)}
            onOpenChange={(open) => {
              if (!open) setEditingCell(null);
            }}
          >
            <SelectTrigger className="h-7 w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {priorityOptions.map(p => (
                <SelectItem key={p.id} value={p.label}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      if (col.column_type === 'person') {
        return (
          <Select
            value={item.owner}
            onValueChange={(value) => handleInlineEdit(item.id, field, value)}
            onOpenChange={(open) => {
              if (!open) setEditingCell(null);
            }}
          >
            <SelectTrigger className="h-7 w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {users.map(u => (
                <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      if (col.column_type === 'date') {
        return (
          <Input
            type="date"
            value={item.due_date ? item.due_date.split('T')[0] : ''}
            onChange={(e) => handleInlineEdit(item.id, field, e.target.value)}
            onBlur={() => setEditingCell(null)}
            className="h-7 w-auto"
            autoFocus
          />
        );
      }
      if (col.column_type === 'progress') {
        return (
          <Input
            type="number"
            min="0"
            max="100"
            value={item.progress_percentage || 0}
            onChange={(e) => handleInlineEdit(item.id, field, e.target.value)}
            onBlur={() => setEditingCell(null)}
            className="h-7 w-16"
            autoFocus
          />
        );
      }
    }
    
    return (
      <div 
        className="cursor-pointer hover:bg-accent rounded px-2 py-1 -mx-2"
        onClick={() => setEditingCell({ itemId: item.id, field, value: item[field] })}
      >
        {renderCell(item, col)}
      </div>
    );
  };

  if (loading) return <LoadingSpinner />;
  if (!board) return (
    <div className="py-16 text-center text-muted-foreground">
      <h2 className="text-lg font-semibold">Board not found</h2>
      <p className="text-sm mt-1">This workboard may have been deleted or moved.</p>
    </div>
  );

  const canEdit = permissions.canManageWorkboards || permissions.canEditWorkboardItems;
  const canCreate = permissions.canCreateWorkboardItems;

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: 'Workboards', path: '/workboards' }, { label: board.name }]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{board.name}</h1>
          {board.description && <p className="text-sm text-muted-foreground mt-0.5">{board.description}</p>}
        </div>
        <div className="flex gap-2">
          <WorkboardMembers workboardId={id} workspaceId={currentWorkspaceId} />
          <ColumnManager boardId={id} workspaceId={currentWorkspaceId} columns={columns} onColumnsChange={setColumns} />
          {canCreate && (
            <Button onClick={() => setShowNewItem(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> 
              Add Item
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-flex">
          <TabsTrigger value="list" className="gap-2">
            <LayoutList className="w-4 h-4" />
            <span className="hidden sm:inline">List</span>
          </TabsTrigger>
          <TabsTrigger value="board" className="gap-2">
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden sm:inline">Board</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Calendar</span>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-2">
            <GanttChartSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Timeline</span>
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Activity</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                className="pl-9" 
                placeholder="Search items..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
              />
            </div>
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {groups.map(g => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
                {groups.length === 0 && DEFAULT_GROUPS.map(g => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showNewItem && (
            <Card className="border-primary/50 bg-accent/50 mb-4">
              <CardContent className="p-3">
                <div className="flex gap-2 items-center">
                  <Input 
                    value={newItemTitle} 
                    onChange={e => setNewItemTitle(e.target.value)} 
                    placeholder="Enter item title..." 
                    className="flex-1" 
                    autoFocus 
                  />
                  <Select value={newItemGroup} onValueChange={setNewItemGroup}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map(g => (
                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                      ))}
                      {groups.length === 0 && DEFAULT_GROUPS.map(g => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={handleCreateItem} disabled={saving}>
                    {saving ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowNewItem(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="border rounded-xl overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead className="min-w-[200px]">Item Name</TableHead>
                    {columns.map(col => (
                      <TableHead key={col.id} className="min-w-[120px]">{col.name}</TableHead>
                    ))}
                    {columns.length === 0 && (
                      <>
                        <TableHead className="min-w-[120px]">Status</TableHead>
                        <TableHead className="min-w-[120px]">Priority</TableHead>
                        <TableHead className="min-w-[120px]">Owner</TableHead>
                        <TableHead className="min-w-[120px]">Due Date</TableHead>
                        <TableHead className="min-w-[100px]">Progress</TableHead>
                      </>
                    )}
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={columns.length + 3} className="py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <p>No items yet</p>
                          {canCreate && (
                            <Button size="sm" onClick={() => setShowNewItem(true)}>
                              <Plus className="w-4 h-4 mr-1.5" /> 
                              Add First Item
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item) => {
                      const subItems = subItemsMap[item.id] || [];
                      const isExpanded = expandedItems[item.id];
                      return (
                        <React.Fragment key={item.id}>
                          <TableRow className="hover:bg-accent/50">
                            <TableCell>
                              {subItems.length > 0 && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6" 
                                  onClick={() => toggleExpand(item.id)}
                                >
                                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </Button>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${
                                  item.item_type === 'milestone' ? 'bg-purple-500' : 
                                  item.item_type === 'sub_item' ? 'bg-blue-400' : 
                                  'bg-gray-400'
                                }`} />
                                {item.title}
                              </div>
                            </TableCell>
                            {columns.map(col => (
                              <TableCell key={col.id}>
                                {canEdit ? renderInlineEdit(item, col) : renderCell(item, col)}
                              </TableCell>
                            ))}
                            {columns.length === 0 && (
                              <>
                                <TableCell>
                                  {canEdit ? renderInlineEdit(item, { column_type: 'status' }) : renderCell(item, { column_type: 'status' })}
                                </TableCell>
                                <TableCell>
                                  {canEdit ? renderInlineEdit(item, { column_type: 'priority' }) : renderCell(item, { column_type: 'priority' })}
                                </TableCell>
                                <TableCell>
                                  {canEdit ? renderInlineEdit(item, { column_type: 'person' }) : renderCell(item, { column_type: 'person' })}
                                </TableCell>
                                <TableCell>
                                  {canEdit ? renderInlineEdit(item, { column_type: 'date' }) : renderCell(item, { column_type: 'date' })}
                                </TableCell>
                                <TableCell>
                                  {canEdit ? renderInlineEdit(item, { column_type: 'progress' }) : renderCell(item, { column_type: 'progress' })}
                                </TableCell>
                              </>
                            )}
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {canCreate && (
                                    <DropdownMenuItem onClick={() => handleCreateSubItem(item.id)}>
                                      <Plus className="w-3.5 h-3.5 mr-2" /> 
                                      Add Sub-item
                                    </DropdownMenuItem>
                                  )}
                                  {canEdit && (
                                    <DropdownMenuItem onClick={() => handleDeleteItem(item)} className="text-destructive">
                                      Delete
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                          {isExpanded && subItems.map(sub => (
                            <TableRow key={sub.id} className="bg-muted/30 hover:bg-accent/50">
                              <TableCell></TableCell>
                              <TableCell className="pl-8">
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                  {sub.title}
                                </div>
                              </TableCell>
                              {columns.map(col => (
                                <TableCell key={col.id}>
                                  {canEdit ? renderInlineEdit(sub, col) : renderCell(sub, col)}
                                </TableCell>
                              ))}
                              {columns.length === 0 && (
                                <>
                                  <TableCell>
                                    {canEdit ? renderInlineEdit(sub, { column_type: 'status' }) : renderCell(sub, { column_type: 'status' })}
                                  </TableCell>
                                  <TableCell>
                                    {canEdit ? renderInlineEdit(sub, { column_type: 'priority' }) : renderCell(sub, { column_type: 'priority' })}
                                  </TableCell>
                                  <TableCell>
                                    {canEdit ? renderInlineEdit(sub, { column_type: 'person' }) : renderCell(sub, { column_type: 'person' })}
                                  </TableCell>
                                  <TableCell>
                                    {canEdit ? renderInlineEdit(sub, { column_type: 'date' }) : renderCell(sub, { column_type: 'date' })}
                                  </TableCell>
                                  <TableCell>
                                    {canEdit ? renderInlineEdit(sub, { column_type: 'progress' }) : renderCell(sub, { column_type: 'progress' })}
                                  </TableCell>
                                </>
                              )}
                              <TableCell>
                                {canEdit && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6" 
                                    onClick={() => handleDeleteItem(sub)}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </React.Fragment>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="board" className="mt-4">
          <div className="text-center py-12 text-muted-foreground">
            <LayoutGrid className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold">Board View</h3>
            <p className="text-sm mt-1">Coming Soon - Group items by status in a kanban-style board</p>
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold">Calendar View</h3>
            <p className="text-sm mt-1">Coming Soon - View items by due date on a calendar</p>
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <div className="text-center py-12 text-muted-foreground">
            <GanttChartSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold">Timeline View</h3>
            <p className="text-sm mt-1">Coming Soon - Gantt-style timeline with start and end dates</p>
          </div>
        </TabsContent>

        <TabsContent value="dashboard" className="mt-4">
          <div className="text-center py-12 text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold">Dashboard View</h3>
            <p className="text-sm mt-1">Coming Soon - Analytics and metrics for this workboard</p>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <div className="text-center py-12 text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold">Activity View</h3>
            <p className="text-sm mt-1">Coming Soon - Recent changes and updates on this workboard</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}