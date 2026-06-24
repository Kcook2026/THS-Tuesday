import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home, ListTodo, Search, LayoutGrid, FolderKanban,
  CalendarDays, Users, FileText, Workflow, BarChart3,
  Activity as ActivityIcon, UserCog, Settings, Shield,
  ChevronLeft, ChevronRight, Star, Clock, Moon, Sun, LogOut,
  ChevronDown,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/lib/WorkspaceContext';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import NotificationBell from '@/components/shared/NotificationBell';
import QuickCreate from '@/components/shared/QuickCreate';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';

const primaryNav = [
  { label: 'Home', icon: Home, path: '/' },
  { label: 'My Work', icon: ListTodo, path: '/my-work' },
  { label: 'Workboards', icon: LayoutGrid, path: '/workboards' },
  { label: 'Projects', icon: FolderKanban, path: '/projects' },
  { label: 'Tasks', icon: ListTodo, path: '/tasks/table' },
  { label: 'Calendar', icon: CalendarDays, path: '/calendar' },
  { label: 'Teams', icon: Users, path: '/teams' },
];

const operationsNav = [
  { label: 'Documents', icon: FileText, path: '/documents' },
  { label: 'SOPs', icon: Workflow, path: '/processes' },
  { label: 'Reports', icon: BarChart3, path: '/reports' },
  { label: 'Activity', icon: ActivityIcon, path: '/activity' },
];

const adminNav = [
  { label: 'Users & Access', icon: UserCog, path: '/users-access' },
  { label: 'Workspace Settings', icon: Settings, path: '/workspace-settings' },
  { label: 'Security', icon: Shield, path: '/security' },
];

function NavItem({ item, collapsed, isActive, onClick }) {
  const content = (
    <Link
      to={item.path}
      onClick={onClick}
      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150
        ${isActive
          ? 'bg-primary/10 text-primary font-semibold'
          : 'text-sidebar-foreground/60 hover:bg-accent hover:text-sidebar-foreground'
        }
        ${collapsed ? 'justify-center' : ''}`}
    >
      <item.icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-primary' : ''}`} />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="text-xs">{item.label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return content;
}

function NavSection({ label, items, collapsed, isPathActive, onNavigate }) {
  const [expanded, setExpanded] = useState(true);

  if (collapsed) {
    return (
      <div className="space-y-0.5">
        {items.map(item => (
          <NavItem key={item.path} item={item} collapsed isActive={isPathActive(item.path)} onClick={onNavigate} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex items-center justify-between w-full px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 hover:text-sidebar-foreground/60 transition-colors"
      >
        {label}
        <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? '' : '-rotate-90'}`} />
      </button>
      {expanded && (
        <div className="space-y-0.5">
          {items.map(item => (
            <NavItem key={item.path} item={item} isActive={isPathActive(item.path)} onClick={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ collapsed, onToggle, theme, onToggleTheme, onSearchOpen, mobile, onNavigate }) {
  const { currentWorkspace, currentWorkspaceId, isAdmin } = useWorkspace();
  const location = useLocation();
  const [workboards, setWorkboards] = useState([]);

  useEffect(() => {
    if (!currentWorkspaceId) return;
    base44.entities.Workboard.filter({ workspace: currentWorkspaceId }, '-updated_date', 20)
      .then(setWorkboards)
      .catch(() => setWorkboards([]));
  }, [currentWorkspaceId]);

  const favorites = workboards.filter(w => w.is_favorite);
  const recent = workboards.filter(w => !w.is_favorite).slice(0, 5);

  const isPathActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleLogout = () => base44.auth.logout('/login');

  return (
    <aside className={`flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-full
      ${collapsed ? 'w-16' : 'w-64'} transition-all duration-300`}>
      {/* Header */}
      <div className="flex items-center justify-between h-14 px-3 border-b border-sidebar-border shrink-0">
        <Link to="/" onClick={() => onNavigate && onNavigate('/')} className="flex items-center gap-2.5 min-w-0">
          <img src="https://media.base44.com/images/public/6a3c063e27549006eb32fc77/ac9acccc9_Screenshot2026-06-24at134440.png" alt="Logo" className="w-8 h-8 rounded-lg shrink-0 shadow-sm object-cover" />
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-semibold text-sm text-sidebar-foreground truncate">Tuesday</p>
              <p className="text-[10px] text-sidebar-foreground/40 truncate">Workspace</p>
            </div>
          )}
        </Link>
        {!mobile && !collapsed && (
          <button onClick={onToggle} className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors shrink-0">
            <ChevronLeft className="w-4 h-4 text-sidebar-foreground/40" />
          </button>
        )}
      </div>

      {/* Workspace Switcher + Quick Create */}
      <div className="px-2 pt-2.5 pb-2 space-y-2 border-b border-sidebar-border">
        {collapsed ? (
          <div className="flex justify-center">
            <WorkspaceSwitcher collapsed />
          </div>
        ) : (
          <WorkspaceSwitcher />
        )}
        <div className={collapsed ? 'flex justify-center' : ''}>
          <QuickCreate collapsed={collapsed} />
        </div>
      </div>

      {/* Search + Notifications */}
      <div className={`flex ${collapsed ? 'flex-col items-center' : 'flex-row'} gap-1.5 px-2 py-2 border-b border-sidebar-border`}>
        <button
          onClick={onSearchOpen}
          title="Search"
          className={`flex items-center gap-2 ${collapsed ? 'w-9 h-9 justify-center' : 'flex-1 px-2.5'} py-2 rounded-lg text-sidebar-foreground/50 hover:bg-accent hover:text-sidebar-foreground transition-colors`}
        >
          <Search className="w-4 h-4 shrink-0" />
          {!collapsed && (
            <>
              <span className="text-xs">Search</span>
              <kbd className="ml-auto text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground/60">⌘K</kbd>
            </>
          )}
        </button>
        <div className={collapsed ? 'w-9 h-9 flex items-center justify-center' : ''}>
          <NotificationBell />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {/* Primary */}
        <div className="space-y-0.5">
          {primaryNav.map(item => (
            <NavItem key={item.path} item={item} collapsed={collapsed} isActive={isPathActive(item.path)} onClick={onNavigate} />
          ))}
        </div>

        {/* Workspace Section - Favorites & Recent */}
        {!collapsed && currentWorkspace && (favorites.length > 0 || recent.length > 0) && (
          <div className="space-y-1">
            <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 truncate">
              {currentWorkspace.workspace_name}
            </p>
            {favorites.length > 0 && (
              <div className="space-y-0.5">
                <p className="px-2.5 text-[10px] text-sidebar-foreground/30 flex items-center gap-1">
                  <Star className="w-2.5 h-2.5" /> Favorites
                </p>
                {favorites.map(wb => (
                  <Link key={wb.id} to={`/workboards/${wb.id}`} onClick={onNavigate}
                    className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[12px] text-sidebar-foreground/60 hover:bg-accent hover:text-sidebar-foreground transition-colors">
                    <Star className="w-3 h-3 text-amber-500 shrink-0" />
                    <span className="truncate">{wb.name}</span>
                  </Link>
                ))}
              </div>
            )}
            {recent.length > 0 && (
              <div className="space-y-0.5">
                <p className="px-2.5 text-[10px] text-sidebar-foreground/30 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" /> Recent
                </p>
                {recent.map(wb => (
                  <Link key={wb.id} to={`/workboards/${wb.id}`} onClick={onNavigate}
                    className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[12px] text-sidebar-foreground/60 hover:bg-accent hover:text-sidebar-foreground transition-colors">
                    <LayoutGrid className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="truncate">{wb.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Operations */}
        <NavSection label="Operations" items={operationsNav} collapsed={collapsed} isPathActive={isPathActive} onNavigate={onNavigate} />

        {/* Administration */}
        {isAdmin && (
          <NavSection label="Administration" items={adminNav} collapsed={collapsed} isPathActive={isPathActive} onNavigate={onNavigate} />
        )}
      </nav>

      {/* Footer */}
      <div className="px-2 py-2 border-t border-sidebar-border space-y-0.5 shrink-0">
        {collapsed && (
          <button onClick={onToggle} className="flex items-center justify-center w-full py-2 rounded-lg hover:bg-accent text-sidebar-foreground/40 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium w-full text-sidebar-foreground/60 hover:bg-accent hover:text-sidebar-foreground transition-colors ${collapsed ? 'justify-center' : ''}`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
          {!collapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
        <button
          onClick={handleLogout}
          title="Sign Out"
          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium w-full text-sidebar-foreground/60 hover:bg-accent hover:text-sidebar-foreground transition-colors ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}