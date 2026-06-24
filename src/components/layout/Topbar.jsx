import React from 'react';
import NotificationBell from '@/components/shared/NotificationBell';
import QuickCreate from '@/components/shared/QuickCreate';

export default function Topbar() {
  return (
    <header className="sticky top-0 z-30 h-14 border-b bg-background/80 backdrop-blur-sm flex items-center justify-between px-6">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-muted-foreground">Tuesday Workspace</span>
      </div>
      <div className="flex items-center gap-2">
        <QuickCreate />
        <NotificationBell />
      </div>
    </header>
  );
}