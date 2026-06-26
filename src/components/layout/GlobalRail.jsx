import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home, Search, Star, Settings,
} from 'lucide-react';
import { useWorkspace } from '@/lib/WorkspaceContext';
import NotificationBell from '@/components/shared/NotificationBell';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { base44 } from '@/api/base44Client';

const railNav = [
  { label: 'Home', icon: Home, path: '/' },
  { label: 'Search', icon: Search, action: 'search' },
  { label: 'Favorites', icon: Star, path: '/workboards?filter=favorites' },
  { label: 'Settings', icon: Settings, path: '/workspace-settings' },
];

function RailItem({ item, isActive, onSearchOpen }) {
  const content = (
    <button
      onClick={() => item.action === 'search' ? onSearchOpen() : null}
      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 shrink-0
        ${isActive ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
    >
      <item.icon className="w-5 h-5" />
    </button>
  );

  if (item.action === 'search') {
    return content;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          {item.path ? <Link to={item.path}>{content}</Link> : content}
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs font-medium">{item.label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function GlobalRail({ onSearchOpen }) {
  const { user, currentWorkspace } = useWorkspace();
  const location = useLocation();
  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  const handleLogout = () => base44.auth.logout('/login');

  return (
    <aside className="w-14 bg-sidebar border-r border-sidebar-border flex flex-col items-center py-3 shrink-0 sticky top-0 h-screen z-50">
      {/* Logo */}
      <Link to="/" className="mb-4 shrink-0">
        <img
          src="https://media.base44.com/images/public/6a3c063e27549006eb32fc77/ac9acccc9_Screenshot2026-06-24at134440.png"
          alt="THS"
          className="w-9 h-9 rounded-xl object-cover shadow-sm"
        />
      </Link>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col items-center gap-1.5 w-full px-1.5">
        {railNav.map(item => (
          <RailItem
            key={item.label}
            item={item}
            isActive={item.path ? location.pathname === item.path : false}
            onSearchOpen={onSearchOpen}
          />
        ))}
        <NotificationBell />
      </nav>

      {/* User Avatar */}
      <div className="mt-auto pt-3 border-t border-sidebar-border w-full px-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold shadow-sm hover:shadow-md transition-shadow shrink-0">
              {initials}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-2">
              <p className="text-sm font-medium truncate">{user?.full_name || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              {currentWorkspace && (
                <p className="text-[10px] text-muted-foreground/60 mt-1 truncate">
                  {currentWorkspace.workspace_name}
                </p>
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => window.location.href = '/my-work'}>My Work</DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.location.href = '/workspace-settings'}>Workspace Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">Sign Out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}