import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, FolderKanban, CheckSquare, Table2, CalendarDays, 
  Users, Building2, BarChart3, Activity, FileText, ChevronLeft, ChevronRight,
  LogOut, Moon, Sun, LayoutGrid, Workflow, Zap, Briefcase, Target,
  Clock, DollarSign, ShieldAlert, LayoutTemplate, Map, Bell, Settings,
  ChevronDown
} from 'lucide-react';
import { base44 } from '@/api/base44Client';

const navSections = [
  {
    label: 'Plan',
    items: [
      { label: 'Command Center', icon: LayoutDashboard, path: '/' },
      { label: 'Portfolios', icon: Briefcase, path: '/portfolios' },
      { label: 'Goals', icon: Target, path: '/goals' },
      { label: 'Roadmap', icon: Map, path: '/roadmap' },
    ]
  },
  {
    label: 'Execute',
    items: [
      { label: 'Workboards', icon: LayoutGrid, path: '/workboards' },
      { label: 'Projects', icon: FolderKanban, path: '/projects' },
      { label: 'Tasks', icon: CheckSquare, path: '/tasks/board' },
      { label: 'Task Table', icon: Table2, path: '/tasks/table' },
      { label: 'Calendar', icon: CalendarDays, path: '/calendar' },
      { label: 'Processes', icon: Workflow, path: '/processes' },
    ]
  },
  {
    label: 'Operate',
    items: [
      { label: 'Resources', icon: Users, path: '/resources' },
      { label: 'Timesheets', icon: Clock, path: '/timesheets' },
      { label: 'Clients', icon: Building2, path: '/clients' },
      { label: 'Documents', icon: FileText, path: '/documents' },
      { label: 'Teams', icon: Users, path: '/teams' },
    ]
  },
  {
    label: 'Measure',
    items: [
      { label: 'Finance', icon: DollarSign, path: '/finance' },
      { label: 'Risks', icon: ShieldAlert, path: '/risks' },
      { label: 'Reports', icon: BarChart3, path: '/reports' },
      { label: 'Pulse Log', icon: Activity, path: '/activity' },
    ]
  },
  {
    label: 'Admin',
    items: [
      { label: 'Automations', icon: Zap, path: '/automations' },
      { label: 'Templates', icon: LayoutTemplate, path: '/templates' },
      { label: 'Notifications', icon: Bell, path: '/notifications' },
      { label: 'Settings', icon: Settings, path: '/reports' },
    ]
  },
];

export default function Sidebar({ collapsed, onToggle, theme, onToggleTheme }) {
  const location = useLocation();
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (label) => {
    setExpandedSections(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const handleLogout = () => {
    base44.auth.logout('/login');
  };

  const isPathActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(path);
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
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {navSections.map(section => {
          const isExpanded = expandedSections[section.label] !== false;
          return (
            <div key={section.label}>
              {!collapsed && (
                <button
                  onClick={() => toggleSection(section.label)}
                  className="flex items-center justify-between w-full px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 hover:text-sidebar-foreground/60 transition-colors"
                >
                  {section.label}
                  <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                </button>
              )}
              {(isExpanded || collapsed) && (
                <div className="space-y-0.5">
                  {section.items.map(item => {
                    const isActive = isPathActive(item.path);
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
                </div>
              )}
            </div>
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