import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getUserInitials } from '@/lib/userHelpers';

export default function UserAvatar({ user, userId, users, size = 'sm', showName = false }) {
  const u = users?.find(u => u.id === userId) || user;
  const displayName = u?.full_name || u?.email || 'Unassigned';
  const initials = getUserInitials(u);

  const sizeClasses = {
    xs: 'w-5 h-5 text-[10px]',
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  return (
    <div className="flex items-center gap-2">
      <Avatar className={sizeClasses[size] || sizeClasses.sm}>
        <AvatarFallback className="bg-primary/10 text-primary font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>
      {showName && <span className="text-sm">{displayName}</span>}
    </div>
  );
}