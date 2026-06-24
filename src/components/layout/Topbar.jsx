import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Menu, Search, ChevronRight, LogOut } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/lib/WorkspaceContext';
import usePermissions from '@/hooks/usePermissions';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const ROUTE_MAP = {
  '/': { label: 'Home', parent: null },
  '/my-work': { label: 'My Work', parent: null },
  '/workboards': { label: 'Workboards', parent: null },
  '/projects': { label: 'Projects', parent: null },
  '/tasks/table': { label: 'Tasks', parent: null },
  '/tasks/board': { label: 'Task Board', parent: '/tasks/table' },
  '/calendar': { label: 'Calendar', parent: null },
  '/teams': { label: 'Teams', parent: null },
  '/clients': { label: 'Clients', parent: null },
  '/documents': { label: 'Documents', parent: null },
  '/processes': { label: 'Processes', parent: null },
  '/reports': { label: 'Reports', parent: null },
  '/activity': { label: 'Pulse Log', parent: null },
  '/users-access': { label: 'Users & Access', parent: null },
  '/workspace-settings': { label: 'Workspace Settings', parent: null },
  '/security': { label: 'Security', parent: null },
  '/notifications': { label: 'Notifications', parent: null },
};

function getBreadcrumb(pathname) {
  const entries = [];
  let current = pathname;

  // Handle detail pages
  if (current.startsWith('/workboards/')) {
    entries.push({ label: 'Workboards', path: '/workboards' });
    entries.push({ label: 'Board Detail' });
    return entries;
  }
  if (current.startsWith('/clients/')) {
    entries.push({ label: 'Clients', path: '/clients' });
    entries.push({ label: 'Client Detail' });
    return entries;
  }
  if (current.startsWith('/processes/')) {
    entries.push({ label: 'Processes', path: '/processes' });
    entries.push({ label: 'Process Detail' });
    return entries;
  }

  const match = ROUTE_MAP[current];
  if (match) {
    if (match.parent && ROUTE_MAP[match.parent]) {
      entries.push({ label: ROUTE_MAP[match.parent].label, path: match.parent });
    }
    entries.push({ label: match.label });
  }
  return entries;
}

export default function Topbar({ onMobileMenuClick, onSearchOpen }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentWorkspace, isAdmin, user } = useWorkspace();
  const { roleLabel } = usePermissions();

  const breadcrumbs = getBreadcrumb(location.pathname);
  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  const handleLogout = () => base44.auth.logout('/login');

  const roleColors = {
    Admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    Executive: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    Manager: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    'Team Member': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    'Read Only': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  };
  const roleColor = roleColors[roleLabel] || roleColors['Team Member'];

  return (
    <header className="sticky top-0 z-30 h-14 border-b bg-background/80 backdrop-blur-md flex items-center justify-between px-4 gap-3">
      {/* Left: Mobile menu + Breadcrumbs */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onMobileMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-accent transition-colors shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>
        <nav className="flex items-center gap-1.5 min-w-0">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />}
              {crumb.path ? (
                <Link to={crumb.path} className="text-sm text-muted-foreground hover:text-foreground transition-colors truncate">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-sm font-medium text-foreground truncate">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Center: Search */}
      <button
        onClick={onSearchOpen}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60 hover:bg-muted transition-colors text-sm text-muted-foreground w-full max-w-xs"
      >
        <Search className="w-4 h-4" />
        <span className="truncate">Search workspace...</span>
        <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-background border shrink-0">⌘K</kbd>
      </button>

      {/* Right: Role badge + User menu */}
      <div className="flex items-center gap-2 shrink-0">
        <span className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${roleColor}`}>
          {roleLabel}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-lg hover:bg-accent transition-colors">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-medium">
                {initials}
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-2">
              <p className="text-sm font-medium truncate">{user?.full_name || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/my-work')}>My Work</DropdownMenuItem>
            {isAdmin && (
              <>
                <DropdownMenuItem onClick={() => navigate('/workspace-settings')}>Workspace Settings</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/users-access')}>Users & Access</DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem onClick={() => navigate('/security')}>Security</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">Sign Out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}