import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import {
  Plus, ArrowUp, ArrowDown, Trash2, Pencil, Star, Tag, Flag, X,
} from 'lucide-react';
import { STATUS_COLORS, PRIORITY_COLORS, GROUP_COLOR_CLASSES } from './WorkboardConstants';

const COLOR_OPTIONS = ['gray', 'blue', 'green', 'red', 'yellow', 'orange', 'purple'];

export default function StatusPriorityManager({
  boardId,
  workspaceId,
  statusOptions,
  priorityOptions,
  onStatusOptionsChange,
  onPriorityOptionsChange,
  trigger,
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('status');
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState('gray');
  const [editing, setEditing] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [editColor, setEditColor] = useState('gray');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!newLabel.trim() || saving) return;
    setSaving(true);
    try {
      const entity = activeTab === 'status' ? base44.entities.StatusOption : base44.entities.PriorityOption;
      const maxSort = (activeTab === 'status' ? statusOptions : priorityOptions).reduce((max, o) => Math.max(max, o.sort_order || 0), 0);
      const created = await entity.create({
        label: newLabel.trim(),
        workspace: workspaceId,
        workboard: boardId,
        color: newColor,
        sort_order: maxSort + 1,
        is_default: false,
      });
      if (activeTab === 'status') {
        onStatusOptionsChange([...statusOptions, created].sort((a, b) => a.sort_order - b.sort_order));
      } else {
        onPriorityOptionsChange([...priorityOptions, created].sort((a, b) => a.sort_order - b.sort_order));
      }
      toast({ title: `${activeTab === 'status' ? 'Status' : 'Priority'} added`, duration: 2000 });
      setNewLabel('');
      setNewColor('gray');
    } catch (error) {
      toast({ title: 'Failed to add', description: error.message, variant: 'destructive', duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (option) => {
    if (!editLabel.trim() || saving) return;
    setSaving(true);
    try {
      const entity = activeTab === 'status' ? base44.entities.StatusOption : base44.entities.PriorityOption;
      const updated = await entity.update(option.id, { label: editLabel.trim(), color: editColor });
      if (activeTab === 'status') {
        onStatusOptionsChange(statusOptions.map(s => s.id === option.id ? { ...s, label: editLabel.trim(), color: editColor } : s));
      } else {
        onPriorityOptionsChange(priorityOptions.map(p => p.id === option.id ? { ...p, label: editLabel.trim(), color: editColor } : p));
      }
      toast({ title: 'Updated', duration: 2000 });
      setEditing(null);
    } catch (error) {
      toast({ title: 'Failed to update', description: error.message, variant: 'destructive', duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (option) => {
    if (!confirm(`Delete "${option.label}"?`)) return;
    setSaving(true);
    try {
      const entity = activeTab === 'status' ? base44.entities.StatusOption : base44.entities.PriorityOption;
      await entity.delete(option.id);
      if (activeTab === 'status') {
        onStatusOptionsChange(statusOptions.filter(s => s.id !== option.id));
      } else {
        onPriorityOptionsChange(priorityOptions.filter(p => p.id !== option.id));
      }
      toast({ title: 'Deleted', duration: 2000 });
    } catch (error) {
      toast({ title: 'Failed to delete', description: error.message, variant: 'destructive', duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  const handleReorder = async (option, direction) => {
    const options = activeTab === 'status' ? [...statusOptions] : [...priorityOptions];
    const index = options.findIndex(o => o.id === option.id);
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= options.length) return;

    const swapped = options[newIndex];
    setSaving(true);
    try {
      const entity = activeTab === 'status' ? base44.entities.StatusOption : base44.entities.PriorityOption;
      await Promise.all([
        entity.update(option.id, { sort_order: swapped.sort_order }),
        entity.update(swapped.id, { sort_order: option.sort_order }),
      ]);
      const newOptions = options.map(o => {
        if (o.id === option.id) return { ...o, sort_order: swapped.sort_order };
        if (o.id === swapped.id) return { ...o, sort_order: option.sort_order };
        return o;
      }).sort((a, b) => a.sort_order - b.sort_order);
      if (activeTab === 'status') {
        onStatusOptionsChange(newOptions);
      } else {
        onPriorityOptionsChange(newOptions);
      }
    } catch (error) {
      toast({ title: 'Failed to reorder', description: error.message, variant: 'destructive', duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (option) => {
    setSaving(true);
    try {
      const entity = activeTab === 'status' ? base44.entities.StatusOption : base44.entities.PriorityOption;
      const options = activeTab === 'status' ? statusOptions : priorityOptions;
      await Promise.all(options.map(o => entity.update(o.id, { is_default: o.id === option.id })));
      const newOptions = options.map(o => ({ ...o, is_default: o.id === option.id }));
      if (activeTab === 'status') {
        onStatusOptionsChange(newOptions);
      } else {
        onPriorityOptionsChange(newOptions);
      }
      toast({ title: 'Default updated', duration: 2000 });
    } catch (error) {
      toast({ title: 'Failed to set default', description: error.message, variant: 'destructive', duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  const options = activeTab === 'status' ? statusOptions : priorityOptions;
  const colorMap = activeTab === 'status' ? STATUS_COLORS : PRIORITY_COLORS;
  const Icon = activeTab === 'status' ? Tag : Flag;

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Icon className="w-4 h-4 mr-1.5" />
          {activeTab === 'status' ? 'Status' : 'Priority'}
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Labels</DialogTitle>
            <DialogDescription>Add, edit, reorder, or remove board labels</DialogDescription>
          </DialogHeader>

          <div className="flex gap-1 border-b">
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'status' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
              onClick={() => { setActiveTab('status'); setNewLabel(''); setNewColor('gray'); setEditing(null); }}
            >
              Status Options
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'priority' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
              onClick={() => { setActiveTab('priority'); setNewLabel(''); setNewColor('gray'); setEditing(null); }}
            >
              Priority Options
            </button>
          </div>

          {/* Add New */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label className="text-xs">Label Name</Label>
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="New label..."
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              />
            </div>
            <div>
              <Label className="text-xs">Color</Label>
              <Select value={newColor} onValueChange={setNewColor}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COLOR_OPTIONS.map(c => (
                    <SelectItem key={c} value={c}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${GROUP_COLOR_CLASSES[c]}`} />
                        <span className="capitalize">{c}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={handleAdd} disabled={saving || !newLabel.trim()}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* List */}
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
            {options.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">No {activeTab} options yet</p>
            ) : (
              options.map((option, index) => (
                <div key={option.id} className="flex items-center gap-2 p-2 border rounded-lg">
                  {editing?.id === option.id ? (
                    <>
                      <Input
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="h-7 flex-1"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') handleEdit(option); if (e.key === 'Escape') setEditing(null); }}
                      />
                      <Select value={editColor} onValueChange={setEditColor}>
                        <SelectTrigger className="h-7 w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {COLOR_OPTIONS.map(c => (
                            <SelectItem key={c} value={c}>
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${GROUP_COLOR_CLASSES[c]}`} />
                                <span className="capitalize">{c}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(option)} disabled={saving}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(null)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleReorder(option, -1)} disabled={saving || index === 0}>
                          <ArrowUp className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleReorder(option, 1)} disabled={saving || index === options.length - 1}>
                          <ArrowDown className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <Badge className={`${colorMap[option.color] || colorMap.gray}`}>
                        {option.label}
                      </Badge>
                      {option.is_default && (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Star className="w-2.5 h-2.5" /> Default
                        </Badge>
                      )}
                      <div className="flex-1" />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleSetDefault(option)} disabled={saving || option.is_default} title="Set as default">
                        <Star className={`w-3.5 h-3.5 ${option.is_default ? 'fill-primary text-primary' : ''}`} />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(option); setEditLabel(option.label); setEditColor(option.color); }} disabled={saving}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(option)} disabled={saving}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}