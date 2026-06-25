import React from 'react';
import { GripVertical } from 'lucide-react';

export default function DragHandle({ setActivatorNodeRef, listeners, attributes, className }) {
  return (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => e.stopPropagation()}
      className={`cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground ${className || ''}`}
      style={{ touchAction: 'none' }}
      tabIndex={-1}
    >
      <GripVertical className="w-3.5 h-3.5" />
    </button>
  );
}