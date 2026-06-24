import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, FolderKanban, CheckSquare, Table2, CalendarDays, 
  Users, Building2, BarChart3, Activity, FileText, ChevronLeft, ChevronRight,
  LogOut, Moon, Sun
} from 'lucide-react';
import { base44 } from '@/api/base44Client';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Projects', icon: FolderKanban, path: '/projects' },
  { label: 'Task Board', icon: CheckSquare, path: '/tasks/board' },
  { label: 'Task Table', icon: Table2, path: '/tasks/table' },
  { label: 'Calendar', icon: CalendarDays, path: '/calendar' },
  { label: 'Teams', icon: Users, path: '/teams' },
  { label: 'Clients', icon: Building2, path: '/clients' },
  { label: 'Documents', icon: FileText, path: '/documents' },
  { label: 'Reports', icon: BarChart3, path: '/reports' },
  { label: 'Activity', icon: Activity, path: '/activity' },
];

export default function Sidebar({ collapsed, onToggle, theme, onToggleTheme }) {
  const location = useLocation();

  const handleLogout = () => {
    base44.auth.logout('/login');
  };

  return (
    <aside className={`fixed left-0 top-0 bottom-0 z-40 flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}>
      {/* Logo */}
      <div className="flex items-center h-14 px-4 border-b border-sidebar-border shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">T</span>
          </div>
          {!collapsed && (
            <span className="font-semibold text-sm text-sidebar-foreground truncate">Tuesday</span>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map(item => {
          const isActive = location.pathname === item.path || 
            (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors
                ${isActive 
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground' 
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                }
                ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-sidebar-border space-y-0.5">
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
        <button
          onClick={onToggle}
          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium w-full text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors ${collapsed ? 'justify-center' : ''}`}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}