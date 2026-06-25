import React from 'react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
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

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

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
        // Dropped on a group container or empty zone — move to that group
        // (only if it's a different group, otherwise no-op)
        if (activeData.groupId !== overData.groupId) {
          onMoveItemToGroup?.(activeData.itemId, overData.groupId);
        }
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
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={groups.map(g => `group:${g.id}`)} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}