import React from 'react';
import { Badge } from '@/components/ui/badge';
import { PRIORITY_COLORS } from '@/components/workboards/WorkboardConstants';

export default function PriorityPill({ priority, color, className = '' }) {
  const colorClass = PRIORITY_COLORS[color] || PRIORITY_COLORS.gray;
  return (
    <Badge variant="secondary" className={`text-xs ${colorClass} ${className}`}>
      {priority || 'Medium'}
    </Badge>
  );
}