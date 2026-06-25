import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/components/ui/use-toast';
import { Copy, Loader2 } from 'lucide-react';

export default function DuplicateBoardDialog({ board, workspaceId, userId, isOpen, onClose, onSuccess }) {
  const { toast } = useToast();
  const [mode, setMode] = useState('structure');
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (board) {
      setNewName(`${board.name} (Copy)`);
      setMode('structure');
    }
  }, [board]);

  if (!board) return null;

  const handleDuplicate = async () => {
    if (!newName.trim()) return;
    if (!userId) {
      toast({ title: 'Unable to duplicate board', description: 'User session not found. Please refresh the page.', variant: 'destructive', duration: 6000 });
      return;
    }
    setLoading(true);
    try {
      const newBoard = await base44.entities.Workboard.create({
        name: newName.trim(),
        description: board.description || '',
        workspace: workspaceId,
        owner: userId,
        created_by: userId,
        status: 'active',
        board_type: board.board_type || 'task_board',
        status: 'active',
        archived: false,
        color: board.color || 'violet',
        visibility: board.visibility || 'public_workspace',
        default_view: board.default_view || 'table',
        group_by_field: board.group_by_field || 'status',
        is_favorite: false,
      });

      await base44.entities.WorkboardMember.create({
        workspace: workspaceId,
        workboard: newBoard.id,
        workboard_name: newBoard.name,
        user: userId,
        role: 'workboard_owner',
        status: 'active',
        added_by: userId,
        joined_date: new Date().toISOString().split('T')[0],
      }).catch(() => {});

      const [groups, columns, statuses, priorities, items, itemValues] = await Promise.all([
        base44.entities.BoardGroup.filter({ workboard: board.id }),
        base44.entities.BoardColumn.filter({ workboard: board.id }).catch(() => []),
        base44.entities.StatusOption.filter({ workboard: board.id }),
        base44.entities.PriorityOption.filter({ workboard: board.id }),
        mode === 'with_items' ? base44.entities.WorkboardItem.filter({ workboard: board.id, archived: false }) : Promise.resolve([]),
        mode === 'with_items' ? base44.entities.WorkboardItemValue.filter({ workboard: board.id }) : Promise.resolve([]),
      ]);

      const groupIdMap = {};
      for (const g of groups.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))) {
        const ng = await base44.entities.BoardGroup.create({
          name: g.name,
          workspace: workspaceId,
          workboard: newBoard.id,
          sort_order: g.sort_order || 0,
          color: g.color || 'gray',
          collapsed: false,
          archived: false,
        });
        groupIdMap[g.id] = ng.id;
      }

      for (const c of columns.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))) {
        await base44.entities.BoardColumn.create({
          name: c.name,
          workspace: workspaceId,
          workboard: newBoard.id,
          column_type: c.column_type || 'text',
          sort_order: c.sort_order || 0,
          width: c.width || 200,
          required: c.required || false,
          hidden: c.hidden || false,
          settings: c.settings || null,
          system_column: c.system_column || false,
        });
      }

      for (const s of statuses.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))) {
        await base44.entities.StatusOption.create({
          label: s.label,
          workspace: workspaceId,
          workboard: newBoard.id,
          color: s.color || 'gray',
          sort_order: s.sort_order || 0,
          is_default: s.is_default || false,
        });
      }

      for (const p of priorities.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))) {
        await base44.entities.PriorityOption.create({
          label: p.label,
          workspace: workspaceId,
          workboard: newBoard.id,
          color: p.color || 'gray',
          sort_order: p.sort_order || 0,
          is_default: p.is_default || false,
        });
      }

      if (mode === 'with_items') {
        const itemIdMap = {};
        const parentItems = items.filter(i => !i.parent_item);
        const subItems = items.filter(i => i.parent_item);
        const sortedParents = parentItems.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

        for (const item of sortedParents) {
          const ni = await base44.entities.WorkboardItem.create({
            title: item.title,
            workspace: workspaceId,
            workboard: newBoard.id,
            group: groupIdMap[item.group] || Object.values(groupIdMap)[0],
            item_type: item.item_type || 'main_item',
            owner: item.owner || null,
            assignee: item.assignee || null,
            status: item.status || 'Not Started',
            status_color: item.status_color || 'gray',
            priority: item.priority || 'Medium',
            priority_color: item.priority_color || 'yellow',
            due_date: item.due_date || null,
            start_date: item.start_date || null,
            progress_percentage: item.progress_percentage || 0,
            sort_order: item.sort_order || 0,
            tags: item.tags || [],
            archived: false,
            created_by: userId,
          });
          itemIdMap[item.id] = ni.id;
        }

        for (const sub of subItems.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))) {
          const newParentId = itemIdMap[sub.parent_item];
          if (!newParentId) continue;
          await base44.entities.WorkboardItem.create({
            title: sub.title,
            workspace: workspaceId,
            workboard: newBoard.id,
            parent_item: newParentId,
            group: groupIdMap[sub.group] || Object.values(groupIdMap)[0],
            item_type: 'sub_item',
            owner: sub.owner || null,
            status: sub.status || 'Not Started',
            status_color: sub.status_color || 'gray',
            priority: sub.priority || 'Medium',
            priority_color: sub.priority_color || 'yellow',
            progress_percentage: sub.progress_percentage || 0,
            sort_order: sub.sort_order || 0,
            archived: false,
            created_by: userId,
          });
        }

        for (const iv of itemValues) {
          const newItemId = itemIdMap[iv.item];
          if (!newItemId) continue;
          await base44.entities.WorkboardItemValue.create({
            workspace: workspaceId,
            workboard: newBoard.id,
            item: newItemId,
            column: iv.column,
            value: iv.value || '',
            value_type: iv.value_type || 'text',
            display_value: iv.display_value || '',
            created_by: userId,
            updated_by: userId,
          });
        }
      }

      toast({ title: 'Board duplicated', description: `"${newName}" created${mode === 'with_items' ? ' with items' : ' (structure only)'}`, duration: 3000 });
      onSuccess?.(newBoard);
      onClose();
    } catch (e) {
      toast({ title: 'Failed to duplicate board', description: e.message, variant: 'destructive', duration: 6000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Copy className="w-4 h-4" /> Duplicate Board</DialogTitle>
          <DialogDescription>Create a copy of "{board.name}"</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>New Board Name</Label>
            <Input value={newName} onChange={e => setNewName(e.target.value)} autoFocus />
          </div>
          <div>
            <Label>What to copy?</Label>
            <RadioGroup value={mode} onValueChange={setMode} className="space-y-2 mt-2">
              <div className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-accent" onClick={() => setMode('structure')}>
                <RadioGroupItem value="structure" id="dup-structure" className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Structure only</p>
                  <p className="text-xs text-muted-foreground">Groups, columns, statuses, and priorities</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-accent" onClick={() => setMode('with_items')}>
                <RadioGroupItem value="with_items" id="dup-items" className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Structure + Items</p>
                  <p className="text-xs text-muted-foreground">Everything above plus all items and sub-items</p>
                </div>
              </div>
            </RadioGroup>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleDuplicate} disabled={loading || !newName.trim()}>
            {loading ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Duplicating...</> : <><Copy className="w-4 h-4 mr-1.5" /> Duplicate</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}