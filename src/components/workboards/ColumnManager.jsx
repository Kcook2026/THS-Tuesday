import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { Columns, Plus, Pencil, Trash2, Eye, EyeOff, Settings } from 'lucide-react';

const COLUMN_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'long_text', label: 'Long Text' },
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency' },
  { value: 'date', label: 'Date' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'tags', label: 'Tags' },
  { value: 'person', label: 'Person' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'link', label: 'Link' },
  { value: 'files', label: 'Files' },
];

const SYSTEM_COLUMNS = ['Item', 'Owner', 'Status', 'Priority', 'Due Date', 'Progress'];

export default function ColumnManager({ boardId, workspaceId, columns = [], onColumnsChange, statusOptions = [], priorityOptions = [] }) {
  const { toast } = useToast();
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumn, setNewColumn] = useState({ name: '', column_type: 'text', width: 200 });
  const [editingColumn, setEditingColumn] = useState(null);

  const handleAddColumn = async () => {
    if (!newColumn.name.trim()) {
      toast({ title: 'Column name required', variant: 'destructive', duration: 3000 });
      return;
    }
    try {
      const column = await base44.entities.BoardColumn.create({
        workspace: workspaceId,
        workboard: boardId,
        name: newColumn.name,
        column_type: newColumn.column_type,
        width: newColumn.width,
        sort_order: columns.length,
      });
      toast({ title: 'Column added', duration: 2000 });
      onColumnsChange([...columns, column]);
      setShowAddColumn(false);
      setNewColumn({ name: '', column_type: 'text', width: 200 });
    } catch (error) {
      toast({ title: 'Failed to add column', description: error.message, variant: 'destructive', duration: 5000 });
    }
  };

  const handleDeleteColumn = async (column) => {
    if (!confirm(`Delete column "${column.name}"?`)) return;
    try {
      await base44.entities.BoardColumn.delete(column.id);
      toast({ title: 'Column deleted', duration: 2000 });
      onColumnsChange(columns.filter(c => c.id !== column.id));
    } catch (error) {
      toast({ title: 'Failed to delete column', description: error.message, variant: 'destructive', duration: 5000 });
    }
  };

  const handleToggleHidden = async (column) => {
    try {
      await base44.entities.BoardColumn.update(column.id, { hidden: !column.hidden });
      toast({ title: 'Column updated', duration: 2000 });
      onColumnsChange(columns.map(c => c.id === column.id ? { ...c, hidden: !c.hidden } : c));
    } catch (error) {
      toast({ title: 'Failed to update column', description: error.message, variant: 'destructive', duration: 5000 });
    }
  };

  const handleRenameColumn = async (column, newName) => {
    if (!newName.trim()) return;
    try {
      await base44.entities.BoardColumn.update(column.id, { name: newName });
      toast({ title: 'Column renamed', duration: 2000 });
      setEditingColumn(null);
      onColumnsChange(columns.map(c => c.id === column.id ? { ...c, name: newName } : c));
    } catch (error) {
      toast({ title: 'Failed to rename column', description: error.message, variant: 'destructive', duration: 5000 });
    }
  };

  const visibleColumns = columns.filter(c => !c.hidden);
  const hiddenColumns = columns.filter(c => c.hidden);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Columns className="w-4 h-4 mr-1.5" />
            Columns ({visibleColumns.length})
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <div className="p-2">
            <div className="text-xs font-semibold text-muted-foreground mb-2 px-2">Visible Columns</div>
            {visibleColumns.length === 0 ? (
              <div className="text-xs text-muted-foreground px-2 py-2">No custom columns</div>
            ) : (
              visibleColumns.map(column => (
                <DropdownMenuItem key={column.id} className="flex items-center justify-between px-2 py-1.5">
                  <span className="text-sm">{column.name}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleToggleHidden(column); }}>
                      <EyeOff className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleDeleteColumn(column); }}>
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </div>
          {hiddenColumns.length > 0 && (
            <>
              <div className="h-px bg-muted my-1" />
              <div className="p-2">
                <div className="text-xs font-semibold text-muted-foreground mb-2 px-2">Hidden Columns ({hiddenColumns.length})</div>
                {hiddenColumns.slice(0, 3).map(column => (
                  <DropdownMenuItem key={column.id} className="flex items-center justify-between px-2 py-1.5 opacity-60">
                    <span className="text-sm">{column.name}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleToggleHidden(column); }}>
                      <Eye className="w-3 h-3" />
                    </Button>
                  </DropdownMenuItem>
                ))}
              </div>
            </>
          )}
          <div className="h-px bg-muted my-1" />
          <DropdownMenuItem onClick={() => setShowAddColumn(true)} className="text-primary">
            <Plus className="w-3.5 h-3.5 mr-2" />
            Add Custom Column
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showAddColumn} onOpenChange={setShowAddColumn}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Custom Column</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Column Name</Label>
              <Input
                value={newColumn.name}
                onChange={e => setNewColumn({ ...newColumn, name: e.target.value })}
                placeholder="Enter column name"
                autoFocus
              />
            </div>
            <div>
              <Label>Column Type</Label>
              <select
                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
                value={newColumn.column_type}
                onChange={e => setNewColumn({ ...newColumn, column_type: e.target.value })}
              >
                {COLUMN_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Width (pixels)</Label>
              <Input
                type="number"
                value={newColumn.width}
                onChange={e => setNewColumn({ ...newColumn, width: parseInt(e.target.value) || 200 })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddColumn(false)}>Cancel</Button>
              <Button onClick={handleAddColumn}>Add Column</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}