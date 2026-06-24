import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { User, Users } from 'lucide-react';
import { STATUS_COLORS, PRIORITY_COLORS } from './WorkboardConstants';

export function renderCell(item, field, users = []) {
  const userMap = Object.fromEntries(users.map(u => [u.id, u.full_name || u.email]));

  if (field === 'status') {
    const colorClass = STATUS_COLORS[item.status_color] || STATUS_COLORS.gray;
    return <Badge variant="secondary" className={colorClass}>{item.status || 'Not Started'}</Badge>;
  }
  if (field === 'priority') {
    const colorClass = PRIORITY_COLORS[item.priority_color] || PRIORITY_COLORS.gray;
    return <Badge variant="secondary" className={colorClass}>{item.priority || 'Medium'}</Badge>;
  }
  if (field === 'owner') {
    return (
      <div className="flex items-center gap-2">
        <User className="w-3 h-3 text-muted-foreground" />
        <span className="text-sm">{userMap[item.owner] || '—'}</span>
      </div>
    );
  }
  if (field === 'assignee') {
    return (
      <div className="flex items-center gap-2">
        <Users className="w-3 h-3 text-muted-foreground" />
        <span className="text-sm">{item.assignee || '—'}</span>
      </div>
    );
  }
  if (field === 'due_date') {
    return <span className="text-sm">{item.due_date ? new Date(item.due_date).toLocaleDateString() : '—'}</span>;
  }
  if (field === 'progress_percentage') {
    const percent = item.progress_percentage || 0;
    return (
      <div className="flex items-center gap-2">
        <Progress value={percent} className="h-2 w-20" />
        <span className="text-xs text-muted-foreground w-8">{percent}%</span>
      </div>
    );
  }
  return <span className="text-sm">{item[field] || '—'}</span>;
}