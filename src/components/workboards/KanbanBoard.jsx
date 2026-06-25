import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, MoreHorizontal, Calendar, Columns3, ListTodo } from 'lucide-react';
import { STATUS_COLORS, PRIORITY_COLORS, GROUP_COLOR_CLASSES } from './WorkboardConstants';
import { getUserInitials } from '@/lib/userHelpers';
import CustomCellRenderer from './CustomCellRenderer';
import KanbanCardSettings from './KanbanCardSettings';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

const SYSTEM_FIELD_LABELS = {
  owner: 'Owner',
  status: 'Status',
  priority: 'Priority',
  due_date: 'Due Date',
  progress_percentage: 'Progress',
};

function KanbanCard({ item, renderCardField, cardFields, onItemClick, canDelete, onDeleteItem }) {
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { type: 'card', itemId: item.id },
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `card-drop:${item.id}`,
    data: { type: 'card', itemId: item.id },
  });

  return (
    <div
      ref={(node) => { setDragRef(node); setDropRef(node); }}
      style={{ transform: CSS.Transform.toString(transform), opacity: isDragging ? 0.5 : 1 }}
      {...listeners}
      {...attributes}
    >
      <Card className={`cursor-pointer hover:shadow-md transition-shadow ${isOver ? 'ring-2 ring-primary/40' : ''}`} onClick={() => onItemClick?.(item)}>
        <CardContent className="p-3 space-y-2">
          <div className="font-medium text-sm line-clamp-2">{item.title}</div>
          {(cardFields || []).map(fieldKey => renderCardField(item, fieldKey))}
          {item._subItemCount > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1 border-t">
              <Plus className="w-3 h-3" />
              {item._subItemCount} sub-item{item._subItemCount > 1 ? 's' : ''}
            </div>
          )}
          <div className="flex items-center justify-end gap-1 pt-2 border-t">
            {canDelete && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onDeleteItem?.(item); }}>
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KanbanColumn({ column, colItems, header, children }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `kanban-col:${column.id}`,
    data: { type: 'kanban-column', columnId: column.id },
  });

  return (
    <div ref={setNodeRef} className={`min-w-[300px] max-w-[300px] flex flex-col rounded-lg transition-colors ${isOver ? 'bg-accent/30' : ''}`}>
      {header}
      <div className="flex-1 space-y-2 overflow-y-auto max-h-[calc(100vh-380px)] min-h-[100px] p-1">
        {colItems.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-8 border-2 border-dashed rounded-lg">
            No items
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard({
  groups, items, statusOptions, users, teams, columns,
  cardFields, onCardFieldsChange,
  getValue, canEdit, canDelete, onEditItem, onDeleteItem, onAddItem, onItemClick,
  onMoveItemToGroup, onMoveItemToStatus,
}) {
  const [groupBy, setGroupBy] = useState('group');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const getUserDisplay = (userId) => {
    if (!userId) return 'Unassigned';
    const user = users.find(u => u.id === userId);
    return user?.full_name || user?.email || 'Unassigned';
  };

  const renderCardField = (item, fieldKey) => {
    if (SYSTEM_FIELD_LABELS[fieldKey]) {
      switch (fieldKey) {
        case 'status':
          return (
            <div key={fieldKey} className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">{SYSTEM_FIELD_LABELS[fieldKey]}</span>
              <Badge className={`text-xs ${STATUS_COLORS[item.status_color] || STATUS_COLORS.gray}`}>
                {item.status || 'Not Started'}
              </Badge>
            </div>
          );
        case 'priority':
          return (
            <div key={fieldKey} className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">{SYSTEM_FIELD_LABELS[fieldKey]}</span>
              <Badge variant="outline" className={`text-xs ${PRIORITY_COLORS[item.priority_color]}`}>
                {item.priority}
              </Badge>
            </div>
          );
        case 'owner':
          return (
            <div key={fieldKey} className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">{SYSTEM_FIELD_LABELS[fieldKey]}</span>
              <div className="flex items-center gap-1">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                  {getUserInitials(users.find(u => u.id === item.owner))}
                </div>
                <span className="truncate max-w-[80px] text-xs">{getUserDisplay(item.owner)}</span>
              </div>
            </div>
          );
        case 'due_date':
          return (
            <div key={fieldKey} className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">{SYSTEM_FIELD_LABELS[fieldKey]}</span>
              {item.due_date ? (
                <div className="flex items-center gap-1 text-xs">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(item.due_date).toLocaleDateString()}</span>
                </div>
              ) : <span className="text-xs text-muted-foreground">—</span>}
            </div>
          );
        case 'progress_percentage':
          if (!item.progress_percentage) return null;
          return (
            <div key={fieldKey} className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">{SYSTEM_FIELD_LABELS[fieldKey]}</span>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${item.progress_percentage}%` }} />
              </div>
              <span className="text-xs text-muted-foreground">{item.progress_percentage}%</span>
            </div>
          );
        default:
          return null;
      }
    }

    const column = columns?.find(c => c.id === fieldKey);
    if (!column) return null;
    const valueRecord = getValue?.(item.id, column.id);
    return (
      <div key={fieldKey} className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">{column.name}</span>
        <div className="text-xs"><CustomCellRenderer column={column} valueRecord={valueRecord} users={users} teams={teams} /></div>
      </div>
    );
  };

  const kanbanColumns = groupBy === 'group'
    ? groups.map(g => ({ id: g.id, name: g.name, colorClass: GROUP_COLOR_CLASSES[g.color] || 'bg-gray-500' }))
    : statusOptions.map(s => ({ id: s.label, name: s.label, colorClass: STATUS_COLORS[s.color] || STATUS_COLORS.gray }));

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;

    const itemId = active.id;
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    let targetColumnId;
    const overData = over.data.current;

    if (overData?.type === 'kanban-column') {
      targetColumnId = overData.columnId;
    } else if (overData?.type === 'card') {
      const overItem = items.find(i => i.id === overData.itemId);
      if (overItem) {
        targetColumnId = groupBy === 'group' ? overItem.group : overItem.status;
      }
    }

    if (!targetColumnId) return;

    const currentColumnId = groupBy === 'group' ? item.group : item.status;

    if (currentColumnId !== targetColumnId) {
      if (groupBy === 'group') {
        onMoveItemToGroup?.(itemId, targetColumnId);
      } else {
        const statusOption = statusOptions.find(s => s.label === targetColumnId);
        onMoveItemToStatus?.(itemId, targetColumnId, statusOption?.color || 'gray');
      }
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button
              variant={groupBy === 'group' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setGroupBy('group')}
            >
              <Columns3 className="w-4 h-4 mr-1.5" /> By Group
            </Button>
            <Button
              variant={groupBy === 'status' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setGroupBy('status')}
            >
              <ListTodo className="w-4 h-4 mr-1.5" /> By Status
            </Button>
          </div>
          <KanbanCardSettings
            cardFields={cardFields || []}
            onCardFieldsChange={onCardFieldsChange}
            columns={columns || []}
          />
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {kanbanColumns.map(col => {
            const colItems = groupBy === 'group'
              ? items.filter(item => item.group === col.id)
              : items.filter(item => item.status === col.id);

            return (
              <KanbanColumn key={col.id} column={col} colItems={colItems}
                header={
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${col.colorClass}`} />
                      <h3 className="font-semibold text-sm">{col.name}</h3>
                      <Badge variant="secondary" className="text-xs">{colItems.length}</Badge>
                    </div>
                    {canEdit && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onAddItem?.(col.id)}>
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                }
              >
                {colItems.map(item => (
                  <KanbanCard
                    key={item.id}
                    item={item}
                    renderCardField={renderCardField}
                    cardFields={cardFields}
                    onItemClick={onItemClick}
                    canDelete={canDelete}
                    onDeleteItem={onDeleteItem}
                  />
                ))}
              </KanbanColumn>
            );
          })}
        </div>
      </div>
    </DndContext>
  );
}