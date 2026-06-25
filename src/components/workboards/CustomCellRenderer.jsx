import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Mail, Phone, Link as LinkIcon, User, Users } from 'lucide-react';

/**
 * Parses column settings JSON safely.
 */
export function parseSettings(column) {
  if (!column?.settings) return {};
  try {
    return JSON.parse(column.settings);
  } catch {
    return {};
  }
}

/**
 * Renders a custom column value (from WorkboardItemValue) in read-only mode.
 * Used in List view rows and Kanban cards.
 */
export default function CustomCellRenderer({ column, valueRecord, users = [], teams = [] }) {
  const value = valueRecord?.value;
  const displayValue = valueRecord?.display_value || value;
  const colType = column?.column_type || 'text';
  const settings = parseSettings(column);

  if (value === undefined || value === null || value === '') {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  switch (colType) {
    case 'checkbox':
      return (
        <Checkbox checked={value === 'true'} className="pointer-events-none" />
      );

    case 'number':
      return <span className="text-sm font-medium tabular-nums">{value}</span>;

    case 'currency': {
      const symbol = settings.currencySymbol || '$';
      return <span className="text-sm font-medium tabular-nums">{symbol}{Number(value).toLocaleString()}</span>;
    }

    case 'progress': {
      const pct = parseInt(value) || 0;
      return (
        <div className="flex items-center gap-2">
          <Progress value={pct} className="h-2 w-16" />
          <span className="text-xs text-muted-foreground w-8">{pct}%</span>
        </div>
      );
    }

    case 'date':
      return <span className="text-sm">{value ? new Date(value).toLocaleDateString() : '—'}</span>;

    case 'status': {
      const color = settings.color || 'gray';
      return <Badge variant="secondary" className={`text-xs ${color}`}>{displayValue}</Badge>;
    }

    case 'priority': {
      const color = settings.color || 'gray';
      return <Badge variant="secondary" className={`text-xs ${color}`}>{displayValue}</Badge>;
    }

    case 'dropdown':
      return <Badge variant="outline" className="text-xs">{displayValue || value}</Badge>;

    case 'team':
      return <Badge variant="outline" className="text-xs">{displayValue || value}</Badge>;

    case 'multi_select':
    case 'tags': {
      let items = [];
      try { items = JSON.parse(value); } catch { items = value.split(',').filter(Boolean); }
      if (!Array.isArray(items) || items.length === 0) return <span className="text-sm text-muted-foreground">—</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {items.map((tag, i) => (
            <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
          ))}
        </div>
      );
    }

    case 'email':
      return (
        <div className="flex items-center gap-1.5 text-sm">
          <Mail className="w-3 h-3 text-muted-foreground" />
          <a href={`mailto:${value}`} className="text-primary hover:underline truncate">{value}</a>
        </div>
      );

    case 'phone':
      return (
        <div className="flex items-center gap-1.5 text-sm">
          <Phone className="w-3 h-3 text-muted-foreground" />
          <span>{value}</span>
        </div>
      );

    case 'link':
      return (
        <div className="flex items-center gap-1.5 text-sm">
          <LinkIcon className="w-3 h-3 text-muted-foreground" />
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{displayValue || value}</a>
        </div>
      );

    case 'person': {
      const u = users.find(u => u.id === value);
      return (
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
            {(u?.full_name || u?.email || '?')[0]?.toUpperCase()}
          </div>
          <span className="text-sm truncate">{u?.full_name || u?.email || displayValue}</span>
        </div>
      );
    }

    case 'department':
      return <Badge variant="outline" className="text-xs">{displayValue || value}</Badge>;

    case 'long_text':
      return <span className="text-sm line-clamp-2">{value}</span>;

    case 'text':
    default:
      return <span className="text-sm">{value}</span>;
  }
}