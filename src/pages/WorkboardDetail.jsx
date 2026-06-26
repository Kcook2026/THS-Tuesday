import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
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
import { useConfirm } from '@/components/shared/ConfirmDialog';
import {
  Plus, Search, Settings, Archive, Trash2, Save, X, Tag,
  LayoutList, LayoutGrid, Calendar as CalendarIcon, Copy, UserPlus, AlertTriangle
} from 'lucide-react';
import DuplicateBoardDialog from '@/components/workboards/DuplicateBoardDialog';
import AddGroupDialog from '@/components/workboards/AddGroupDialog';
import BoardListDnd from '@/components/workboards/dnd/BoardListDnd';
import { isOrphanedBoard, safeDeleteBoardData, assignBoardToMe } from '@/lib/boardLifecycle';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import CustomCellRenderer from '@/components/workboards/CustomCellRenderer';

export default function WorkboardDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { currentWorkspaceId } = useWorkspace();
  const { toast } = useToast();
  const confirm = useConfirm();
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
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [groupSaving, setGroupSaving] = useState(false);
  const [showBoardSettings, setShowBoardSettings] = useState(false);
  const [showDuplicate, setShowDuplicate] = useState(false);
  const [columns, setColumns] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedItemTab, setSelectedItemTab] = useState('overview');
  const [showItemDetail, setShowItemDetail] = useState(false);
  const [activeView, setActiveView] = useState('list');
  const [boardMembers, setBoardMembers] = useState([]);

  // Handle URL query params for opening items
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const itemId = params.get('item');
    const tab = params.get('tab') || 'overview';
    
    if (itemId && items.length > 0) {
      const item = items.find(i => i.id === itemId);
      if (item) {
        setSelectedItem(item);
        setSelectedItemTab(tab);
        setShowItemDetail(true);
      }
    }
  }, [items]);
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
      const [b, g, s, p, i, u, me, cols, t, bm] = await Promise.all([
        base44.entities.Workboard.get(id),
        base44.entities.BoardGroup.filter({ workboard: id, archived: false }),
        base44.entities.StatusOption.filter({ workboard: id }),
        base44.entities.PriorityOption.filter({ workboard: id }),
        base44.entities.WorkboardItem.filter({ workspace: currentWorkspaceId, workboard: id, archived: false }),
        base44.entities.User.list(),
        base44.auth.me(),
        base44.entities.BoardColumn.filter({ workboard: id }).catch(() => []),
        base44.entities.Team.filter({ workspace: currentWorkspaceId }).catch(() => []),
        base44.entities.WorkboardMember.filter({ workboard: id }).catch(() => []),
      ]);

      // Load all comments and attachments for this board in a single query (avoids N+1 rate limit)
      const allComments = await base44.entities.Comment.filter({
        workboard: id,
        record_type: 'WorkboardItem',
        deleted: false,
      }).catch(() => []);
      const commentCounts = (allComments || []).reduce((acc, c) => {
        acc[c.record_id] = (acc[c.record_id] || 0) + 1;
        return acc;
      }, {});

      const allAttachments = await base44.entities.Attachment.filter({
        workboard: id,
        item: { $ne: null },
        category: 'item_file',
      }).catch(() => []);
      const fileCounts = (allAttachments || []).reduce((acc, a) => {
        if (a.item) acc[a.item] = (acc[a.item] || 0) + 1;
        return acc;
      }, {});

      const itemsWithCounts = i.map(item => ({
        ...item,
        _commentCount: commentCounts[item.id] || 0,
        _fileCount: fileCounts[item.id] || 0,
      }));

      setBoard(b);
      setGroups(g.sort((a, b) => a.sort_order - b.sort_order));
      setStatusOptions(s.sort((a, b) => a.sort_order - b.sort_order));
      setPriorityOptions(p.sort((a, b) => a.sort_order - b.sort_order));
      setItems(itemsWithCounts);
      setUsers(u);
      setUser(me);
      setColumns(cols);
      setTeams(t);
      setBoardMembers(bm);
    } catch (error) {
      toast({ title: 'Error loading board', description: error.message, variant: 'destructive', duration: 6000 });
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [id, toast]);

  useEffect(() => { load(); }, [load]);

  // Handle URL query params to open item drawer
  useEffect(() => {
    const itemId = searchParams.get('item');
    const tab = searchParams.get('tab') || 'overview';
    
    if (itemId && items.length > 0) {
      const item = items.find(i => i.id === itemId);
      if (item) {
        setSelectedItem(item);
        setSelectedItemTab(tab);
        setShowItemDetail(true);
      }
    }
  }, [searchParams, items]);

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
        sort_order: items.filter(i => i.group === selectedGroup.id && !i.parent_item).length,
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
    const ok = await confirm({
      title: 'Delete Item?',
      message: `Are you sure you want to delete "${item.title}"?${item.parent_item ? '' : ' All sub-items will also be deleted.'} This action cannot be undone.`,
      confirmLabel: 'Delete',
    });
    if (!ok) return;

    setSaving(true);
    try {
      // Delete sub-items first (if this is a main item)
      const subItems = items.filter(i => i.parent_item === item.id);
      if (subItems.length > 0) {
        await Promise.all(subItems.map(s => base44.entities.WorkboardItem.delete(s.id)));
      }
      await base44.entities.WorkboardItem.delete(item.id);
      setItems(prev => prev.filter(i => i.id !== item.id && i.parent_item !== item.id));
      toast({ title: 'Item deleted', duration: 2000 });
    } catch (error) {
      toast({ title: 'Failed to delete item', description: error.message, variant: 'destructive', duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  const handleItemClick = (item, tab = 'overview') => {
    setSelectedItem(item);
    setShowItemDetail(true);
    setSelectedItemTab(tab);
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

  const handleMoveItemToGroup = async (itemId, targetGroupId) => {
    try {
      const item = items.find(i => i.id === itemId);
      if (!item) return;
      const targetGroupItems = items.filter(i => i.group === targetGroupId && !i.parent_item);
      const newSortOrder = targetGroupItems.length;
      const subItems = items.filter(i => i.parent_item === itemId);

      await base44.entities.WorkboardItem.update(itemId, {
        group: targetGroupId,
        sort_order: newSortOrder,
      });
      if (subItems.length > 0) {
        await Promise.all(
          subItems.map(s => base44.entities.WorkboardItem.update(s.id, { group: targetGroupId }))
        );
      }

      setItems(prev => prev.map(i => {
        if (i.id === itemId) return { ...i, group: targetGroupId, sort_order: newSortOrder };
        if (i.parent_item === itemId) return { ...i, group: targetGroupId };
        return i;
      }));
      toast({ title: 'Item moved', duration: 2000 });
    } catch (error) {
      toast({ title: 'Failed to move item', description: error.message, variant: 'destructive', duration: 5000 });
    }
  };

  const handleItemReorder = async (itemId, direction) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const groupItems = items
      .filter(i => i.group === item.group && !i.parent_item)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const index = groupItems.findIndex(i => i.id === itemId);
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= groupItems.length) return;
    [groupItems[index], groupItems[newIndex]] = [groupItems[newIndex], groupItems[index]];
    const reordered = groupItems.map((g, i) => ({ ...g, sort_order: i }));
    setItems(prev => prev.map(i => {
      const r = reordered.find(x => x.id === i.id);
      return r ? { ...i, sort_order: r.sort_order } : i;
    }));
    try {
      await Promise.all(reordered.map((g, i) => base44.entities.WorkboardItem.update(g.id, { sort_order: i })));
    } catch (error) {
      toast({ title: 'Failed to persist item order', description: error.message, variant: 'destructive', duration: 5000 });
    }
  };

  const handleMoveSubItem = async (subItemId, newParentId) => {
    try {
      const subItem = items.find(i => i.id === subItemId);
      if (!subItem) return;
      const newParent = items.find(i => i.id === newParentId);
      if (!newParent) return;
      const existingSubItems = items.filter(i => i.parent_item === newParentId && i.id !== subItemId);
      const newSortOrder = existingSubItems.length;
      await base44.entities.WorkboardItem.update(subItemId, {
        parent_item: newParentId,
        group: newParent.group,
        sort_order: newSortOrder,
      });
      setItems(prev => prev.map(i => i.id === subItemId ? { ...i, parent_item: newParentId, group: newParent.group, sort_order: newSortOrder } : i));
      toast({ title: 'Sub-item moved', duration: 2000 });
    } catch (error) {
      toast({ title: 'Failed to move sub-item', description: error.message, variant: 'destructive', duration: 5000 });
    }
  };

  // === Custom Group Handlers ===
  const handleCreateGroup = async (name, color) => {
    setGroupSaving(true);
    try {
      const newGroup = await base44.entities.BoardGroup.create({
        name,
        color,
        workspace: currentWorkspaceId,
        workboard: id,
        sort_order: groups.length,
        archived: false,
        created_by: user?.id,
      });
      setGroups(prev => [...prev, newGroup]);
      toast({ title: 'Group created', duration: 2000 });
      setShowAddGroup(false);
    } catch (error) {
      toast({ title: 'Failed to create group', description: error.message, variant: 'destructive', duration: 5000 });
    } finally {
      setGroupSaving(false);
    }
  };

  const handleDuplicateGroup = async (groupId) => {
    const original = groups.find(g => g.id === groupId);
    if (!original) return;
    try {
      const newGroup = await base44.entities.BoardGroup.create({
        name: `${original.name} (Copy)`,
        color: original.color,
        workspace: currentWorkspaceId,
        workboard: id,
        sort_order: groups.length,
        archived: false,
        created_by: user?.id,
      });
      setGroups(prev => [...prev, newGroup]);

      const groupItems = items.filter(i => i.group === groupId && !i.parent_item);
      for (const item of groupItems) {
        const newItem = await base44.entities.WorkboardItem.create({
          title: item.title,
          workspace: currentWorkspaceId,
          workboard: id,
          group: newGroup.id,
          item_type: item.item_type || 'main_item',
          owner: item.owner,
          status: item.status,
          status_color: item.status_color,
          priority: item.priority,
          priority_color: item.priority_color,
          progress_percentage: item.progress_percentage || 0,
          sort_order: item.sort_order || 0,
          tags: item.tags,
          created_by: user?.id,
          archived: false,
        });
        const subItems = items.filter(i => i.parent_item === item.id);
        for (const sub of subItems) {
          await base44.entities.WorkboardItem.create({
            title: sub.title,
            workspace: currentWorkspaceId,
            workboard: id,
            parent_item: newItem.id,
            group: newGroup.id,
            item_type: 'sub_item',
            owner: sub.owner,
            status: sub.status,
            status_color: sub.status_color,
            priority: sub.priority,
            priority_color: sub.priority_color,
            progress_percentage: sub.progress_percentage || 0,
            sort_order: sub.sort_order || 0,
            created_by: user?.id,
            archived: false,
          });
        }
      }
      toast({ title: 'Group duplicated', duration: 2000 });
      await load();
    } catch (error) {
      toast({ title: 'Failed to duplicate group', description: error.message, variant: 'destructive', duration: 5000 });
    }
  };

  // === @dnd-kit Handlers ===
  const handleReorderGroups = async (fromId, toId) => {
    const prevGroups = [...groups];
    const sorted = [...groups];
    const fromIndex = sorted.findIndex(g => g.id === fromId);
    const toIndex = sorted.findIndex(g => g.id === toId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;
    const [moved] = sorted.splice(fromIndex, 1);
    sorted.splice(toIndex, 0, moved);
    const reordered = sorted.map((g, i) => ({ ...g, sort_order: i }));
    setGroups(reordered);
    try {
      await Promise.all(reordered.map((g, i) => base44.entities.BoardGroup.update(g.id, { sort_order: i })));
    } catch (error) {
      setGroups(prevGroups);
      toast({ title: 'Failed to reorder groups', description: error.message, variant: 'destructive', duration: 5000 });
    }
  };

  const handleReorderItems = async (fromItemId, toItemId, groupId) => {
    const prevItems = [...items];
    const groupItems = items
      .filter(i => i.group === groupId && !i.parent_item)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const fromIndex = groupItems.findIndex(i => i.id === fromItemId);
    const toIndex = groupItems.findIndex(i => i.id === toItemId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;
    const [moved] = groupItems.splice(fromIndex, 1);
    groupItems.splice(toIndex, 0, moved);
    const reordered = groupItems.map((i, idx) => ({ ...i, sort_order: idx }));
    setItems(prev => prev.map(i => {
      const r = reordered.find(x => x.id === i.id);
      return r ? { ...i, sort_order: r.sort_order } : i;
    }));
    try {
      await Promise.all(reordered.map((i, idx) => base44.entities.WorkboardItem.update(i.id, { sort_order: idx })));
    } catch (error) {
      setItems(prevItems);
      toast({ title: 'Failed to persist item order', description: error.message, variant: 'destructive', duration: 5000 });
    }
  };

  const handleReorderSubItems = async (fromSubItemId, toSubItemId, parentId) => {
    const prevItems = [...items];
    const subItemsList = items
      .filter(i => i.parent_item === parentId)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const fromIndex = subItemsList.findIndex(i => i.id === fromSubItemId);
    const toIndex = subItemsList.findIndex(i => i.id === toSubItemId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;
    const [moved] = subItemsList.splice(fromIndex, 1);
    subItemsList.splice(toIndex, 0, moved);
    const reordered = subItemsList.map((i, idx) => ({ ...i, sort_order: idx }));
    setItems(prev => prev.map(i => {
      const r = reordered.find(x => x.id === i.id);
      return r ? { ...i, sort_order: r.sort_order } : i;
    }));
    try {
      await Promise.all(reordered.map((i, idx) => base44.entities.WorkboardItem.update(i.id, { sort_order: idx })));
    } catch (error) {
      setItems(prevItems);
      toast({ title: 'Failed to persist sub-item order', description: error.message, variant: 'destructive', duration: 5000 });
    }
  };

  const handleMoveItemToStatus = async (itemId, statusLabel, statusColor) => {
    const prevItem = items.find(i => i.id === itemId);
    try {
      await base44.entities.WorkboardItem.update(itemId, {
        status: statusLabel,
        status_color: statusColor,
      });
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, status: statusLabel, status_color: statusColor } : i));
    } catch (error) {
      toast({ title: 'Failed to update item', description: error.message, variant: 'destructive', duration: 5000 });
    }
  };

  const handleAssignToMe = async () => {
    setSaving(true);
    try {
      await assignBoardToMe(id, currentWorkspaceId, user);
      toast({ title: 'Board assigned to you', duration: 2000 });
      await load();
      window.dispatchEvent(new Event('workboards-changed'));
    } catch (error) {
      toast({ title: 'Failed to assign board', description: error.message, variant: 'destructive', duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveBoard = async () => {
    const ok = await confirm({
      title: 'Archive Board?',
      message: `Archive "${board.name}"? It will be hidden from active lists but can be restored later from the Archived Boards section.`,
      confirmLabel: 'Archive',
    });
    if (!ok) return;
    try {
      await base44.entities.Workboard.update(id, {
        status: 'archived',
        archived: true,
        archived_date: new Date().toISOString(),
        archived_by: user?.id,
      });
      toast({ title: 'Board archived', duration: 2000 });
      window.dispatchEvent(new Event('workboards-changed'));
      window.location.href = '/workboards';
    } catch (error) {
      toast({ title: 'Failed to archive board', description: error.message, variant: 'destructive', duration: 6000 });
    }
  };

  const handleVisibleColumnsChange = (newVis) => {
    setVisibleColumns(newVis);
    localStorage.setItem(`tuesday_wb_cols_${id}`, JSON.stringify(newVis));
  };

  // Log activity for item changes
  const logActivity = async (action, beforeValue, afterValue, recordId) => {
    if (!user) return;
    try {
      await base44.entities.Activity.create({
        workspace: currentWorkspaceId,
        workboard: id,
        record_type: 'WorkboardItem',
        record_id: recordId,
        user: user.id,
        user_name: user.full_name || user.email || 'User',
        action,
        before_value: beforeValue || '',
        after_value: afterValue || '',
        created_date: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to log activity:', err);
    }
  };

  // Log activity when status/priority/owner changes
  const handleItemUpdateWithLogging = async (itemId, updateData, fieldName, actionName) => {
    const oldItem = items.find(i => i.id === itemId);
    if (!oldItem) return;
    
    const beforeValue = oldItem[fieldName];
    const afterValue = updateData[fieldName];
    
    await base44.entities.WorkboardItem.update(itemId, updateData);
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, ...updateData } : i));
    
    if (beforeValue !== afterValue) {
      await logActivity(`${fieldName} changed`, beforeValue, afterValue, itemId);
    }
  };

  // Enrich items with sub-item counts for Kanban display
  const subItemCountMap = items.reduce((acc, item) => {
    if (item.parent_item) {
      acc[item.parent_item] = (acc[item.parent_item] || 0) + 1;
    }
    return acc;
  }, {});

  const isOrphaned = isOrphanedBoard(board, boardMembers, users);

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
  const canManageGroups = permissions.isSystemAdmin || permissions.isExecutive || permissions.workspacePermissions?.canManageBoards || workboardPerms.canManageGroups;

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: 'Workboards', path: '/workboards' }, { label: board.name }]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{board.name}</h1>
            {permissions.isSystemAdmin && isOrphaned && (
              <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Orphaned Board</Badge>
            )}
          </div>
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
          {canManageGroups && <Button variant="outline" onClick={() => setShowAddGroup(true)}><Plus className="w-4 h-4 mr-1.5" />Add Group</Button>}
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
                {permissions.isSystemAdmin && isOrphaned && (
                  <Button variant="outline" className="w-full justify-start" onClick={handleAssignToMe} disabled={saving}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Assign Owner to Me
                  </Button>
                )}
                <Button variant="outline" className="w-full justify-start" onClick={() => setShowDuplicate(true)}>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate Board
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={handleArchiveBoard}>
                  <Archive className="w-4 h-4 mr-2" />
                  Archive Board
                </Button>
                {permissions.isSystemAdmin && (
                  <Button variant="destructive" className="w-full justify-start" onClick={async () => {
                    const ok = await confirm({
                      title: 'Permanently Delete Board?',
                      message: `This will permanently delete "${board.name}" and ALL related data. This cannot be undone.`,
                      confirmLabel: 'Delete Permanently',
                      requireText: board.name,
                    });
                    if (!ok) return;
                    setSaving(true);
                    try {
                      await safeDeleteBoardData(id);
                      await base44.entities.Workboard.update(id, {
                        status: 'deleted',
                        deleted_date: new Date().toISOString(),
                        deleted_by: user?.id,
                      });
                      toast({ title: 'Board permanently deleted', duration: 2000 });
                      window.dispatchEvent(new Event('workboards-changed'));
                      window.location.href = '/workboards';
                    } catch (error) {
                      toast({ title: 'Failed to delete board', description: error.message, variant: 'destructive', duration: 5000 });
                    } finally {
                      setSaving(false);
                    }
                  }} disabled={saving}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Board Permanently
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
            <BoardListDnd
              groups={groups}
              onReorderGroups={handleReorderGroups}
              onMoveItemToGroup={handleMoveItemToGroup}
              onReorderItems={handleReorderItems}
              onMoveSubItem={handleMoveSubItem}
              onReorderSubItems={handleReorderSubItems}
            >
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
                  onMoveItemToGroup={handleMoveItemToGroup}
                  onItemReorder={handleItemReorder}
                  onMoveSubItem={handleMoveSubItem}
                  onDuplicateGroup={handleDuplicateGroup}
                  canManageGroups={canManageGroups}
                  allGroups={groups}
                  allItems={items}
                />
              ))}
              {canManageGroups && (
                <Button variant="outline" onClick={() => setShowAddGroup(true)} className="w-full justify-center border-dashed">
                  <Plus className="w-4 h-4 mr-1.5" /> Add Group
                </Button>
              )}
            </div>
            </BoardListDnd>
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
                          {visibleColumns?.owner !== false && (
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                                  {users.find(u => u.id === item.owner)?.full_name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <span className="text-sm">{users.find(u => u.id === item.owner)?.full_name || '—'}</span>
                              </div>
                            </TableCell>
                          )}
                          {visibleColumns?.status !== false && (
                            <TableCell><Badge variant="secondary" className="text-xs">{item.status || '—'}</Badge></TableCell>
                          )}
                          {visibleColumns?.priority !== false && (
                            <TableCell><Badge variant="secondary" className="text-xs">{item.priority || '—'}</Badge></TableCell>
                          )}
                          {visibleColumns?.due_date !== false && (
                            <TableCell className="text-sm">{item.due_date ? new Date(item.due_date).toLocaleDateString() : '—'}</TableCell>
                          )}
                          {visibleColumns?.progress_percentage !== false && (
                            <TableCell className="text-sm">{item.progress_percentage || 0}%</TableCell>
                          )}
                          {columns.filter(c => !c.hidden).map(column => (
                            <TableCell key={column.id}>
                              <CustomCellRenderer column={column} valueRecord={getValue(item.id, column.id)} users={users} teams={teams} />
                            </TableCell>
                          ))}
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
            onMoveItemToGroup={handleMoveItemToGroup}
            onMoveItemToStatus={handleMoveItemToStatus}
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
            setSelectedItemTab('overview');
          }}
          onUpdate={(updatedItem) => handleItemUpdateById(updatedItem.id, updatedItem)}
          onCommentCountChange={(itemId, countUpdater) => {
            setItems(prev => prev.map(i => {
              if (i.id !== itemId) return i;
              const newCount = typeof countUpdater === 'function' ? countUpdater(i._commentCount) : countUpdater;
              return { ...i, _commentCount: newCount };
            }));
          }}
          initialTab={selectedItemTab}
        />
      )}

      <DuplicateBoardDialog
        board={board}
        workspaceId={currentWorkspaceId}
        userId={user?.id}
        isOpen={showDuplicate}
        onClose={() => setShowDuplicate(false)}
        onSuccess={() => { window.dispatchEvent(new Event('workboards-changed')); }}
      />

      <AddGroupDialog
        open={showAddGroup}
        onOpenChange={setShowAddGroup}
        onCreate={handleCreateGroup}
        saving={groupSaving}
      />
    </div>
  );
}