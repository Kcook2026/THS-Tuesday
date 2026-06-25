import React from 'react';
import { Badge } from '@/components/ui/badge';
import { STATUS_COLORS } from '@/components/workboards/WorkboardConstants';

export default function StatusPill({ status, color, className = '' }) {
  const colorClass = STATUS_COLORS[color] || STATUS_COLORS.gray;
  return (
    <Badge variant="secondary" className={`text-xs ${colorClass} ${className}`}>
      {status || 'Not Started'}
    </Badge>
  );
}