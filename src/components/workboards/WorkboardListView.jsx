import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, ChevronRight, ChevronDown, X, Plus } from 'lucide-react';
import { STATUS_COLORS, PRIORITY_COLORS } from './WorkboardConstants';

export default function WorkboardListView({
  items,
  columns,
  statusOptions,
  priorityOptions,
  userMap,
  teamMap,
  expandedItems,
  editingCell,
  editValue,
  canEdit,
  canCreate,
  onToggleExpand,
  onInlineEdit,
  onEditChange,
  onCreateSubItem,
  onDeleteItem,
  renderInlineEdit,
  getValue,
}) {
  const subItemsMap = items.reduce((acc, item) => {
    if (item.parent_item) {
      if (!acc[item.parent_item]) acc[item.parent_item] = [];
      acc[item.parent_item].push(item);
    }
    return acc;
  }, {});

  const renderCell = (item, col) => {
    if (col?.column_type === 'status') {
      const color = item.status_color || 'gray';
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[color] || STATUS_COLORS.gray}`}>
          {item.status || 'Not Started'}
        </span>
      );
    }
    if (col?.column_type === 'priority') {
      const color = item.priority_color || 'gray';
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[color] || PRIORITY_COLORS.gray}`}>
          {item.priority || 'Medium'}
        </span>
      );
    }
    if (col?.column_type === 'person') {
      const field = col.name?.toLowerCase().includes('assignee') ? 'assignee' : 'owner';
      const userId = item[field];
      return <span className="text-sm">{userId ? userMap[userId] || '—' : '—'}</span>;
    }
    if (col?.column_type === 'team') {
      return <span className="text-sm">{teamMap[item.team] || '—'}</span>;
    }
    if (col?.column_type === 'date' || col?.column_type === 'timeline') {
      const field = col.name?.toLowerCase().includes('due') ? 'due_date' : col.name?.toLowerCase().includes('start') ? 'start_date' : 'due_date';
      const date = item[field];
      return <span className="text-sm">{date ? new Date(date).toLocaleDateString() : '—'}</span>;
    }
    if (col?.column_type === 'progress') {
      const percent = item.progress_percentage || 0;
      return (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden" style={{ width: '80px' }}>
            <div 
              className={`h-full rounded-full ${percent === 100 ? 'bg-green-500' : percent >= 50 ? 'bg-blue-500' : 'bg-gray-400'}`} 
              style={{ width: `${percent}%` }} 
            />
          </div>
          <span className="text-xs text-muted-foreground w-8">{percent}%</span>
        </div>
      );
    }
    if (col?.column_type === 'tags') {
      return (
        <div className="flex gap-1 flex-wrap">
          {(item.tags || []).slice(0, 3).map((tag, i) => (
            <span key={i} className="text-xs bg-accent px-1.5 py-0.5 rounded">{tag}</span>
          ))}
          {(item.tags || []).length > 3 && (
            <span className="text-xs text-muted-foreground">+{(item.tags || []).length - 3}</span>
          )}
        </div>
      );
    }
    if (col?.column_type === 'files') {
      const count = (item.files || []).length;
      return <span className="text-sm">{count > 0 ? `${count} file${count > 1 ? 's' : ''}` : '—'}</span>;
    }
    const valueRecord = getValue?.(item.id, col?.id);
    return <span className="text-sm truncate">{valueRecord?.display_value || valueRecord?.value || '—'}</span>;
  };

  const defaultColumns = [
    { id: 'status', column_type: 'status', name: 'Status' },
    { id: 'priority', column_type: 'priority', name: 'Priority' },
    { id: 'owner', column_type: 'person', name: 'Owner' },
    { id: 'due_date', column_type: 'date', name: 'Due Date' },
    { id: 'progress', column_type: 'progress', name: 'Progress' },
  ];

  const displayColumns = columns.length > 0 ? columns : defaultColumns;

  return (
    <div className="border rounded-xl overflow-hidden bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead className="min-w-[200px]">Item Name</TableHead>
              {displayColumns.map(col => (
                <TableHead key={col.id || col.name} className="min-w-[120px]">
                  {col.name || 'Column'}
                </TableHead>
              ))}
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={displayColumns.length + 3} className="py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <p>No items yet</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const subItems = subItemsMap[item.id] || [];
                const isExpanded = expandedItems[item.id];
                return (
                  <React.Fragment key={item.id}>
                    <TableRow className="hover:bg-accent/50">
                      <TableCell>
                        {subItems.length > 0 && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={() => onToggleExpand(item.id)}
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            item.item_type === 'milestone' ? 'bg-purple-500' : 
                            item.item_type === 'sub_item' ? 'bg-blue-400' : 
                            'bg-gray-400'
                          }`} />
                          {item.title}
                        </div>
                      </TableCell>
                      {displayColumns.map(col => (
                        <TableCell key={col.id || col.name}>
                          {canEdit && editingCell?.itemId === item.id && editingCell?.field === (col.field_name || col.name?.toLowerCase())
                            ? renderInlineEdit(item, col)
                            : renderCell(item, col)
                          }
                        </TableCell>
                      ))}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canCreate && (
                              <DropdownMenuItem onClick={() => onCreateSubItem(item.id)}>
                                <Plus className="w-3.5 h-3.5 mr-2" /> 
                                Add Sub-item
                              </DropdownMenuItem>
                            )}
                            {canEdit && (
                              <DropdownMenuItem 
                                onClick={() => onDeleteItem(item)} 
                                className="text-destructive"
                              >
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    {isExpanded && subItems.map(sub => (
                      <TableRow key={sub.id} className="bg-muted/30 hover:bg-accent/50">
                        <TableCell></TableCell>
                        <TableCell className="pl-8">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                            {sub.title}
                          </div>
                        </TableCell>
                        {displayColumns.map(col => (
                          <TableCell key={col.id || col.name}>
                            {canEdit && editingCell?.itemId === sub.id && editingCell?.field === (col.field_name || col.name?.toLowerCase())
                              ? renderInlineEdit(sub, col)
                              : renderCell(sub, col)
                            }
                          </TableCell>
                        ))}
                        <TableCell>
                          {canEdit && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6" 
                              onClick={() => onDeleteItem(sub)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}