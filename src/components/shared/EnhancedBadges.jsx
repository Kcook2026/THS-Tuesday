import React from 'react';
import { Badge } from '@/components/ui/badge';

const TASK_HEALTH_CONFIG = {
  on_track: { label: 'On Track', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20' },
  at_risk: { label: 'At Risk', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20' },
  blocked: { label: 'Blocked', className: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20' },
  overdue: { label: 'Overdue', className: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/25' },
  complete: { label: 'Complete', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20' },
};

const CLIENT_HEALTH_CONFIG = {
  excellent: { label: 'Excellent', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20' },
  good: { label: 'Good', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20' },
  at_risk: { label: 'At Risk', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20' },
  critical: { label: 'Critical', className: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20' },
  inactive: { label: 'Inactive', className: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20' },
};

const APPROVAL_CONFIG = {
  draft: { label: 'Draft', className: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20' },
  in_review: { label: 'In Review', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20' },
  approved: { label: 'Approved', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20' },
  archived: { label: 'Archived', className: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20' },
};

const PROCESS_STATUS_CONFIG = {
  draft: { label: 'Draft', className: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20' },
  active: { label: 'Active', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20' },
  paused: { label: 'Paused', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20' },
  completed: { label: 'Completed', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20' },
  archived: { label: 'Archived', className: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20' },
};

export function TaskHealthBadge({ health }) {
  const config = TASK_HEALTH_CONFIG[health] || TASK_HEALTH_CONFIG.on_track;
  return <Badge variant="outline" className={`text-[11px] ${config.className}`}>{config.label}</Badge>;
}

export function ClientHealthBadge({ health }) {
  const config = CLIENT_HEALTH_CONFIG[health] || CLIENT_HEALTH_CONFIG.good;
  return <Badge variant="outline" className={`text-[11px] ${config.className}`}>{config.label}</Badge>;
}

export function ApprovalStatusBadge({ status }) {
  const config = APPROVAL_CONFIG[status] || APPROVAL_CONFIG.draft;
  return <Badge variant="outline" className={`text-[11px] ${config.className}`}>{config.label}</Badge>;
}

export function ProcessStatusBadge({ status }) {
  const config = PROCESS_STATUS_CONFIG[status] || PROCESS_STATUS_CONFIG.draft;
  return <Badge variant="outline" className={`text-[11px] ${config.className}`}>{config.label}</Badge>;
}