import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function SortableRowWrapper({ id, data, disabled, children }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, data, disabled });

  return children({
    setNodeRef,
    setActivatorNodeRef,
    listeners,
    attributes,
    transform: CSS.Transform.toString(transform),
    transition,
    isDragging,
  });
}