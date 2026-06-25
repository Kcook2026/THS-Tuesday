import { useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

export function useWorkboardMutations(boardId, workspaceId, reload) {
  const { toast } = useToast();

  const createItem = useCallback(async (itemData) => {
    try {
      const newItem = await base44.entities.WorkboardItem.create({
        ...itemData,
        workspace: workspaceId,
        workboard: boardId,
      });
      toast({ title: 'Item created', duration: 2000 });
      return newItem;
    } catch (error) {
      toast({ title: 'Failed to create item', description: error.message, variant: 'destructive', duration: 5000 });
      throw error;
    }
  }, [boardId, workspaceId, toast]);

  const updateItem = useCallback(async (itemId, updateData) => {
    try {
      await base44.entities.WorkboardItem.update(itemId, updateData);
      toast({ title: 'Updated', duration: 2000 });
    } catch (error) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive', duration: 5000 });
      throw error;
    }
  }, [toast]);

  const deleteItem = useCallback(async (itemId, subItemIds = []) => {
    try {
      if (subItemIds.length > 0) {
        await Promise.all(subItemIds.map(id => base44.entities.WorkboardItem.delete(id)));
      }
      await base44.entities.WorkboardItem.delete(itemId);
      toast({ title: 'Item deleted', duration: 2000 });
    } catch (error) {
      toast({ title: 'Failed to delete item', description: error.message, variant: 'destructive', duration: 5000 });
      throw error;
    }
  }, [toast]);

  const createGroup = useCallback(async (name, color, sortOrder = 0) => {
    try {
      const newGroup = await base44.entities.BoardGroup.create({
        name,
        color,
        workspace: workspaceId,
        workboard: boardId,
        sort_order: sortOrder,
        archived: false,
      });
      toast({ title: 'Group created', duration: 2000 });
      return newGroup;
    } catch (error) {
      toast({ title: 'Failed to create group', description: error.message, variant: 'destructive', duration: 5000 });
      throw error;
    }
  }, [boardId, workspaceId, toast]);

  const deleteGroup = useCallback(async (groupId, itemIds) => {
    try {
      if (itemIds.length > 0) {
        await Promise.all(itemIds.map(id => base44.entities.WorkboardItem.delete(id)));
      }
      await base44.entities.BoardGroup.delete(groupId);
      toast({ title: 'Group deleted', duration: 2000 });
    } catch (error) {
      toast({ title: 'Failed to delete group', description: error.message, variant: 'destructive', duration: 5000 });
      throw error;
    }
  }, [toast]);

  const archiveGroup = useCallback(async (groupId, itemIds) => {
    try {
      if (itemIds.length > 0) {
        await Promise.all(itemIds.map(id => base44.entities.WorkboardItem.update(id, { archived: true })));
      }
      await base44.entities.BoardGroup.update(groupId, { archived: true });
      toast({ title: 'Group archived', duration: 2000 });
    } catch (error) {
      toast({ title: 'Failed to archive group', description: error.message, variant: 'destructive', duration: 5000 });
      throw error;
    }
  }, [toast]);

  return {
    createItem,
    updateItem,
    deleteItem,
    createGroup,
    deleteGroup,
    archiveGroup,
  };
}