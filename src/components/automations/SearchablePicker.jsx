import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Check, Search, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const COLOR_MAP = {
  gray: 'bg-gray-400', red: 'bg-red-400', orange: 'bg-orange-400',
  yellow: 'bg-yellow-400', green: 'bg-green-400', blue: 'bg-blue-400',
  amber: 'bg-amber-400', purple: 'bg-purple-400', pink: 'bg-pink-400',
};

export default function SearchablePicker({
  value, onValueChange, options = [], placeholder = 'Select...',
  emptyMessage = 'No options available', className,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setSearch('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const hasGroups = options.some(o => o.group);
  const selected = options.find(o => o.value === value);

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const groups = useMemo(() => {
    if (!hasGroups) return [{ label: null, items: filtered }];
    const map = {};
    filtered.forEach(o => {
      const g = o.group || 'Other';
      if (!map[g]) map[g] = [];
      map[g].push(o);
    });
    return Object.entries(map).map(([label, items]) => ({ label, items }));
  }, [filtered, hasGroups]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={cn(
          'flex h-8 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm hover:bg-accent/50 focus:outline-none focus:ring-1 focus:ring-ring',
          !selected && 'text-muted-foreground', className
        )}>
          <span className="flex items-center gap-1.5 truncate min-w-0">
            {selected?.color && <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', COLOR_MAP[selected.color] || 'bg-gray-400')} />}
            <span className="truncate">{selected ? selected.label : placeholder}</span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0 ml-2" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input ref={inputRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="h-8 pl-7" />
          </div>
        </div>
        <div className="max-h-56 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-xs text-center text-muted-foreground">{emptyMessage}</p>
          ) : (
            groups.map((grp, gi) => (
              <div key={gi}>
                {grp.label && <p className="px-3 py-1 text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">{grp.label}</p>}
                {grp.items.map(opt => (
                  <button key={opt.value} type="button" onClick={() => { onValueChange(opt.value); setOpen(false); }}
                    className={cn('flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent text-left',
                      opt.value === value && 'bg-accent/50')}>
                    {opt.color && <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', COLOR_MAP[opt.color] || 'bg-gray-400')} />}
                    <span className="flex-1 truncate">{opt.label}</span>
                    {opt.value === value && <Check className="w-3.5 h-3.5 shrink-0 text-primary" />}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}