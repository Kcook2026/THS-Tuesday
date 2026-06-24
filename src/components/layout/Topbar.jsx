import React from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Search, User, LogOut, Moon, Sun, ChevronDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/lib/WorkspaceContext';
import usePermissions from '@/hooks/usePermissions';
import NotificationBell from '@/components/shared/NotificationBell';
import QuickCreate from '@/components/shared/QuickCreate';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';

const ROUTE_TITLES = {
  '/': 'Home',
  '/my-work': 'My Work',
  '/workboards': 'Workboards',
  '/projects': 'Projects',
  '/tasks/table': 'Tasks',
  '/tasks/board': 'Task Board',
  '/calendar': 'Calendar',
  '/teams': 'Teams',
  '/clients': 'Clients',
  '/documents': 'Documents',
  '/processes': 'Processes',
  '/reports': 'Reports',
  '/activity': 'Pulse Log',
  '/users-access': 'Users & Access',
  '/workspace-settings': 'Workspace Settings',
  '/security': 'Security',
  '/notifications': 'Notifications',
};

function getPageTitle(pathname) {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
  if (pathname.startsWith('/workboards/')) return 'Workboard Detail';
  if (pathname.startsWith('/clients/')) return 'Client Detail';
  if (pathname.startsWith('/processes/')) return 'Process Detail';
  if (pathname.startsWith('/portfolios')) return 'Portfolio';
  return 'Tuesday Workspace';
}

export default function Topbar({ onMobileMenuClick, onSearchOpen }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentWorkspace, isAdmin, user } = useWorkspace();
  const { roleLabel } = usePermissions();

  const pageTitle = getPageTitle(location.pathname);
  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  const handleLogout = () => {
    base44.auth.logout('/login');
  };

  const roleColors = {
    Admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    Executive: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    Manager: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    'Team Member': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    'Read Only': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  };
  const roleColor = roleColors[roleLabel] || roleColors['Team Member'];

  return (
    <header className="sticky top-0 z-30 h-14 border-b bg-background/80 backdrop-blur-sm flex items-center justify-between px-4 sm:px-6 gap-3">
      {/* Left: Mobile menu + Breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onMobileMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-accent transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-foreground truncate">{pageTitle}</h1>
          <p className="hidden sm:block text-[11px] text-muted-foreground truncate">
            {currentWorkspace ? currentWorkspace.workspace_name : 'Tuesday Workspace'}
          </p>
        </div>
      </div>

      {/* Center: Search */}
      <div className="hidden md:flex flex-1 max-w-md mx-auto">
        <button
          onClick={onSearchOpen}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm text-muted-foreground"
        >
          <Search className="w-4 h-4" />
          <span>Search workspace...</span>
          <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-background border">⌘K</kbd>
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${roleColor}`}>
          {roleLabel}
        </span>
        <QuickCreate />
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-lg hover:bg-accent transition-colors">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-medium">
                {initials}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <div className="px-2 py-2">
              <p className="text-sm font-medium truncate">{user?.full_name || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/my-work')} className="gap-2">
              <User className="w-4 h-4 text-muted-foreground" /> My Work
            </DropdownMenuItem>
            {isAdmin && (
              <>
                <DropdownMenuItem onClick={() => navigate('/workspace-settings')} className="gap-2">
                  Workspace Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/users-access')} className="gap-2">
                  Users & Access
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="gap-2 text-destructive">
              <LogOut className="w-4 h-4" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}