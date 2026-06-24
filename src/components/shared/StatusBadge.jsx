import React from 'react';
import { Badge } from '@/components/ui/badge';

const STATUS_CONFIG = {
  // Project statuses
  planning: { label: 'Planning', variant: 'secondary' },
  active: { label: 'Active', variant: 'default' },
  on_hold: { label: 'On Hold', variant: 'outline' },
  completed: { label: 'Completed', variant: 'default', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
  // Task statuses
  backlog: { label: 'Backlog', variant: 'secondary' },
  todo: { label: 'To Do', variant: 'outline' },
  in_progress: { label: 'In Progress', variant: 'default', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20' },
  review: { label: 'Review', variant: 'default', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20' },
  done: { label: 'Done', variant: 'default', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20' },
  // Client statuses
  inactive: { label: 'Inactive', variant: 'secondary' },
  prospect: { label: 'Prospect', variant: 'outline' },
};

const PRIORITY_CONFIG = {
  low: { label: 'Low', className: 'bg-slate-500/10 text-slate-600 border-slate-500/20' },
  medium: { label: 'Medium', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  high: { label: 'High', className: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  critical: { label: 'Critical', className: 'bg-red-500/10 text-red-600 border-red-500/20' },
};

export function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || { label: status, variant: 'secondary' };
  return (
    <Badge variant={config.variant} className={config.className || ''}>
      {config.label}
    </Badge>
  );
}

export function PriorityBadge({ priority }) {
  const config = PRIORITY_CONFIG[priority] || { label: priority, className: '' };
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}