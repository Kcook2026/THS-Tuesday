import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Columns, Plus, Trash2, Eye, EyeOff, Pencil, ArrowUp, ArrowDown, Settings } from 'lucide-react';
import { SYSTEM_COLUMNS, SYSTEM_COLUMN_NAMES, COLUMN_TYPE_OPTIONS, IMPLEMENTED_COLUMN_TYPES } from './WorkboardConstants';
import { parseSettings } from './CustomCellRenderer';

export default function ColumnManager({
  boardId,
  workspaceId,
  columns = [],
  onColumnsChange,
  visibleColumns = {},
  onVisibleColumnsChange,
}) {
  const { toast } = useToast();
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumn, setNewColumn] = useState({ name: '', column_type: 'text' });
  const [renamingColumn, setRenamingColumn] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingSettings, setEditingSettings] = useState(null);
  const [settingsText, setSettingsText] = useState('');

  const OPTIONS_TYPES = ['dropdown', 'multi_select', 'tags'];

  const handleEditSettings = (column) => {
    setEditingSettings(column);
    const settings = parseSettings(column);
    setSettingsText((settings.options || []).join('\n'));
  };

  const handleSaveSettings = async () => {
    if (!editingSettings) return;
    const options = settingsText.split('\n').map(s => s.trim()).filter(Boolean);
    const settings = { ...parseSettings(editingSettings), options };
    setSaving(true);
    try {
      await base44.entities.BoardColumn.update(editingSettings.id, { settings: JSON.stringify(settings) });
      onColumnsChange(columns.map(c => c.id === editingSettings.id ? { ...c, settings: JSON.stringify(settings) } : c));
      toast({ title: 'Column options saved', duration: 2000 });
      setEditingSettings(null);
    } catch (error) {
      toast({ title: 'Failed to save options', description: error.message, variant: 'destructive', duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  const toggleSystemColumn = (colId) => {
    const newVis = { ...visibleColumns, [colId]: !visibleColumns[colId] };
    onVisibleColumnsChange(newVis);
  };

  const handleAddColumn = async () => {
    if (!newColumn.name.trim() || saving) return;
    if (SYSTEM_COLUMN_NAMES.includes(newColumn.name.trim().toLowerCase())) {
      toast({ title: 'Reserved name', description: `"${newColumn.name.trim()}" is a system column and cannot be duplicated.`, variant: 'destructive', duration: 5000 });
      return;
    }
    setSaving(true);
    try {
      const column = await base44.entities.BoardColumn.create({
        workspace: workspaceId,
        workboard: boardId,
        name: newColumn.name.trim(),
        column_type: newColumn.column_type,
        width: 200,
        sort_order: columns.length,
      });
      toast({ title: 'Column added', duration: 2000 });
      onColumnsChange([...columns, column]);
      setShowAddColumn(false);
      setNewColumn({ name: '', column_type: 'text' });
    } catch (error) {
      toast({ title: 'Failed to add column', description: error.message, variant: 'destructive', duration: 5000 });
    } finally {
      setSaving(false);
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
      onColumnsChange(columns.map(c => c.id === column.id ? { ...c, hidden: !c.hidden } : c));
    } catch (error) {
      toast({ title: 'Failed to update column', description: error.message, variant: 'destructive', duration: 5000 });
    }
  };

  const handleRenameColumn = async (column) => {
    if (!renameValue.trim() || renameValue === column.name || saving) {
      setRenamingColumn(null);
      return;
    }
    setSaving(true);
    try {
      await base44.entities.BoardColumn.update(column.id, { name: renameValue.trim() });
      onColumnsChange(columns.map(c => c.id === column.id ? { ...c, name: renameValue.trim() } : c));
      toast({ title: 'Column renamed', duration: 2000 });
      setRenamingColumn(null);
    } catch (error) {
      toast({ title: 'Failed to rename', description: error.message, variant: 'destructive', duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  const handleReorder = async (column, direction) => {
    const sorted = [...columns].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const index = sorted.findIndex(c => c.id === column.id);
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= sorted.length) return;

    const swapped = sorted[newIndex];
    setSaving(true);
    try {
      await Promise.all([
        base44.entities.BoardColumn.update(column.id, { sort_order: swapped.sort_order }),
        base44.entities.BoardColumn.update(swapped.id, { sort_order: column.sort_order }),
      ]);
      const reordered = sorted.map(c => {
        if (c.id === column.id) return { ...c, sort_order: swapped.sort_order };
        if (c.id === swapped.id) return { ...c, sort_order: column.sort_order };
        return c;
      }).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      onColumnsChange(reordered);
    } catch (error) {
      toast({ title: 'Failed to reorder', description: error.message, variant: 'destructive', duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  const sortedColumns = [...columns].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  // Filter out any BoardColumn records that duplicate system column names
  const customColumns = sortedColumns.filter(c => !SYSTEM_COLUMN_NAMES.includes((c.name || '').toLowerCase()));
  const visibleCustomColumns = customColumns.filter(c => !c.hidden);
  const hiddenCustomColumns = customColumns.filter(c => c.hidden);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Columns className="w-4 h-4 mr-1.5" />
            Columns
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          {/* System Columns */}
          <div className="p-2">
            <div className="text-xs font-semibold text-muted-foreground mb-2 px-2">System Columns</div>
            {SYSTEM_COLUMNS.map(col => (
              <div key={col.id} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-accent">
                <span className="text-sm">{col.name}</span>
                {col.required ? (
                  <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); toggleSystemColumn(col.id); }}>
                    {visibleColumns[col.id] !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Custom Columns */}
          {sortedColumns.length > 0 && (
            <>
              <div className="h-px bg-muted my-1" />
              <div className="p-2">
                <div className="text-xs font-semibold text-muted-foreground mb-2 px-2">Custom Columns</div>
                {visibleCustomColumns.map((column, index) => (
                  <div key={column.id} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-accent">
                    {renamingColumn === column.id ? (
                      <>
                        <Input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleRenameColumn(column); if (e.key === 'Escape') setRenamingColumn(null); }}
                          onBlur={() => handleRenameColumn(column)}
                          className="h-6 text-sm"
                          autoFocus
                        />
                      </>
                    ) : (
                      <>
                        <span className="text-sm">{column.name}</span>
                        <div className="flex items-center gap-0.5">
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); handleReorder(column, -1); }} disabled={index === 0 || saving}>
                            <ArrowUp className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); handleReorder(column, 1); }} disabled={index === visibleCustomColumns.length - 1 || saving}>
                            <ArrowDown className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); setRenamingColumn(column); setRenameValue(column.name); }}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          {OPTIONS_TYPES.includes(column.column_type) && (
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); handleEditSettings(column); }} title="Edit options">
                              <Settings className="w-3 h-3" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); handleToggleHidden(column); }}>
                            <EyeOff className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); handleDeleteColumn(column); }}>
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {hiddenCustomColumns.map(column => (
                  <div key={column.id} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-accent opacity-60">
                    <span className="text-sm">{column.name}</span>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); handleToggleHidden(column); }}>
                      <Eye className="w-3 h-3" />
                    </Button>
                  </div>
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
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddColumn(); }}
              />
            </div>
            <div>
              <Label>Column Type</Label>
              <Select value={newColumn.column_type} onValueChange={v => setNewColumn({ ...newColumn, column_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {COLUMN_TYPE_OPTIONS.map(group => (
                    <div key={group.group}>
                      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {group.group}
                      </div>
                      {group.types.map(t => (
                        <SelectItem
                          key={t.value}
                          value={t.value}
                          disabled={!IMPLEMENTED_COLUMN_TYPES.includes(t.value)}
                        >
                          {t.label}
                          {t.comingSoon && <span className="ml-1 text-[10px] text-muted-foreground">(Coming Soon)</span>}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddColumn(false)}>Cancel</Button>
              <Button onClick={handleAddColumn} disabled={!newColumn.name.trim() || saving}>{saving ? 'Adding...' : 'Add Column'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Column Settings Dialog (for dropdown/multi_select/tags options) */}
      <Dialog open={!!editingSettings} onOpenChange={(open) => { if (!open) setEditingSettings(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configure "{editingSettings?.name}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Options (one per line)</Label>
            <Textarea
              value={settingsText}
              onChange={(e) => setSettingsText(e.target.value)}
              placeholder={'Option 1\nOption 2\nOption 3'}
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">Enter each option on a new line.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingSettings(null)}>Cancel</Button>
              <Button onClick={handleSaveSettings} disabled={saving}>{saving ? 'Saving...' : 'Save Options'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}