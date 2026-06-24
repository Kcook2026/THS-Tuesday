import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  User, Users, Shield, Trash2, Users as UsersIcon
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
import MembersDrawer from '@/components/workboards/MembersDrawer';
import { STATUS_COLORS, PRIORITY_COLORS } from '@/components/workboards/WorkboardConstants';

export default function WorkboardDetail() {
  const { id } = useParams();
  const { currentWorkspaceId } = useWorkspace();
  const { toast } = useToast();
  const permissions = usePermissions();

  // Board state
  const [board, setBoard] = useState(null);
  const [items, setItems] = useState([]);
  const [groups, setGroups] = useState([]);
  const [columns, setColumns] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [priorityOptions, setPriorityOptions] = useState([]);
  const [users, setUsers] = useState([]);
  const [user, setUser] = useState(null);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list');
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [expandedItems, setExpandedItems] = useState({});
  const [editingCell, setEditingCell] = useState(null);
  const [showNewItem, setShowNewItem] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemGroup, setNewItemGroup] = useState(null);
  const [saving, setSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Prevent duplicate operations
  const isInitialLoadRef = useRef(true);
  const isLoadingRef = useRef(false);

  // Load board metadata
  const loadBoard = useCallback(async () => {
    const b = await base44.entities.Workboard.get(id);
    setBoard(b);
    return b;
  }, [id]);

  // Load board configuration (groups, columns, status/priority options)
  const loadBoardConfig = useCallback(async () => {
    const [g, c, s, p] = await Promise.all([
      base44.entities.BoardGroup.filter({ workboard: id, archived: false }),
      base44.entities.BoardColumn.filter({ workboard: id }),
      base44.entities.StatusOption.filter({ workboard: id }),
      base44.entities.PriorityOption.filter({ workboard: id }),
    ]);
    
    setGroups(g.sort((a, b) => a.sort_order - b.sort_order));
    setColumns(c.sort((a, b) => a.sort_order - b.sort_order));
    setStatusOptions(s.sort((a, b) => a.sort_order - b.sort_order));
    setPriorityOptions(p.sort((a, b) => a.sort_order - b.sort_order));
  }, [id]);

  // Load items
  const loadItems = useCallback(async () => {
    const i = await base44.entities.WorkboardItem.filter({ workboard: id, archived: false });
    setItems(i);
  }, [id]);

  // Load users
  const loadUsers = useCallback(async () => {
    const [u, me] = await Promise.all([
      base44.entities.User.list(),
      base44.auth.me(),
    ]);
    setUsers(u);
    setUser(me);
  }, []);

  // Initial load - runs once
  const load = useCallback(async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setLoading(true);
    
    try {
      await Promise.all([loadBoard(), loadBoardConfig(), loadItems(), loadUsers()]);
    } catch (error) {
      console.error('Error loading board:', error);
      if (isInitialLoadRef.current) {
        toast({ 
          title: 'Error loading board', 
          description: error.message, 
          variant: 'destructive',
          duration: 6000,
        });
      }
    } finally {
      setLoading(false);
      isInitialLoadRef.current = false;
      isLoadingRef.current = false;
    }
  }, [loadBoard, loadBoardConfig, loadItems, loadUsers, toast]);

  useEffect(() => { 
    load(); 
  }, [load]);

  // Subscribe to real-time updates - ONLY update items array, never trigger reloads
  useEffect(() => {
    if (!id) return;
    const unsubscribe = base44.entities.WorkboardItem.subscribe((event) => {
      if (event.type === 'create' && event.data) {
        setItems(prev => {
          // Prevent duplicates by checking if item already exists
          if (prev.some(item => item.id === event.data.id)) {
            return prev;
          }
          return [...prev, event.data];
        });
      } else if (event.type === 'update' && event.data) {
        setItems(prev => prev.map(it => it.id === event.data.id ? { ...it, ...event.data } : it));
      } else if (event.type === 'delete') {
        setItems(prev => prev.filter(it => it.id !== event.entity_id));
      }
    });
    return () => unsubscribe();
  }, [id]);

  // Helper maps
  const userMap = Object.fromEntries(users.map(u => [u.id, u.full_name || u.email]));
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
    if (groupFilter !== 'all') {
      const itemGroup = groups.find(g => g.id === item.group);
      if (itemGroup?.name !== groupFilter && item.group !== groupFilter) return false;
    }
    return true;
  });

  const toggleExpand = (itemId) => {
    setExpandedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  // Get or create default options
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
        { label: 'Not Started', workspace: currentWorkspaceId, workboard: id, color: 'gray', sort_order: 0, is_default: true, created_by: user?.id },
        { label: 'Working On It', workspace: currentWorkspaceId, workboard: id, color: 'blue', sort_order: 1, created_by: user?.id },
        { label: 'Stuck', workspace: currentWorkspaceId, workboard: id, color: 'red', sort_order: 2, created_by: user?.id },
        { label: 'Waiting', workspace: currentWorkspaceId, workboard: id, color: 'yellow', sort_order: 3, created_by: user?.id },
        { label: 'Done', workspace: currentWorkspaceId, workboard: id, color: 'green', sort_order: 4, created_by: user?.id },
      ];
      const createdStatuses = await Promise.all(defaultStatuses.map(s => base44.entities.StatusOption.create(s)));
      targetStatusOptions = createdStatuses.sort((a, b) => a.sort_order - b.sort_order);
      setStatusOptions(targetStatusOptions);
    }
    
    if (priorityOptions.length === 0) {
      const defaultPriorities = [
        { label: 'Low', workspace: currentWorkspaceId, workboard: id, color: 'blue', sort_order: 0, created_by: user?.id },
        { label: 'Medium', workspace: currentWorkspaceId, workboard: id, color: 'yellow', sort_order: 1, is_default: true, created_by: user?.id },
        { label: 'High', workspace: currentWorkspaceId, workboard: id, color: 'orange', sort_order: 2, created_by: user?.id },
        { label: 'Critical', workspace: currentWorkspaceId, workboard: id, color: 'red', sort_order: 3, created_by: user?.id },
      ];
      const createdPriorities = await Promise.all(defaultPriorities.map(p => base44.entities.PriorityOption.create(p)));
      targetPriorityOptions = createdPriorities.sort((a, b) => a.sort_order - b.sort_order);
      setPriorityOptions(targetPriorityOptions);
    }

    return { targetGroups, targetStatusOptions, targetPriorityOptions };
  };

  // Handle inline cell editing
  const handleInlineEdit = async (itemId, field, value, column = null) => {
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
      
      // Update local state
      setItems(prev => prev.map(it => it.id === itemId ? { ...it, ...updateData } : it));
      toast({ title: 'Updated', description: 'Item updated successfully', duration: 2000 });
    } catch (error) {
      console.error('Error updating:', error);
      toast({ title: 'Update failed', description: error.message, variant: 'destructive', duration: 5000 });
    } finally {
      setSaving(false);
      setEditingCell(null);
    }
  };

  // Create new item - prevents duplicates
  const handleCreateItem = async () => {
    if (!newItemTitle.trim() || isCreating) {
      if (!newItemTitle.trim()) {
        toast({ title: 'Title required', description: 'Please enter a title for the item', variant: 'destructive', duration: 4000 });
      }
      return;
    }
    
    setIsCreating(true);
    setSaving(true);
    
    try {
      const { targetGroups, targetStatusOptions, targetPriorityOptions } = await ensureDefaults();
      
      const defaultStatus = targetStatusOptions.find(s => s.is_default) || targetStatusOptions[0];
      const defaultPriority = targetPriorityOptions.find(p => p.is_default) || targetPriorityOptions.find(p => p.label === 'Medium') || targetPriorityOptions[0];
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
        item_type: 'main_item',
        progress_percentage: 0,
        sort_order: items.length,
        created_by: user?.id,
        archived: false,
      };
      
      const created = await base44.entities.WorkboardItem.create(newItem);
      
      toast({ 
        title: 'Item created', 
        description: `"${newItem.title}" added to ${selectedGroup?.name || 'This Week'}`,
        duration: 2000,
      });
      
      setNewItemTitle('');
      setShowNewItem(false);
      // Don't manually add to state - let subscription handle it to avoid duplicates
    } catch (error) {
      console.error('Error creating item:', error);
      toast({ title: 'Failed to create item', description: error.message, variant: 'destructive', duration: 5000 });
    } finally {
      setSaving(false);
      setIsCreating(false);
    }
  };

  // Create sub-item
  const handleCreateSubItem = async (parentItemId) => {
    const title = prompt('Enter sub-item title:');
    if (!title || !title.trim() || isCreating) return;
    
    setIsCreating(true);
    setSaving(true);
    
    try {
      const { targetGroups, targetStatusOptions, targetPriorityOptions } = await ensureDefaults();
      
      const parent = items.find(i => i.id === parentItemId);
      const defaultStatus = targetStatusOptions.find(s => s.is_default) || targetStatusOptions[0];
      const defaultPriority = targetPriorityOptions.find(p => p.is_default) || targetPriorityOptions[0];
      const selectedGroup = targetGroups.find(g => g.id === parent?.group) || targetGroups[0];
      
      const newItem = {
        title: title.trim(),
        workspace: currentWorkspaceId,
        workboard: id,
        parent_item: parentItemId,
        group: selectedGroup?.id || parent?.group,
        status: defaultStatus?.label || 'Not Started',
        status_color: defaultStatus?.color || 'gray',
        priority: defaultPriority?.label || 'Medium',
        priority_color: defaultPriority?.color || 'yellow',
        item_type: 'sub_item',
        progress_percentage: 0,
        created_by: user?.id,
      };
      
      const created = await base44.entities.WorkboardItem.create(newItem);
      
      toast({ title: 'Sub-item created', duration: 2000 });
      setExpandedItems(prev => ({ ...prev, [parentItemId]: true }));
      // Don't manually add to state - let subscription handle it
    } catch (error) {
      console.error('Error creating sub-item:', error);
      toast({ title: 'Failed to create sub-item', description: error.message, variant: 'destructive', duration: 5000 });
    } finally {
      setSaving(false);
      setIsCreating(false);
    }
  };

  // Delete item
  const handleDeleteItem = async (item) => {
    if (!confirm(`Delete "${item.title}"?`)) return;
    
    setSaving(true);
    try {
      const subItems = subItemsMap[item.id] || [];
      for (const sub of subItems) {
        await base44.entities.WorkboardItem.delete(sub.id);
      }
      const deletedId = item.id;
      await base44.entities.WorkboardItem.delete(item.id);
      
      toast({ title: 'Item deleted', duration: 2000 });
      // Don't manually update state - let subscription handle it
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({ title: 'Failed to delete item', description: error.message, variant: 'destructive', duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  // Render cell content
  const renderCell = (item, col) => {
    const systemField = col.column_type === 'status' ? 'status' : 
                        col.column_type === 'priority' ? 'priority' :
                        col.column_type === 'person' ? 'owner' :
                        col.column_type === 'team' ? 'assignee' :
                        col.column_type === 'date' ? 'due_date' :
                        col.column_type === 'progress' ? 'progress_percentage' : null;
    
    const value = systemField ? item[systemField] : item[col.name.toLowerCase().replace(/\s+/g, '_')];
    
    if (col.column_type === 'status') {
      const colorClass = STATUS_COLORS[item.status_color] || STATUS_COLORS.gray;
      return <Badge variant="secondary" className={colorClass}>{item.status || 'Not Started'}</Badge>;
    }
    if (col.column_type === 'priority') {
      const colorClass = PRIORITY_COLORS[item.priority_color] || PRIORITY_COLORS.gray;
      return <Badge variant="secondary" className={colorClass}>{item.priority || 'Medium'}</Badge>;
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
          <span className="text-sm">{value || '—'}</span>
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
    return <span className="text-sm truncate">{value || '—'}</span>;
  };

  // Render inline editor
  const renderInlineEdit = (item, col) => {
    const field = col.column_type === 'status' ? 'status' : 
                  col.column_type === 'priority' ? 'priority' :
                  col.column_type === 'person' ? 'owner' :
                  col.column_type === 'date' ? 'due_date' :
                  col.column_type === 'progress' ? 'progress_percentage' : null;
    
    const isEditing = editingCell?.itemId === item.id && editingCell?.column?.id === col.id;
    
    if (isEditing) {
      if (col.column_type === 'status') {
        return (
          <Select value={item.status} onValueChange={(value) => handleInlineEdit(item.id, 'status', value, col)} onOpenChange={() => setEditingCell(null)}>
            <SelectTrigger className="h-7 w-auto"><SelectValue /></SelectTrigger>
            <SelectContent>{statusOptions.map(s => <SelectItem key={s.id} value={s.label}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        );
      }
      if (col.column_type === 'priority') {
        return (
          <Select value={item.priority} onValueChange={(value) => handleInlineEdit(item.id, 'priority', value, col)} onOpenChange={() => setEditingCell(null)}>
            <SelectTrigger className="h-7 w-auto"><SelectValue /></SelectTrigger>
            <SelectContent>{priorityOptions.map(p => <SelectItem key={p.id} value={p.label}>{p.label}</SelectItem>)}</SelectContent>
          </Select>
        );
      }
      if (col.column_type === 'person') {
        return (
          <Select value={item.owner || ''} onValueChange={(value) => handleInlineEdit(item.id, 'owner', value, col)} onOpenChange={() => setEditingCell(null)}>
            <SelectTrigger className="h-7 w-auto"><SelectValue placeholder="Select user" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Clear</SelectItem>
              {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
            </SelectContent>
          </Select>
        );
      }
      if (col.column_type === 'date') {
        return <Input type="date" value={item.due_date ? item.due_date.split('T')[0] : ''} onChange={(e) => handleInlineEdit(item.id, 'due_date', e.target.value, col)} onBlur={() => setEditingCell(null)} className="h-7 w-auto" autoFocus />;
      }
      if (col.column_type === 'progress') {
        return <Input type="number" min="0" max="100" value={item.progress_percentage || 0} onChange={(e) => handleInlineEdit(item.id, 'progress_percentage', e.target.value, col)} onBlur={() => setEditingCell(null)} className="h-7 w-16" autoFocus />;
      }
    }
    
    const value = field ? item[field] : item[col.name.toLowerCase().replace(/\s+/g, '_')];
    
    return (
      <div className="cursor-pointer hover:bg-accent rounded px-2 py-1 -mx-2" onClick={() => setEditingCell({ itemId: item.id, column: col, value })}>
        {renderCell(item, col)}
      </div>
    );
  };

  // Render table row
  const renderTableRow = (item, canEdit, canCreate, canDelete) => {
    const subItems = subItemsMap[item.id] || [];
    const isExpanded = expandedItems[item.id];
    
    return (
      <React.Fragment key={item.id}>
        <TableRow className="hover:bg-accent/50">
          <TableCell>
            {subItems.length > 0 && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleExpand(item.id)}>
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Button>
            )}
          </TableCell>
          <TableCell className="font-medium">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${item.item_type === 'milestone' ? 'bg-purple-500' : item.item_type === 'sub_item' ? 'bg-blue-400' : 'bg-gray-400'}`} />
              {item.title}
            </div>
          </TableCell>
          {columns.map(col => (
            <TableCell key={col.id}>{canEdit ? renderInlineEdit(item, col) : renderCell(item, col)}</TableCell>
          ))}
          {columns.length === 0 && (
            <>
              <TableCell>{canEdit ? renderInlineEdit(item, { column_type: 'status' }) : renderCell(item, { column_type: 'status' })}</TableCell>
              <TableCell>{canEdit ? renderInlineEdit(item, { column_type: 'priority' }) : renderCell(item, { column_type: 'priority' })}</TableCell>
              <TableCell>{canEdit ? renderInlineEdit(item, { column_type: 'person' }) : renderCell(item, { column_type: 'person' })}</TableCell>
              <TableCell>{canEdit ? renderInlineEdit(item, { column_type: 'date' }) : renderCell(item, { column_type: 'date' })}</TableCell>
              <TableCell>{canEdit ? renderInlineEdit(item, { column_type: 'progress' }) : renderCell(item, { column_type: 'progress' })}</TableCell>
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
                {canCreate && <DropdownMenuItem onClick={() => handleCreateSubItem(item.id)}><Plus className="w-3.5 h-3.5 mr-2" />Add Sub-item</DropdownMenuItem>}
                {canDelete && <DropdownMenuItem onClick={() => handleDeleteItem(item)} className="text-destructive">Delete</DropdownMenuItem>}
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
            {columns.map(col => <TableCell key={col.id}>{canEdit ? renderInlineEdit(sub, col) : renderCell(sub, col)}</TableCell>)}
            {columns.length === 0 && (
              <>
                <TableCell>{canEdit ? renderInlineEdit(sub, { column_type: 'status' }) : renderCell(sub, { column_type: 'status' })}</TableCell>
                <TableCell>{canEdit ? renderInlineEdit(sub, { column_type: 'priority' }) : renderCell(sub, { column_type: 'priority' })}</TableCell>
                <TableCell>{canEdit ? renderInlineEdit(sub, { column_type: 'person' }) : renderCell(sub, { column_type: 'person' })}</TableCell>
                <TableCell>{canEdit ? renderInlineEdit(sub, { column_type: 'date' }) : renderCell(sub, { column_type: 'date' })}</TableCell>
                <TableCell>{canEdit ? renderInlineEdit(sub, { column_type: 'progress' }) : renderCell(sub, { column_type: 'progress' })}</TableCell>
              </>
            )}
            <TableCell>
              {canDelete && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteItem(sub)}><X className="w-3 h-3" /></Button>}
            </TableCell>
          </TableRow>
        ))}
      </React.Fragment>
    );
  };

  // Permission checks
  if (loading) return <LoadingSpinner />;
  if (!board) return <div className="py-16 text-center text-muted-foreground"><h2 className="text-lg font-semibold">Board not found</h2><p className="text-sm mt-1">This workboard may have been deleted or moved.</p></div>;
  
  if (!permissions.canAccessWorkboard(id, board)) {
    return <div className="py-16 text-center"><Shield className="w-10 h-10 text-muted-foreground mx-auto mb-3" /><h2 className="text-lg font-semibold mb-2">Access Denied</h2><p className="text-sm text-muted-foreground">You don't have permission to view this workboard.</p></div>;
  }

  const workboardPerms = permissions.getWorkboardPermissions(id);
  const workspaceRoleCanCreate = permissions.workspacePermissions?.canCreateWorkboards || permissions.workspacePermissions?.canManageBoards;
  const workboardRoleCanCreate = workboardPerms.canCreateItems || workboardPerms.canEditItems;
  const isAdminOrManager = permissions.isSystemAdmin || permissions.isExecutive || permissions.isManager;
  
  const canCreate = isAdminOrManager || workspaceRoleCanCreate || workboardRoleCanCreate;
  const canEdit = canCreate;
  const canDelete = workboardPerms.canDeleteItems || isAdminOrManager;

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
          <ColumnManager boardId={id} workspaceId={currentWorkspaceId} columns={columns} onColumnsChange={setColumns} />
          {canCreate && <Button onClick={() => setShowNewItem(true)} disabled={isCreating}><Plus className="w-4 h-4 mr-1.5" />Add Item</Button>}
          {canDelete && (
            <Button variant="destructive" size="sm" onClick={async () => {
              if (!confirm(`Delete "${board.name}"?\n\nThis will permanently delete:\n- All items and sub-items\n- All groups\n- All columns\n- All status/priority options\n- All board members\n\nThis action cannot be undone.`)) return;
              setSaving(true);
              try {
                const [itemsData, groupsData, columnsData, statuses, priorities, members] = await Promise.all([
                  base44.entities.WorkboardItem.filter({ workboard: id }),
                  base44.entities.BoardGroup.filter({ workboard: id }),
                  base44.entities.BoardColumn.filter({ workboard: id }),
                  base44.entities.StatusOption.filter({ workboard: id }),
                  base44.entities.PriorityOption.filter({ workboard: id }),
                  base44.entities.WorkboardMember.filter({ workboard: id }),
                ]);
                
                for (const item of itemsData) await base44.entities.WorkboardItem.delete(item.id);
                for (const g of groupsData) await base44.entities.BoardGroup.delete(g.id);
                for (const c of columnsData) await base44.entities.BoardColumn.delete(c.id);
                for (const s of statuses) await base44.entities.StatusOption.delete(s.id);
                for (const p of priorities) await base44.entities.PriorityOption.delete(p.id);
                for (const m of members) await base44.entities.WorkboardMember.delete(m.id);
                await base44.entities.Workboard.delete(id);
                
                toast({ title: 'Board deleted', duration: 2000 });
                window.location.href = '/workboards';
              } catch (error) {
                console.error('Delete error:', error);
                toast({ title: 'Failed to delete board', description: error.message, variant: 'destructive', duration: 5000 });
              } finally {
                setSaving(false);
              }
            }} disabled={saving}><Trash2 className="w-4 h-4 mr-1.5" />{saving ? 'Deleting...' : 'Delete Board'}</Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-flex">
          <TabsTrigger value="list" className="gap-2"><LayoutList className="w-4 h-4" /><span className="hidden sm:inline">List</span></TabsTrigger>
          <TabsTrigger value="board" className="gap-2"><LayoutGrid className="w-4 h-4" /><span className="hidden sm:inline">Board</span></TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2"><Calendar className="w-4 h-4" /><span className="hidden sm:inline">Calendar</span></TabsTrigger>
          <TabsTrigger value="timeline" className="gap-2"><GanttChartSquare className="w-4 h-4" /><span className="hidden sm:inline">Timeline</span></TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-2"><BarChart3 className="w-4 h-4" /><span className="hidden sm:inline">Dashboard</span></TabsTrigger>
          <TabsTrigger value="activity" className="gap-2"><Activity className="w-4 h-4" /><span className="hidden sm:inline">Activity</span></TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Filter by group" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {groups.length > 0 ? groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>) : (
                  <><SelectItem value="This Week">This Week</SelectItem><SelectItem value="Next Week">Next Week</SelectItem><SelectItem value="Backlog">Backlog</SelectItem><SelectItem value="Completed">Completed</SelectItem></>
                )}
              </SelectContent>
            </Select>
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
          
          {!canCreate && (
            <Card className="mb-4 border-amber-200 bg-amber-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Item creation disabled</p>
                    <p className="text-xs text-amber-700">You do not have permission to add items to this board.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Group-based view */}
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
                              <TableHead className="w-8"></TableHead>
                              <TableHead className="min-w-[200px]">Item Name</TableHead>
                              {columns.map(col => <TableHead key={col.id} className="min-w-[120px]">{col.name}</TableHead>)}
                              {columns.length === 0 && (<><TableHead className="min-w-[120px]">Status</TableHead><TableHead className="min-w-[120px]">Priority</TableHead><TableHead className="min-w-[120px]">Owner</TableHead><TableHead className="min-w-[120px]">Due Date</TableHead><TableHead className="min-w-[100px]">Progress</TableHead></>)}
                              <TableHead className="w-10"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {groupItems.length === 0 ? (
                              <TableRow><TableCell colSpan={columns.length + 3} className="py-8 text-center text-muted-foreground text-sm">No items in this group</TableCell></TableRow>
                            ) : (
                              groupItems.map(item => renderTableRow(item, canEdit, canCreate, canDelete))
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
                      <TableHead className="w-8"></TableHead>
                      <TableHead className="min-w-[200px]">Item Name</TableHead>
                      {columns.map(col => <TableHead key={col.id} className="min-w-[120px]">{col.name}</TableHead>)}
                      {columns.length === 0 && (<><TableHead className="min-w-[120px]">Status</TableHead><TableHead className="min-w-[120px]">Priority</TableHead><TableHead className="min-w-[120px]">Owner</TableHead><TableHead className="min-w-[120px]">Due Date</TableHead><TableHead className="min-w-[100px]">Progress</TableHead></>)}
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={columns.length + 3} className="py-12 text-center text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <p>No items yet</p>
                            {canCreate && <Button size="sm" onClick={() => setShowNewItem(true)}><Plus className="w-4 h-4 mr-1.5" />Add First Item</Button>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredItems.map(item => renderTableRow(item, canEdit, canCreate, canDelete))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="board" className="mt-4">
          <div className="text-center py-12 text-muted-foreground">
            <LayoutGrid className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold">Board View</h3>
            <p className="text-sm mt-1">Coming Soon</p>
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold">Calendar View</h3>
            <p className="text-sm mt-1">Coming Soon</p>
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <div className="text-center py-12 text-muted-foreground">
            <GanttChartSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold">Timeline View</h3>
            <p className="text-sm mt-1">Coming Soon</p>
          </div>
        </TabsContent>

        <TabsContent value="dashboard" className="mt-4">
          <div className="text-center py-12 text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold">Dashboard View</h3>
            <p className="text-sm mt-1">Coming Soon</p>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <div className="text-center py-12 text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold">Activity View</h3>
            <p className="text-sm mt-1">Coming Soon</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}