import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, MoreHorizontal, Calendar, User } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { STATUS_COLORS, PRIORITY_COLORS, GROUP_COLOR_CLASSES } from './WorkboardConstants';
import { getUserInitials } from '@/lib/userHelpers';

export default function KanbanBoard({ groups, items, statusOptions, users, canEdit, canDelete, onEditItem, onDeleteItem, onAddItem, onItemClick }) {
  const getStatusColor = (status) => {
    const option = statusOptions.find(s => s.label === status);
    return option?.color || 'gray';
  };

  const getUserDisplay = (userId) => {
    if (!userId) return 'Unassigned';
    const user = users.find(u => u.id === userId);
    return user?.full_name || user?.email || 'Unassigned';
  };

  return (
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
            <div className="flex-1 space-y-2 overflow-y-auto max-h-[calc(100vh-300px)]">
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

                      {/* Status Badge */}
                      <div className="flex items-center justify-between">
                        <Badge className={`text-xs ${STATUS_COLORS[item.status_color] || STATUS_COLORS.gray}`}>
                          {item.status || 'Not Started'}
                        </Badge>
                        <Badge variant="outline" className={`text-xs ${PRIORITY_COLORS[item.priority_color]}`}>
                          {item.priority}
                        </Badge>
                      </div>

                      {/* Owner & Due Date */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                            {getUserInitials(users.find(u => u.id === item.owner))}
                          </div>
                          <span className="truncate max-w-[80px]">{getUserDisplay(item.owner)}</span>
                        </div>
                        {item.due_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(item.due_date).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>

                      {/* Progress */}
                      {item.progress_percentage > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full" 
                              style={{ width: `${item.progress_percentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{item.progress_percentage}%</span>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-1 pt-2 border-t">
                        {canDelete && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteItem?.(item);
                            }}
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
  );
}