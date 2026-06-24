import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Settings2, Plus, EyeOff, MoveUp, MoveDown, Trash2, Edit2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { useWorkspace } from '@/lib/WorkspaceContext';

const COLUMN_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'long_text', label: 'Long Text' },
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency' },
  { value: 'date', label: 'Date' },
  { value: 'progress', label: 'Progress' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'person', label: 'Person' },
  { value: 'team', label: 'Team' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'link', label: 'Link' },
  { value: 'tags', label: 'Tags' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'files', label: 'Files' },
  { value: 'formula', label: 'Formula (Coming Soon)' },
  { value: 'created_by', label: 'Created By' },
  { value: 'created_date', label: 'Created Date' },
];

const SYSTEM_COLUMNS = ['Item Name', 'Owner', 'Status', 'Priority', 'Timeline', 'Due Date', 'Progress'];

export default function ColumnManager({ boardId, workspaceId, columns, onColumnsChange, userRole }) {
  const { toast } = useToast();
  const { user } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState(null);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnType, setNewColumnType] = useState('text');

  const canManageColumns = ['system_admin', 'executive', 'workspace_owner', 'workspace_manager', 'workboard_owner'].includes(userRole);

  const handleAddColumn = async () => {
    if (!newColumnName.trim()) {
      toast({ title: 'Column name required', variant: 'destructive', duration: 4000 });
      return;
    }
    try {
      const newColumn = {
        workspace: workspaceId,
        workboard: boardId,
        name: newColumnName,
        column_type: newColumnType,
        sort_order: columns.length,
        width: 200,
        hidden: false,
        required: false,
        settings: JSON.stringify({}),
        created_by: user.id,
      };
      const created = await base44.entities.BoardColumn.create(newColumn);
      onColumnsChange([...columns, created]);
      toast({ title: 'Column added', duration: 2000 });
      setDialogOpen(false);
      setNewColumnName('');
      setNewColumnType('text');
    } catch (error) {
      toast({ title: 'Error adding column', description: error.message, variant: 'destructive', duration: 5000 });
    }
  };

  const handleUpdateColumn = async () => {
    if (!newColumnName.trim()) {
      toast({ title: 'Column name required', variant: 'destructive', duration: 4000 });
      return;
    }
    try {
      await base44.entities.BoardColumn.update(editingColumn.id, { name: newColumnName, column_type: newColumnType });
      onColumnsChange(columns.map(c => c.id === editingColumn.id ? { ...c, name: newColumnName, column_type: newColumnType } : c));
      toast({ title: 'Column updated', duration: 2000 });
      setDialogOpen(false);
      setEditingColumn(null);
      setNewColumnName('');
      setNewColumnType('text');
    } catch (error) {
      toast({ title: 'Error updating column', description: error.message, variant: 'destructive', duration: 5000 });
    }
  };

  const handleDeleteColumn = async (column) => {
    if (SYSTEM_COLUMNS.includes(column.name)) {
      toast({ title: 'Cannot delete system column', variant: 'destructive', duration: 4000 });
      return;
    }
    try {
      await base44.entities.BoardColumn.delete(column.id);
      onColumnsChange(columns.filter(c => c.id !== column.id));
      toast({ title: 'Column deleted', duration: 2000 });
    } catch (error) {
      toast({ title: 'Error deleting column', description: error.message, variant: 'destructive', duration: 5000 });
    }
  };

  const handleToggleHidden = async (column) => {
    try {
      await base44.entities.BoardColumn.update(column.id, { hidden: !column.hidden });
      onColumnsChange(columns.map(c => c.id === column.id ? { ...c, hidden: !c.hidden } : c));
      toast({ title: column.hidden ? 'Column shown' : 'Column hidden', duration: 2000 });
    } catch (error) {
      toast({ title: 'Error updating column', description: error.message, variant: 'destructive', duration: 5000 });
    }
  };

  const handleMoveColumn = async (index, direction) => {
    const visibleColumns = columns.filter(c => !c.hidden);
    const newColumns = [...visibleColumns];
    const temp = newColumns[index];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newColumns.length) return;
    newColumns[index] = newColumns[newIndex];
    newColumns[newIndex] = temp;
    newColumns.forEach((col, idx) => { col.sort_order = idx; });
    onColumnsChange(newColumns);
    try {
      await Promise.all(newColumns.map(col => base44.entities.BoardColumn.update(col.id, { sort_order: col.sort_order })));
      toast({ title: 'Columns reordered', duration: 2000 });
    } catch (error) {
      toast({ title: 'Error reordering', description: error.message, variant: 'destructive', duration: 5000 });
    }
  };

  const openEditDialog = (column) => {
    setEditingColumn(column);
    setNewColumnName(column.name);
    setNewColumnType(column.column_type);
    setDialogOpen(true);
  };

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Settings2 className="w-4 h-4 mr-1.5" />
            Columns
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72 max-h-[400px] overflow-y-auto">
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Visible Columns</div>
          {columns.filter(c => !c.hidden).map((col, index) => (
            <DropdownMenuItem key={col.id} className="flex items-center justify-between group">
              <span className="text-sm truncate flex-1">{col.name}</span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleMoveColumn(index, -1); }} disabled={index === 0}>
                  <MoveUp className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleMoveColumn(index, 1); }} disabled={index === columns.filter(c => !c.hidden).length - 1}>
                  <MoveDown className="w-3 h-3" />
                </Button>
                {canManageColumns && (
                  <>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); openEditDialog(col); }}>
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    {!SYSTEM_COLUMNS.includes(col.name) && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteColumn(col); }}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </>
                )}
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleToggleHidden(col); }}>
                  <EyeOff className="w-3 h-3" />
                </Button>
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          {canManageColumns && (
            <DropdownMenuItem onClick={() => { setEditingColumn(null); setNewColumnName(''); setNewColumnType('text'); setDialogOpen(true); }}>
              <Plus className="w-3 h-3 mr-2" />
              Add Column
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingColumn ? 'Edit Column' : 'Add Column'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="column-name">Column Name</Label>
              <Input id="column-name" value={newColumnName} onChange={(e) => setNewColumnName(e.target.value)} placeholder="Enter column name" />
            </div>
            <div>
              <Label htmlFor="column-type">Column Type</Label>
              <Select value={newColumnType} onValueChange={setNewColumnType}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {COLUMN_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={editingColumn ? handleUpdateColumn : handleAddColumn}>{editingColumn ? 'Update' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}