import React from 'react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';

export default function BoardListDnd({
  groups,
  onReorderGroups,
  onMoveItemToGroup,
  onReorderItems,
  onMoveSubItem,
  onReorderSubItems,
  children,
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Custom collision detection: filter droppable targets based on what's being dragged.
  // This prevents large group containers from capturing the `over` target when dragging items.
  const collisionDetection = (args) => {
    const { active, droppableContainers } = args;
    const activeType = active.data.current?.type;
    const all = Array.from(droppableContainers);

    let filtered = all;
    if (activeType === 'item') {
      filtered = all.filter(c => {
        const t = c.data.current?.type;
        return t === 'item' || t === 'group-drop';
      });
    } else if (activeType === 'subitem') {
      filtered = all.filter(c => {
        const t = c.data.current?.type;
        return t === 'item' || t === 'subitem';
      });
    } else if (activeType === 'group') {
      filtered = all.filter(c => c.data.current?.type === 'group');
    }

    return closestCorners({ ...args, droppableContainers: filtered.length ? filtered : all });
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;
    if (!activeData || !overData) return;

    // Group reorder
    if (activeData.type === 'group' && overData.type === 'group') {
      if (activeData.groupId !== overData.groupId) {
        onReorderGroups?.(activeData.groupId, overData.groupId);
      }
      return;
    }

    // Item operations
    if (activeData.type === 'item') {
      if (overData.type === 'item') {
        if (activeData.groupId === overData.groupId) {
          if (activeData.itemId !== overData.itemId) {
            onReorderItems?.(activeData.itemId, overData.itemId, activeData.groupId);
          }
        } else {
          onMoveItemToGroup?.(activeData.itemId, overData.groupId);
        }
      } else if (overData.type === 'group-drop' || overData.type === 'group') {
        onMoveItemToGroup?.(activeData.itemId, overData.groupId);
      }
      return;
    }

    // Sub-item operations
    if (activeData.type === 'subitem') {
      if (overData.type === 'subitem') {
        if (activeData.parentId === overData.parentId) {
          if (activeData.itemId !== overData.itemId) {
            onReorderSubItems?.(activeData.itemId, overData.itemId, activeData.parentId);
          }
        } else {
          onMoveSubItem?.(activeData.itemId, overData.parentId);
        }
      } else if (overData.type === 'item') {
        if (activeData.parentId !== overData.itemId) {
          onMoveSubItem?.(activeData.itemId, overData.itemId);
        }
      }
      return;
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragEnd={handleDragEnd}>
      <SortableContext items={groups.map(g => `group:${g.id}`)} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}