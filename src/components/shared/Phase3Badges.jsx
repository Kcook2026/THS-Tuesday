import React from 'react';
import { Badge } from '@/components/ui/badge';

const HEALTH_STYLES = {
  excellent: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  on_track: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
  good: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  at_risk: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  critical: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20',
  inactive: 'bg-muted text-muted-foreground border-border'
};

const SEVERITY_STYLES = {
  low: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  moderate: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
  high: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
  critical: 'bg-red-500/10 text-red-700 dark:text-red-300'
};

const RISK_STATUS_STYLES = {
  open: 'bg-red-500/10 text-red-700 dark:text-red-300',
  monitoring: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  mitigated: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  closed: 'bg-muted text-muted-foreground'
};

const FINANCE_STATUS_STYLES = {
  planned: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  submitted: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  approved: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  paid: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  rejected: 'bg-red-500/10 text-red-700 dark:text-red-300'
};

const TIMESHEET_STATUS_STYLES = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  approved: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  rejected: 'bg-red-500/10 text-red-700 dark:text-red-300'
};

const GOAL_STATUS_STYLES = {
  not_started: 'bg-muted text-muted-foreground',
  on_track: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  at_risk: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  achieved: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  missed: 'bg-red-500/10 text-red-700 dark:text-red-300',
  archived: 'bg-muted text-muted-foreground'
};

const AUTOMATION_STATUS_STYLES = {
  active: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  paused: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  draft: 'bg-muted text-muted-foreground',
  archived: 'bg-muted text-muted-foreground'
};

const RUN_STATUS_STYLES = {
  success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  failed: 'bg-red-500/10 text-red-700 dark:text-red-300',
  skipped: 'bg-muted text-muted-foreground'
};

const ALLOCATION_STATUS_STYLES = {
  planned: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  active: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  overallocated: 'bg-red-500/10 text-red-700 dark:text-red-300',
  completed: 'bg-muted text-muted-foreground'
};

const formatLabel = (s) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export function HealthBadge({ health }) {
  const cls = HEALTH_STYLES[health] || HEALTH_STYLES.good;
  return <Badge variant="outline" className={`text-[11px] ${cls}`}>{formatLabel(health)}</Badge>;
}

export function SeverityBadge({ severity }) {
  const cls = SEVERITY_STYLES[severity] || SEVERITY_STYLES.moderate;
  return <Badge variant="outline" className={`text-[11px] ${cls}`}>{formatLabel(severity)}</Badge>;
}

export function RiskStatusBadge({ status }) {
  const cls = RISK_STATUS_STYLES[status] || RISK_STATUS_STYLES.open;
  return <Badge variant="outline" className={`text-[11px] ${cls}`}>{formatLabel(status)}</Badge>;
}

export function FinanceStatusBadge({ status }) {
  const cls = FINANCE_STATUS_STYLES[status] || FINANCE_STATUS_STYLES.planned;
  return <Badge variant="outline" className={`text-[11px] ${cls}`}>{formatLabel(status)}</Badge>;
}

export function TimesheetStatusBadge({ status }) {
  const cls = TIMESHEET_STATUS_STYLES[status] || TIMESHEET_STATUS_STYLES.draft;
  return <Badge variant="outline" className={`text-[11px] ${cls}`}>{formatLabel(status)}</Badge>;
}

export function GoalStatusBadge({ status }) {
  const cls = GOAL_STATUS_STYLES[status] || GOAL_STATUS_STYLES.not_started;
  return <Badge variant="outline" className={`text-[11px] ${cls}`}>{formatLabel(status)}</Badge>;
}

export function AutomationStatusBadge({ status }) {
  const cls = AUTOMATION_STATUS_STYLES[status] || AUTOMATION_STATUS_STYLES.draft;
  return <Badge variant="outline" className={`text-[11px] ${cls}`}>{formatLabel(status)}</Badge>;
}

export function RunStatusBadge({ status }) {
  const cls = RUN_STATUS_STYLES[status] || RUN_STATUS_STYLES.skipped;
  return <Badge variant="outline" className={`text-[11px] ${cls}`}>{formatLabel(status)}</Badge>;
}

export function AllocationStatusBadge({ status }) {
  const cls = ALLOCATION_STATUS_STYLES[status] || ALLOCATION_STATUS_STYLES.planned;
  return <Badge variant="outline" className={`text-[11px] ${cls}`}>{formatLabel(status)}</Badge>;
}