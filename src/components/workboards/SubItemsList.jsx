import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ChevronRight, ChevronDown, Plus, CornerDownRight } from 'lucide-react';
import { STATUS_COLORS, PRIORITY_COLORS } from './WorkboardConstants';
import { getUserInitials } from '@/lib/userHelpers';

/**
 * Lists sub-items for an item in the Item Detail Drawer.
 * Allows adding sub-items and editing their system fields inline.
 */
export default function SubItemsList({
  item,
  subItems = [],
  statusOptions = [],
  priorityOptions = [],
  users = [],
  onAddSubItem,
  onUpdateSubItem,
}) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [expanded, setExpanded] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!newTitle.trim() || saving) return;
    setSaving(true);
    try {
      await onAddSubItem(newTitle.trim());
      setNewTitle('');
      setAdding(false);
      setExpanded(true);
    } finally {
      setSaving(false);
    }
  };

  const getUserDisplay = (userId) => {
    if (!userId) return 'Unassigned';
    const u = users.find(u => u.id === userId);
    return u?.full_name || u?.email || 'Unassigned';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          className="flex items-center gap-2 text-sm font-semibold"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          Sub-items
          <Badge variant="secondary" className="text-xs">{subItems.length}</Badge>
        </button>
        <Button variant="outline" size="sm" className="h-7" onClick={() => setAdding(!adding)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Sub-item
        </Button>
      </div>

      {adding && (
        <div className="flex items-center gap-2 pl-6">
          <CornerDownRight className="w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') { setAdding(false); setNewTitle(''); }
            }}
            placeholder="Sub-item title..."
            className="h-8"
            autoFocus
          />
          <Button size="sm" onClick={handleAdd} disabled={saving || !newTitle.trim()}>
            Add
          </Button>
        </div>
      )}

      {expanded && (
        <div className="space-y-2 pl-6">
          {subItems.length === 0 && !adding ? (
            <div className="text-center py-4 border border-dashed rounded-lg">
              <CornerDownRight className="w-5 h-5 mx-auto mb-1 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">No sub-items</p>
            </div>
          ) : (
            subItems.map(sub => (
              <div key={sub.id} className="flex items-center gap-2 p-2 border rounded-lg bg-muted/30">
                <CornerDownRight className="w-3 h-3 text-muted-foreground shrink-0" />
                <Input
                  defaultValue={sub.title}
                  onBlur={(e) => {
                    if (e.target.value !== sub.title && e.target.value.trim()) {
                      onUpdateSubItem(sub.id, { title: e.target.value.trim() });
                    }
                  }}
                  className="h-7 flex-1 text-sm"
                />
                <Select
                  value={sub.status || ''}
                  onValueChange={(v) => {
                    const opt = statusOptions.find(s => s.label === v);
                    onUpdateSubItem(sub.id, { status: v, status_color: opt?.color || 'gray' });
                  }}
                >
                  <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(s => <SelectItem key={s.id} value={s.label}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select
                  value={sub.priority || ''}
                  onValueChange={(v) => {
                    const opt = priorityOptions.find(p => p.label === v);
                    onUpdateSubItem(sub.id, { priority: v, priority_color: opt?.color || 'gray' });
                  }}
                >
                  <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map(p => <SelectItem key={p.id} value={p.label}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select
                  value={sub.owner || 'unassigned'}
                  onValueChange={(v) => onUpdateSubItem(sub.id, { owner: v === 'unassigned' ? null : v })}
                >
                  <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}