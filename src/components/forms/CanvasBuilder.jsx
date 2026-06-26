import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Trash2, GripVertical, Plus, Minus, Heading, AlignLeft, Image as ImageIcon, Move } from 'lucide-react';
import FormFieldRenderer from '@/components/forms/FormFieldRenderer';

const SPAN_CLASSES = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
};

function CanvasBlock({ block, field, isSelected, onSelect, onDelete, onChangeBlock, users, teams }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : 'auto',
    scale: isDragging ? '1.02' : '1',
  };
  const span = SPAN_CLASSES[block.span || 1] || SPAN_CLASSES[1];

  const renderBlockContent = () => {
    switch (block.type) {
      case 'field':
        if (!field) return <p className="text-xs text-muted-foreground">Field not found</p>;
        return <FormFieldRenderer field={field} value={null} onChange={() => {}} readOnly={false} users={users} teams={teams} />;
      case 'section':
        return <div className="border-b pb-2"><h3 className="text-base font-semibold">{block.props?.title || 'Section'}</h3></div>;
      case 'divider':
        return <hr className="border-border" />;
      case 'header':
        const level = block.props?.level || 2;
        const Tag = `h${level}`;
        return <Tag className="font-bold">{block.props?.text || 'Header'}</Tag>;
      case 'richtext':
        return <p className="text-sm text-muted-foreground">{block.props?.content || 'Rich text content'}</p>;
      case 'image':
        return block.props?.url ? <img src={block.props.url} alt={block.props?.alt || ''} className="max-w-full rounded" /> : <div className="aspect-video rounded bg-muted flex items-center justify-center"><ImageIcon className="w-8 h-8 text-muted-foreground" /></div>;
      case 'spacer':
        return <div className="h-8" />;
      case 'columns':
        return (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded border border-dashed p-2 text-center text-xs text-muted-foreground">Column 1</div>
            <div className="rounded border border-dashed p-2 text-center text-xs text-muted-foreground">Column 2</div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative rounded-lg border p-4 transition-colors ${span} ${isSelected ? 'border-primary ring-1 ring-primary/30' : 'border-border'}`}
      onClick={() => onSelect(block.id)}
    >
      <div className="absolute left-1 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing p-1 hover:bg-accent rounded" {...attributes} {...listeners}>
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <div className="pl-5">
        {renderBlockContent()}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(block.id); }}
        className="absolute right-2 top-2 p-1 hover:bg-destructive/10 hover:text-destructive rounded"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function CanvasBuilder({ blocks, fields, selectedBlockId, onSelectBlock, onDeleteBlock, onAddBlock, onChangeBlock, users, teams, previewMode }) {
  const fieldMap = {};
  fields.forEach(f => { fieldMap[f.id] = f; });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-3">
        {blocks.length === 0 ? (
          <div className="col-span-4 rounded-lg border border-dashed p-12 text-center">
            <Move className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">Canvas is empty. Drag blocks from the left or add below.</p>
          </div>
        ) : (
          blocks.map(block => (
            <CanvasBlock
              key={block.id}
              block={block}
              field={block.type === 'field' ? fieldMap[block.field_id] : null}
              isSelected={selectedBlockId === block.id}
              onSelect={onSelectBlock}
              onDelete={onDeleteBlock}
              onChangeBlock={onChangeBlock}
              users={users}
              teams={teams}
            />
          ))
        )}
      </div>

      {!previewMode && (
        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => onAddBlock('field')}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Field
          </Button>
          <Button variant="outline" size="sm" onClick={() => onAddBlock('section')}>
            <Heading className="w-3.5 h-3.5 mr-1" /> Section
          </Button>
          <Button variant="outline" size="sm" onClick={() => onAddBlock('divider')}>
            <Minus className="w-3.5 h-3.5 mr-1" /> Divider
          </Button>
          <Button variant="outline" size="sm" onClick={() => onAddBlock('header')}>
            <Heading className="w-3.5 h-3.5 mr-1" /> Header
          </Button>
          <Button variant="outline" size="sm" onClick={() => onAddBlock('richtext')}>
            <AlignLeft className="w-3.5 h-3.5 mr-1" /> Rich Text
          </Button>
          <Button variant="outline" size="sm" onClick={() => onAddBlock('image')}>
            <ImageIcon className="w-3.5 h-3.5 mr-1" /> Image
          </Button>
          <Button variant="outline" size="sm" onClick={() => onAddBlock('spacer')}>
            <Move className="w-3.5 h-3.5 mr-1" /> Spacer
          </Button>
        </div>
      )}
    </div>
  );
}