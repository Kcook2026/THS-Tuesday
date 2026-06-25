import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Settings2 } from 'lucide-react';
import { SYSTEM_COLUMNS } from './WorkboardConstants';

const SYSTEM_FIELD_LABELS = {
  owner: 'Owner',
  status: 'Status',
  priority: 'Priority',
  due_date: 'Due Date',
  progress_percentage: 'Progress',
};

const DEFAULT_CARD_FIELDS = ['owner', 'status', 'priority'];

/**
 * Popover for selecting which fields appear on Kanban cards.
 * cardFields is an array of field keys (system field ids or column ids).
 */
export default function KanbanCardSettings({ cardFields = [], onCardFieldsChange, columns = [] }) {
  const [open, setOpen] = useState(false);

  const toggle = (key) => {
    if (cardFields.includes(key)) {
      onCardFieldsChange(cardFields.filter(k => k !== key));
    } else {
      onCardFieldsChange([...cardFields, key]);
    }
  };

  const systemFields = SYSTEM_COLUMNS.filter(c => c.id !== 'title');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="w-4 h-4 mr-1.5" />
          Card Fields
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="end">
        <p className="text-xs font-semibold text-muted-foreground px-1 mb-2">Show on Cards</p>

        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mt-2">System Fields</p>
          {systemFields.map(f => (
            <label key={f.id} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-accent cursor-pointer">
              <Checkbox checked={cardFields.includes(f.id)} onCheckedChange={() => toggle(f.id)} />
              <span className="text-sm">{f.name}</span>
            </label>
          ))}

          {columns.length > 0 && (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mt-3">Custom Columns</p>
              {columns.filter(c => !c.hidden).map(c => (
                <label key={c.id} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-accent cursor-pointer">
                  <Checkbox checked={cardFields.includes(c.id)} onCheckedChange={() => toggle(c.id)} />
                  <span className="text-sm">{c.name}</span>
                </label>
              ))}
            </>
          )}
        </div>

        <div className="border-t mt-2 pt-2 flex justify-between">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onCardFieldsChange(DEFAULT_CARD_FIELDS)}>
            Reset
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}