import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Trash2, GripVertical } from 'lucide-react';
import FormFieldRenderer from '@/components/forms/FormFieldRenderer';
import { FIELD_TYPES, SYSTEM_FIELDS } from '@/components/forms/FormConstants';

export function SortableField({ field, index, isSelected, onSelect, onDelete, users, teams, columns }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const mappingLabel = field.mapped_system_field
    ? SYSTEM_FIELDS.find(s => s.value === field.mapped_system_field)?.label
    : field.mapped_column
      ? columns.find(c => c.id === field.mapped_column)?.name
      : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative rounded-lg border p-4 transition-colors ${
        isSelected ? 'border-primary ring-1 ring-primary/30' : 'border-border'
      } cursor-pointer`}
      onClick={() => onSelect(field.id)}
    >
      <div className="absolute left-1 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing p-1 hover:bg-accent rounded" {...attributes} {...listeners}>
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <div className="pl-5">
        <FormFieldRenderer
          field={field}
          value={null}
          onChange={() => {}}
          readOnly={false}
          users={users}
          teams={teams}
        />
        {mappingLabel && (
          <p className="text-xs text-primary mt-2">Maps to: {mappingLabel}</p>
        )}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(field.id); }}
        className="absolute right-2 top-2 p-1 hover:bg-destructive/10 hover:text-destructive rounded"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function SortableFieldList({ fields, selectedFieldId, onSelect, onDelete, onReorder, users, teams, columns }) {
  return (
    <div className="space-y-3">
      {fields.map((field, index) => (
        <SortableField
          key={field.id}
          field={field}
          index={index}
          isSelected={selectedFieldId === field.id}
          onSelect={onSelect}
          onDelete={onDelete}
          users={users}
          teams={teams}
          columns={columns}
        />
      ))}
    </div>
  );
}