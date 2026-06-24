import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home, LayoutList, LayoutGrid, FolderKanban, ListTodo, CalendarDays,
  Users, Building2, FileText, Workflow, BarChart3, Activity,
  UserCog, Settings, Shield, Bell, Search, Plus,
  Moon, Sun, LogOut, ChevronLeft, ChevronRight, Star, Clock,
  ChevronDown,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/lib/WorkspaceContext';
import usePermissions from '@/hooks/usePermissions';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import QuickCreate from '@/components/shared/QuickCreate';

const primaryNav = [
  { label: 'Home', icon: Home, path: '/' },
  { label: 'My Work', icon: LayoutList, path: '/my-work' },
  { label: 'Workboards', icon: LayoutGrid, path: '/workboards' },
  { label: 'Projects', icon: FolderKanban, path: '/projects' },
  { label: 'Tasks', icon: ListTodo, path: '/tasks/table' },
  { label: 'Calendar', icon: CalendarDays, path: '/calendar' },
  { label: 'Teams', icon: Users, path: '/teams' },
];

const operationsNav = [
  { label: 'Clients', icon: Building2, path: '/clients' },
  { label: 'Documents', icon: FileText, path: '/documents' },
  { label: 'Processes', icon: Workflow, path: '/processes' },
  { label: 'Reports', icon: BarChart3, path: '/reports' },
  { label: 'Pulse Log', icon: Activity, path: '/activity' },
];

const adminNav = [
  { label: 'Users & Access', icon: UserCog, path: '/users-access' },
  { label: 'Workspace Settings', icon: Settings, path: '/workspace-settings' },
  { label: 'Security', icon: Shield, path: '/security' },
  { label: 'Notifications', icon: Bell, path: '/notifications' },
];

function NavItem({ item, collapsed, isActive, onClick }) {
  return (
    <Link
      to={item.path}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors
        ${isActive
          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
        }
        ${collapsed ? 'justify-center' : ''}`}
    >
      <item.icon className="w-4 h-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
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

export default function Sidebar({ collapsed, onToggle, theme, onToggleTheme, className, onNavigate, onSearchOpen }) {
  const { currentWorkspace, currentWorkspaceId, isAdmin } = useWorkspace();
  const { can } = usePermissions();
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
  const departments = currentWorkspace?.departments || [];

  const isPathActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    base44.auth.logout('/login');
  };

  return (
    <aside className={`flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'} ${className || ''}`}>
      {/* Logo Header */}
      <div className="flex items-center justify-between h-14 px-3 border-b border-sidebar-border shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">T</span>
          </div>
          {!collapsed && (
            <span className="font-semibold text-sm text-sidebar-foreground truncate">Tuesday</span>
          )}
        </div>
        {!collapsed && onToggle && (
          <button onClick={onToggle} className="p-1 rounded hover:bg-sidebar-accent transition-colors">
            <ChevronLeft className="w-4 h-4 text-sidebar-foreground/50" />
          </button>
        )}
        {collapsed && onToggle && (
          <button onClick={onToggle} className="absolute -right-3 top-16 z-50 w-6 h-6 rounded-full bg-background border flex items-center justify-center shadow-sm hover:bg-accent transition-colors">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Workspace Switcher */}
      <div className="px-2 pt-3 pb-1">
        <WorkspaceSwitcher collapsed={collapsed} />
      </div>

      {/* Search + Quick Create */}
      <div className="px-2 pb-2 flex gap-1.5">
        {collapsed ? (
          <button onClick={onSearchOpen} className="w-9 h-9 rounded-lg hover:bg-sidebar-accent flex items-center justify-center mx-auto text-sidebar-foreground/60">
            <Search className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={onSearchOpen} className="flex-1 flex items-center gap-2 px-2.5 py-2 rounded-lg bg-sidebar-accent text-xs text-sidebar-foreground/50 hover:bg-sidebar-accent/80 transition-colors">
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
            <kbd className="ml-auto text-[10px] px-1 py-0.5 rounded bg-sidebar/50">⌘K</kbd>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2 space-y-3">
        {/* Primary */}
        <div className="space-y-0.5">
          {primaryNav.map(item => (
            <NavItem key={item.path} item={item} collapsed={collapsed} isActive={isPathActive(item.path)} onClick={onNavigate} />
          ))}
        </div>

        {/* Workspace Section */}
        {currentWorkspace && !collapsed && (
          <div className="space-y-1">
            <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 truncate">
              {currentWorkspace.workspace_name}
            </p>
            {favorites.length > 0 && (
              <div className="space-y-0.5">
                <p className="px-2.5 py-0.5 text-[10px] text-sidebar-foreground/30 flex items-center gap-1">
                  <Star className="w-2.5 h-2.5" /> Favorites
                </p>
                {favorites.map(wb => (
                  <Link key={wb.id} to={`/workboards/${wb.id}`} onClick={onNavigate}
                    className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors">
                    <Star className="w-3 h-3 text-amber-500 shrink-0" />
                    <span className="truncate">{wb.name}</span>
                  </Link>
                ))}
              </div>
            )}
            {recent.length > 0 && (
              <div className="space-y-0.5">
                <p className="px-2.5 py-0.5 text-[10px] text-sidebar-foreground/30 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" /> Recent
                </p>
                {recent.map(wb => (
                  <Link key={wb.id} to={`/workboards/${wb.id}`} onClick={onNavigate}
                    className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors">
                    <LayoutGrid className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="truncate">{wb.name}</span>
                  </Link>
                ))}
              </div>
            )}
            {departments.length > 0 && (
              <div className="space-y-0.5">
                <p className="px-2.5 py-0.5 text-[10px] text-sidebar-foreground/30 flex items-center gap-1">
                  <Building2 className="w-2.5 h-2.5" /> Departments
                </p>
                {departments.map((dept, i) => (
                  <Link key={i} to="/workboards" onClick={onNavigate}
                    className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors">
                    <Building2 className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="truncate">{dept}</span>
                  </Link>
                ))}
              </div>
            )}
            {favorites.length === 0 && recent.length === 0 && departments.length === 0 && (
              <Link to="/workboards" onClick={onNavigate}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[12px] text-sidebar-foreground/40 hover:text-sidebar-foreground/60 transition-colors">
                <Plus className="w-3 h-3" /> No boards yet
              </Link>
            )}
          </div>
        )}

        {/* Operations */}
        <NavSection label="Operations" items={operationsNav} collapsed={collapsed} isPathActive={isPathActive} onNavigate={onNavigate} />

        {/* Admin */}
        {isAdmin && (
          <NavSection label="Admin" items={adminNav} collapsed={collapsed} isPathActive={isPathActive} onNavigate={onNavigate} />
        )}
      </nav>

      {/* Footer */}
      <div className="px-2 py-2 border-t border-sidebar-border space-y-0.5 shrink-0">
        {collapsed && (
          <button onClick={onToggle} className="flex items-center justify-center w-full py-2 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/60 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onToggleTheme}
          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium w-full text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors ${collapsed ? 'justify-center' : ''}`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
          {!collapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
        <button
          onClick={handleLogout}
          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium w-full text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}