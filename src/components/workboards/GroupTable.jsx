import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { useConfirm } from '@/components/shared/ConfirmDialog';
import {
  Plus, MoreHorizontal, ChevronRight, ChevronDown, Trash2,
  Pencil, ExternalLink, Archive, ArrowUp, ArrowDown, Palette,
  CornerDownRight,
} from 'lucide-react';
import { STATUS_COLORS, PRIORITY_COLORS, GROUP_COLOR_CLASSES } from './WorkboardConstants';
import { getUserInitials } from '@/lib/userHelpers';
import CustomCellRenderer from './CustomCellRenderer';
import CustomCellEditor from './CustomCellEditor';

const SYSTEM_FIELDS = ['title', 'owner', 'status', 'priority', 'progress_percentage', 'due_date', 'assignee', 'description', 'start_date', 'tags'];

export default function GroupTable({
  group, groupIndex, totalGroups, items,
  statusOptions, priorityOptions, users, teams,
  visibleColumns, columns = [], getValue, saveValue,
  canEdit, canCreate, canDelete,
  onItemClick, onItemUpdate, onDeleteItem, onAddItem,
  onRenameGroup, onArchiveGroup, onDeleteGroup,
  onGroupColorChange, onGroupReorder,
}) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [collapsed, setCollapsed] = useState(group.collapsed || false);
  const [editingCell, setEditingCell] = useState(null);
  const [expandedItems, setExpandedItems] = useState({});
  const [renaming, setRenaming] = useState(false);
  const [groupName, setGroupName] = useState(group.name);
  const [saving, setSaving] = useState(false);
  const [addingSubItem, setAddingSubItem] = useState(null);
  const [subItemTitle, setSubItemTitle] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);

  const COLOR_OPTIONS = ['gray', 'blue', 'green', 'red', 'yellow', 'orange', 'purple'];

  const mainItems = items.filter(i => !i.parent_item);
  const subItemsByParent = items.reduce((acc, i) => {
    if (i.parent_item) {
      if (!acc[i.parent_item]) acc[i.parent_item] = [];
      acc[i.parent_item].push(i);
    }
    return acc;
  }, {});

  const colorClass = GROUP_COLOR_CLASSES[group.color] || 'bg-gray-500';
  const visibleCustomColumns = (columns || []).filter(c => !c.hidden).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const getUserDisplay = (userId) => {
    if (!userId) return 'Unassigned';
    const u = users.find(u => u.id === userId);
    return u?.full_name || u?.email || 'Unassigned';
  };

  const handleInlineEdit = async (itemId, field, value) => {
    if (!SYSTEM_FIELDS.includes(field)) return;
    setSaving(true);
    try {
      let updateData = {};
      if (field === 'owner') {
        updateData.owner = value === 'unassigned' ? null : value;
      } else if (field === 'status') {
        const status = statusOptions.find(s => s.label === value);
        updateData.status = value;
        if (status) updateData.status_color = status.color;
      } else if (field === 'priority') {
        const priority = priorityOptions.find(p => p.label === value);
        updateData.priority = value;
        if (priority) updateData.priority_color = priority.color;
      } else if (field === 'progress_percentage') {
        updateData.progress_percentage = parseInt(value) || 0;
      } else if (field === 'due_date') {
        updateData.due_date = value || null;
      } else {
        updateData = { [field]: value };
      }

      await base44.entities.WorkboardItem.update(itemId, updateData);
      onItemUpdate?.(itemId, updateData);
      toast({ title: 'Updated', duration: 2000 });
    } catch (error) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive', duration: 5000 });
    } finally {
      setSaving(false);
      setEditingCell(null);
    }
  };

  const handleCustomCellEdit = (itemId, column) => {
    return async (value) => {
      if (!saveValue) return;
      try {
        const columnType = column.column_type;
        let displayValue = value;
        if (columnType === 'person') {
          const u = users.find(u => u.id === value);
          displayValue = u?.full_name || u?.email || '';
        } else if (columnType === 'multi_select' || columnType === 'tags') {
          try { displayValue = JSON.parse(value).join(', '); } catch { displayValue = value; }
        }
        await saveValue(itemId, column.id, value, columnType, displayValue);
        toast({ title: 'Updated', duration: 2000 });
      } catch (error) {
        toast({ title: 'Update failed', description: error.message, variant: 'destructive', duration: 5000 });
      } finally {
        setEditingCell(null);
      }
    };
  };

  const handleAddSubItem = async (parentId) => {
    if (!subItemTitle.trim() || saving) return;
    setSaving(true);
    try {
      const parent = items.find(i => i.id === parentId);
      if (!parent) return;

      const savedSub = await base44.entities.WorkboardItem.create({
        title: subItemTitle.trim(),
        workspace: parent.workspace,
        workboard: parent.workboard,
        parent_item: parentId,
        group: parent.group,
        item_type: 'sub_item',
        status: 'Not Started',
        status_color: 'gray',
        priority: 'Medium',
        priority_color: 'yellow',
        progress_percentage: 0,
        created_by: parent.created_by,
        archived: false,
      });

      onItemUpdate?.(savedSub.id, savedSub);
      toast({ title: 'Sub-item added', duration: 2000 });
      setSubItemTitle('');
      setAddingSubItem(null);
      setExpandedItems(prev => ({ ...prev, [parentId]: true }));
    } catch (error) {
      toast({ title: 'Failed to add sub-item', description: error.message, variant: 'destructive', duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  const handleRenameGroup = async () => {
    if (!groupName.trim() || groupName === group.name) {
      setRenaming(false);
      setGroupName(group.name);
      return;
    }
    setSaving(true);
    try {
      await base44.entities.BoardGroup.update(group.id, { name: groupName.trim() });
      onRenameGroup?.(group.id, groupName.trim());
      toast({ title: 'Group renamed', duration: 2000 });
      setRenaming(false);
    } catch (error) {
      toast({ title: 'Failed to rename group', description: error.message, variant: 'destructive', duration: 5000 });
      setGroupName(group.name);
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveGroup = async () => {
    const ok = await confirm({
      title: 'Archive Group?',
      message: `Are you sure you want to archive "${group.name}" and all its items?`,
      confirmLabel: 'Archive',
      variant: 'default',
    });
    if (!ok) return;
    setSaving(true);
    try {
      await base44.entities.BoardGroup.update(group.id, { archived: true });
      for (const item of mainItems) {
        await base44.entities.WorkboardItem.update(item.id, { archived: true });
      }
      onArchiveGroup?.(group.id);
      toast({ title: 'Group archived', duration: 2000 });
    } catch (error) {
      toast({ title: 'Failed to archive group', description: error.message, variant: 'destructive', duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async () => {
    const ok = await confirm({
      title: 'Delete Group?',
      message: `Are you sure you want to permanently delete "${group.name}" and all its items? This action cannot be undone.`,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    setSaving(true);
    try {
      for (const item of items) {
        await base44.entities.WorkboardItem.delete(item.id);
      }
      await base44.entities.BoardGroup.delete(group.id);
      onDeleteGroup?.(group.id);
      toast({ title: 'Group deleted', duration: 2000 });
    } catch (error) {
      toast({ title: 'Failed to delete group', description: error.message, variant: 'destructive', duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  const handleColorChange = async (newColor) => {
    setSaving(true);
    try {
      await base44.entities.BoardGroup.update(group.id, { color: newColor });
      onGroupColorChange?.(group.id, newColor);
      setShowColorPicker(false);
    } catch (error) {
      toast({ title: 'Failed to change color', description: error.message, variant: 'destructive', duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCollapse = async () => {
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    try {
      await base44.entities.BoardGroup.update(group.id, { collapsed: newCollapsed });
    } catch {}
  };

  const toggleExpand = (itemId) => {
    setExpandedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const renderSystemCell = (item, field) => {
    if (field === 'status') {
      const colorClass = STATUS_COLORS[item.status_color] || STATUS_COLORS.gray;
      return <Badge variant="secondary" className={colorClass}>{item.status || 'Not Started'}</Badge>;
    }
    if (field === 'priority') {
      const colorClass = PRIORITY_COLORS[item.priority_color] || PRIORITY_COLORS.gray;
      return <Badge variant="secondary" className={colorClass}>{item.priority || 'Medium'}</Badge>;
    }
    if (field === 'owner') {
      return (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
            {getUserInitials(users.find(u => u.id === item.owner))}
          </div>
          <span className="text-sm">{getUserDisplay(item.owner)}</span>
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

  const renderInlineEdit = (item, field) => {
    const isEditing = editingCell?.itemId === item.id && editingCell?.field === field;

    if (isEditing) {
      if (field === 'status') {
        return (
          <Select value={item.status || ''} onValueChange={(value) => handleInlineEdit(item.id, 'status', value)} onOpenChange={(open) => { if (!open) setEditingCell(null); }}>
            <SelectTrigger className="h-7 w-auto"><SelectValue /></SelectTrigger>
            <SelectContent>{statusOptions.map(s => <SelectItem key={s.id} value={s.label}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        );
      }
      if (field === 'priority') {
        return (
          <Select value={item.priority || ''} onValueChange={(value) => handleInlineEdit(item.id, 'priority', value)} onOpenChange={(open) => { if (!open) setEditingCell(null); }}>
            <SelectTrigger className="h-7 w-auto"><SelectValue /></SelectTrigger>
            <SelectContent>{priorityOptions.map(p => <SelectItem key={p.id} value={p.label}>{p.label}</SelectItem>)}</SelectContent>
          </Select>
        );
      }
      if (field === 'owner') {
        return (
          <Select value={item.owner || 'unassigned'} onValueChange={(value) => handleInlineEdit(item.id, 'owner', value)} onOpenChange={(open) => { if (!open) setEditingCell(null); }}>
            <SelectTrigger className="h-7 w-auto"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email || 'Unassigned'}</SelectItem>)}
            </SelectContent>
          </Select>
        );
      }
      if (field === 'due_date') {
        return <Input type="date" defaultValue={item.due_date ? item.due_date.split('T')[0] : ''} onBlur={(e) => handleInlineEdit(item.id, 'due_date', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleInlineEdit(item.id, 'due_date', e.target.value); if (e.key === 'Escape') setEditingCell(null); }} className="h-7 w-auto" autoFocus />;
      }
      if (field === 'progress_percentage') {
        return <Input type="number" min="0" max="100" defaultValue={item.progress_percentage || 0} onBlur={(e) => handleInlineEdit(item.id, 'progress_percentage', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleInlineEdit(item.id, 'progress_percentage', e.target.value); if (e.key === 'Escape') setEditingCell(null); }} className="h-7 w-16" autoFocus />;
      }
      if (field === 'title') {
        return <Input defaultValue={item.title} onBlur={(e) => { if (e.target.value !== item.title) handleInlineEdit(item.id, 'title', e.target.value); else setEditingCell(null); }} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditingCell(null); }} className="h-7" autoFocus />;
      }
    }

    return (
      <div className="cursor-pointer hover:bg-accent rounded px-2 py-1 -mx-2 min-h-[28px] flex items-center" onClick={() => setEditingCell({ itemId: item.id, field })}>
        {renderSystemCell(item, field)}
      </div>
    );
  };

  const renderCustomCell = (item, column) => {
    const isEditing = editingCell?.itemId === item.id && editingCell?.field === `custom_${column.id}`;
    const valueRecord = getValue?.(item.id, column.id);

    if (isEditing && canEdit) {
      return (
        <CustomCellEditor
          column={column}
          valueRecord={valueRecord}
          users={users}
          teams={teams}
          onSave={handleCustomCellEdit(item.id, column)}
          onCancel={() => setEditingCell(null)}
          canEdit={canEdit}
        />
      );
    }

    return (
      <div
        className="cursor-pointer hover:bg-accent rounded px-2 py-1 -mx-2 min-h-[28px] flex items-center"
        onClick={() => canEdit && setEditingCell({ itemId: item.id, field: `custom_${column.id}` })}
      >
        <CustomCellRenderer column={column} valueRecord={valueRecord} users={users} teams={teams} />
      </div>
    );
  };

  const renderItemRow = (item, isSubItem = false) => {
    const subItems = subItemsByParent[item.id] || [];
    const isExpanded = expandedItems[item.id];

    return (
      <React.Fragment key={item.id}>
        <TableRow className={`hover:bg-accent/50 ${isSubItem ? 'bg-muted/30' : ''}`}>
          <TableCell className="w-8">
            {subItems.length > 0 ? (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleExpand(item.id)}>
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Button>
            ) : (
              <span className={`w-1.5 h-1.5 rounded-full ${isSubItem ? 'bg-blue-400' : 'bg-primary/50'} block mx-auto`} />
            )}
          </TableCell>
          <TableCell className={`font-medium ${isSubItem ? 'pl-8' : ''}`}>
            {isSubItem && <CornerDownRight className="w-3 h-3 inline-block mr-1 text-muted-foreground" />}
            {canEdit ? renderInlineEdit(item, 'title') : item.title}
          </TableCell>
          {visibleColumns?.owner !== false && (
            <TableCell onClick={(e) => e.stopPropagation()}>
              {canEdit ? renderInlineEdit(item, 'owner') : renderSystemCell(item, 'owner')}
            </TableCell>
          )}
          {visibleColumns?.status !== false && (
            <TableCell onClick={(e) => e.stopPropagation()}>
              {canEdit ? renderInlineEdit(item, 'status') : renderSystemCell(item, 'status')}
            </TableCell>
          )}
          {visibleColumns?.priority !== false && (
            <TableCell onClick={(e) => e.stopPropagation()}>
              {canEdit ? renderInlineEdit(item, 'priority') : renderSystemCell(item, 'priority')}
            </TableCell>
          )}
          {visibleColumns?.due_date !== false && (
            <TableCell onClick={(e) => e.stopPropagation()}>
              {canEdit ? renderInlineEdit(item, 'due_date') : renderSystemCell(item, 'due_date')}
            </TableCell>
          )}
          {visibleColumns?.progress_percentage !== false && (
            <TableCell onClick={(e) => e.stopPropagation()}>
              {canEdit ? renderInlineEdit(item, 'progress_percentage') : renderSystemCell(item, 'progress_percentage')}
            </TableCell>
          )}
          {/* Custom columns */}
          {visibleCustomColumns.map(column => (
            <TableCell key={column.id} onClick={(e) => e.stopPropagation()} style={{ minWidth: column.width || 200 }}>
              {renderCustomCell(item, column)}
            </TableCell>
          ))}
          <TableCell onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onItemClick?.(item)} title="Open details">
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
              {canCreate && !isSubItem && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setAddingSubItem(item.id); setSubItemTitle(''); setExpandedItems(prev => ({ ...prev, [item.id]: true })); }} title="Add sub-item">
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              )}
              {canDelete && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDeleteItem?.(item)} title="Delete">
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              )}
            </div>
          </TableCell>
        </TableRow>

        {/* Sub-item count badge row */}
        {subItems.length > 0 && !isExpanded && (
          <TableRow className="bg-muted/20">
            <TableCell></TableCell>
            <TableCell className="pl-8 text-xs text-muted-foreground" colSpan={1}>
              <Badge variant="secondary" className="text-[10px]">{subItems.length} sub-item{subItems.length > 1 ? 's' : ''}</Badge>
            </TableCell>
            <TableCell colSpan={visibleCustomColumns.length + 7}></TableCell>
          </TableRow>
        )}

        {/* Add sub-item row */}
        {addingSubItem === item.id && (
          <TableRow className="bg-muted/30">
            <TableCell></TableCell>
            <TableCell className="pl-8">
              <CornerDownRight className="w-3 h-3 inline-block mr-1 text-muted-foreground" />
              <Input
                value={subItemTitle}
                onChange={(e) => setSubItemTitle(e.target.value)}
                placeholder="New sub-item title..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddSubItem(item.id);
                  if (e.key === 'Escape') { setAddingSubItem(null); setSubItemTitle(''); }
                }}
                onBlur={() => { if (!subItemTitle.trim()) { setAddingSubItem(null); setSubItemTitle(''); } }}
                className="h-7 inline-block w-64"
                autoFocus
              />
            </TableCell>
            <TableCell colSpan={visibleCustomColumns.length + 7}></TableCell>
          </TableRow>
        )}

        {isExpanded && subItems.map(sub => renderItemRow(sub, true))}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-2">
      {/* Group Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleToggleCollapse} disabled={saving}>
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
        <div className={`w-3 h-3 rounded-full ${colorClass}`} />
        {renaming ? (
          <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleRenameGroup(); if (e.key === 'Escape') { setRenaming(false); setGroupName(group.name); } }} onBlur={handleRenameGroup} className="h-7 w-48" autoFocus />
        ) : (
          <h3 className="font-semibold text-sm cursor-pointer" onClick={() => canEdit && setRenaming(true)}>{group.name}</h3>
        )}
        <Badge variant="secondary" className="text-xs">{mainItems.length}</Badge>
        <div className="flex-1" />
        {canCreate && !collapsed && (
          <Button variant="ghost" size="sm" className="h-7" onClick={() => onAddItem?.(group.id)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
          </Button>
        )}
        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6"><MoreHorizontal className="w-4 h-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setRenaming(true)}><Pencil className="w-3.5 h-3.5 mr-2" /> Rename</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowColorPicker(!showColorPicker)}><Palette className="w-3.5 h-3.5 mr-2" /> Change Color</DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggleCollapse}>
                {collapsed ? <ChevronDown className="w-3.5 h-3.5 mr-2" /> : <ChevronRight className="w-3.5 h-3.5 mr-2" />}
                {collapsed ? 'Expand' : 'Collapse'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onGroupReorder?.(group.id, -1)} disabled={groupIndex === 0 || saving}><ArrowUp className="w-3.5 h-3.5 mr-2" /> Move Up</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onGroupReorder?.(group.id, 1)} disabled={groupIndex === totalGroups - 1 || saving}><ArrowDown className="w-3.5 h-3.5 mr-2" /> Move Down</DropdownMenuItem>
              <DropdownMenuItem onClick={handleArchiveGroup} className="text-destructive"><Archive className="w-3.5 h-3.5 mr-2" /> Archive</DropdownMenuItem>
              <DropdownMenuItem onClick={handleDeleteGroup} className="text-destructive"><Trash2 className="w-3.5 h-3.5 mr-2" /> Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Color Picker */}
      {showColorPicker && (
        <div className="flex items-center gap-2 pl-8 py-1">
          {COLOR_OPTIONS.map(c => (
            <button key={c} className={`w-5 h-5 rounded-full ${GROUP_COLOR_CLASSES[c]} ${group.color === c ? 'ring-2 ring-offset-2 ring-primary' : ''}`} onClick={() => handleColorChange(c)} />
          ))}
        </div>
      )}

      {!collapsed && (
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
                  {visibleColumns?.progress_percentage !== false && <TableHead className="min-w-[120px]">Progress</TableHead>}
                  {visibleCustomColumns.map(column => (
                    <TableHead key={column.id} style={{ minWidth: column.width || 200 }}>{column.name}</TableHead>
                  ))}
                  <TableHead className="w-28"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mainItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={visibleCustomColumns.length + 8} className="py-8 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-sm">This group is empty</p>
                        {canCreate && <Button size="sm" variant="outline" onClick={() => onAddItem?.(group.id)}><Plus className="w-4 h-4 mr-1.5" /> Add Item</Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  mainItems.map(item => renderItemRow(item))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}