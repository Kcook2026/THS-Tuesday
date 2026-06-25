import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, MoreHorizontal, Calendar } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { STATUS_COLORS, PRIORITY_COLORS, GROUP_COLOR_CLASSES, SYSTEM_COLUMNS } from './WorkboardConstants';
import { getUserInitials } from '@/lib/userHelpers';
import CustomCellRenderer from './CustomCellRenderer';
import KanbanCardSettings from './KanbanCardSettings';

const SYSTEM_FIELD_LABELS = {
  owner: 'Owner',
  status: 'Status',
  priority: 'Priority',
  due_date: 'Due Date',
  progress_percentage: 'Progress',
};

export default function KanbanBoard({
  groups, items, statusOptions, users, teams, columns,
  cardFields, onCardFieldsChange,
  getValue, canEdit, canDelete, onEditItem, onDeleteItem, onAddItem, onItemClick,
}) {
  const getUserDisplay = (userId) => {
    if (!userId) return 'Unassigned';
    const user = users.find(u => u.id === userId);
    return user?.full_name || user?.email || 'Unassigned';
  };

  const renderCardField = (item, fieldKey) => {
    // System field
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

    // Custom column
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

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <KanbanCardSettings
          cardFields={cardFields || []}
          onCardFieldsChange={onCardFieldsChange}
          columns={columns || []}
        />
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {groups.map(group => {
          const groupItems = items.filter(item => item.group === group.id);
          const colorClass = GROUP_COLOR_CLASSES[group.color] || 'bg-gray-500';

          return (
            <div key={group.id} className="min-w-[300px] max-w-[300px] flex flex-col">
              {/* Group Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${colorClass}`} />
                  <h3 className="font-semibold text-sm">{group.name}</h3>
                  <Badge variant="secondary" className="text-xs">{groupItems.length}</Badge>
                </div>
                {canEdit && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onAddItem?.(group.id)}>
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>

              {/* Items */}
              <div className="flex-1 space-y-2 overflow-y-auto max-h-[calc(100vh-380px)]">
                {groupItems.length === 0 ? (
                  <div className="text-center text-xs text-muted-foreground py-8 border-2 border-dashed rounded-lg">
                    No items
                  </div>
                ) : (
                  groupItems.map(item => (
                    <Card
                      key={item.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => onItemClick?.(item)}
                    >
                      <CardContent className="p-3 space-y-2">
                        {/* Title */}
                        <div className="font-medium text-sm line-clamp-2">{item.title}</div>

                        {/* Selected card fields */}
                        {(cardFields || []).map(fieldKey => renderCardField(item, fieldKey))}

                        {/* Sub-items indicator */}
                        {item._subItemCount > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1 border-t">
                            <Plus className="w-3 h-3" />
                            {item._subItemCount} sub-item{item._subItemCount > 1 ? 's' : ''}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-1 pt-2 border-t">
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => { e.stopPropagation(); onDeleteItem?.(item); }}
                            >
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}