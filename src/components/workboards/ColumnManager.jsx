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
  { field: 'owner', label: 'Owner', type: 'user', is_default: true },
  { field: 'status', label: 'Status', type: 'status', is_default: true },
  { field: 'priority', label: 'Priority', type: 'priority', is_default: true },
  { field: 'due_date', label: 'Due Date', type: 'date', is_default: true },
  { field: 'completion_percentage', label: 'Progress', type: 'progress', is_default: true },
];

const AVAILABLE_COLUMNS = [
  { field: 'description', label: 'Description', type: 'text' },
  { field: 'project', label: 'Project', type: 'relation' },
  { field: 'start_date', label: 'Start Date', type: 'date' },
  { field: 'estimated_hours', label: 'Estimated Hours', type: 'number' },
  { field: 'actual_hours', label: 'Actual Hours', type: 'number' },
  { field: 'tags', label: 'Tags', type: 'tags' },
  { field: 'health', label: 'Health', type: 'health' },
];

export default function ColumnManager({ boardId, workspaceId, columns, onColumnsChange }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const handleToggleColumn = async (field, label, type) => {
    try {
      const existing = columns.find(c => c.field === field);
      
      if (existing) {
        await base44.entities.CustomField.update(existing.id, { is_visible: false });
        onColumnsChange(columns.filter(c => c.field !== field));
      } else {
        const newColumn = {
          board: boardId,
          workspace: workspaceId,
          field_name: field,
          field_label: label,
          field_type: type,
          field_order: columns.length,
          is_visible: true,
          is_required: false,
        };
        const created = await base44.entities.CustomField.create(newColumn);
        onColumnsChange([...columns, created]);
      }
      
      toast({ title: existing ? 'Column hidden' : 'Column added' });
    } catch (error) {
      toast({ title: 'Error updating columns', description: error.message, variant: 'destructive' });
    }
  };

  const handleMoveColumn = async (index, direction) => {
    const newColumns = [...columns];
    const temp = newColumns[index];
    const newIndex = index + direction;
    
    if (newIndex < 0 || newIndex >= newColumns.length) return;
    
    newColumns[index] = newColumns[newIndex];
    newColumns[newIndex] = temp;
    
    // Update order
    newColumns.forEach((col, idx) => {
      col.field_order = idx;
    });
    
    onColumnsChange(newColumns);
    
    // Persist changes
    try {
      await Promise.all(
        newColumns.map(col => 
          base44.entities.CustomField.update(col.id, { field_order: col.field_order })
        )
      );
    } catch (error) {
      toast({ title: 'Error reordering', description: error.message, variant: 'destructive' });
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
        {columns.map((col, index) => (
          <DropdownMenuItem key={col.field} className="flex items-center justify-between">
            <span className="text-sm">{col.field_label}</span>
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
                disabled={index === columns.length - 1}
              >
                <MoveDown className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => { e.stopPropagation(); handleToggleColumn(col.field, col.field_label, col.field_type); }}
              >
                <EyeOff className="w-3 h-3" />
              </Button>
            </div>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Add Column</div>
        {AVAILABLE_COLUMNS.filter(col => !columns.find(c => c.field === col.field)).map(col => (
          <DropdownMenuItem key={col.field} onClick={() => handleToggleColumn(col.field, col.label, col.type)}>
            <Plus className="w-3 h-3 mr-2" />
            {col.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}