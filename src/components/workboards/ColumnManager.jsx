import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Settings2, Plus, Eye, EyeOff, MoveUp, MoveDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

const DEFAULT_COLUMNS = [
  { name: 'Item', column_type: 'text', is_default: true },
  { name: 'Owner', column_type: 'person', is_default: true },
  { name: 'Status', column_type: 'status', is_default: true },
  { name: 'Priority', column_type: 'priority', is_default: true },
  { name: 'Timeline', column_type: 'timeline', is_default: true },
  { name: 'Due Date', column_type: 'date', is_default: true },
  { name: 'Progress', column_type: 'progress', is_default: true },
];

export default function ColumnManager({ boardId, workspaceId, columns, onColumnsChange }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const handleToggleColumn = async (columnName, columnType) => {
    try {
      const existing = columns.find(c => c.name === columnName);
      
      if (existing) {
        await base44.entities.BoardColumn.update(existing.id, { hidden: true });
        onColumnsChange(columns.filter(c => c.name !== columnName));
        toast({ title: 'Column hidden', duration: 3000 });
      } else {
        const newColumn = {
          workspace: workspaceId,
          workboard: boardId,
          name: columnName,
          column_type: columnType,
          sort_order: columns.length,
          width: 200,
          hidden: false,
          required: false,
        };
        const created = await base44.entities.BoardColumn.create(newColumn);
        onColumnsChange([...columns, created]);
        toast({ title: 'Column added', duration: 3000 });
      }
    } catch (error) {
      toast({ title: 'Error updating columns', description: error.message, variant: 'destructive', duration: 6000 });
    }
  };

  const handleMoveColumn = async (index, direction) => {
    const newColumns = [...columns];
    const temp = newColumns[index];
    const newIndex = index + direction;
    
    if (newIndex < 0 || newIndex >= newColumns.length) return;
    
    newColumns[index] = newColumns[newIndex];
    newColumns[newIndex] = temp;
    
    newColumns.forEach((col, idx) => {
      col.sort_order = idx;
    });
    
    onColumnsChange(newColumns);
    
    try {
      await Promise.all(
        newColumns.map(col => 
          base44.entities.BoardColumn.update(col.id, { sort_order: col.sort_order })
        )
      );
      toast({ title: 'Columns reordered', duration: 3000 });
    } catch (error) {
      toast({ title: 'Error reordering', description: error.message, variant: 'destructive', duration: 6000 });
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="w-4 h-4 mr-1.5" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Visible Columns</div>
        {columns.filter(c => !c.hidden).map((col, index) => (
          <DropdownMenuItem key={col.id} className="flex items-center justify-between">
            <span className="text-sm">{col.name}</span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => { e.stopPropagation(); handleMoveColumn(index, -1); }}
                disabled={index === 0}
              >
                <MoveUp className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => { e.stopPropagation(); handleMoveColumn(index, 1); }}
                disabled={index === columns.filter(c => !c.hidden).length - 1}
              >
                <MoveDown className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => { e.stopPropagation(); handleToggleColumn(col.name, col.column_type); }}
              >
                <EyeOff className="w-3 h-3" />
              </Button>
            </div>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Add Column</div>
        {DEFAULT_COLUMNS.filter(col => !columns.find(c => c.name === col.name)).map(col => (
          <DropdownMenuItem key={col.name} onClick={() => handleToggleColumn(col.name, col.column_type)}>
            <Plus className="w-3 h-3 mr-2" />
            {col.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}