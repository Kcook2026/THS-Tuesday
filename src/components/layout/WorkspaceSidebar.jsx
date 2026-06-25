import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, LayoutGrid, Activity as ActivityIcon, Users, Settings,
  ChevronDown, ChevronRight, Plus, Star, Clock, Search,
  FolderKanban, Workflow, Building2, Target, MoreHorizontal,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/lib/WorkspaceContext';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import QuickCreate from '@/components/shared/QuickCreate';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const primaryNav = [
  { label: 'Home', icon: Home, path: '/' },
  { label: 'My Work', icon: Target, path: '/my-work' },
  { label: 'Workboards', icon: LayoutGrid, path: '/workboards' },
  { label: 'Activity', icon: ActivityIcon, path: '/activity' },
];

const adminNav = [
  { label: 'Members', icon: Users, path: '/members' },
  { label: 'Settings', icon: Settings, path: '/workspace-settings' },
];

const boardTypeIcons = {
  project_board: FolderKanban,
  task_board: LayoutGrid,
  process_board: Workflow,
  operations_board: Settings,
};

function NavItem({ item, isActive, collapsed, onClick }) {
  const content = (
    <Link
      to={item.path}
      onClick={onClick}
      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150
        ${isActive
          ? 'bg-primary/10 text-primary font-semibold'
          : 'text-foreground/60 hover:bg-accent hover:text-foreground'
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

function WorkboardGroup({ label, workboards, collapsed, onNavigate }) {
  if (!workboards || workboards.length === 0) return null;

  return (
    <div className="space-y-0.5">
      {!collapsed && (
        <p className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/40">
          {label}
        </p>
      )}
      {workboards.map(wb => {
        const Icon = boardTypeIcons[wb.board_type] || LayoutGrid;
        return (
          <Link
            key={wb.id}
            to={`/workboards/${wb.id}`}
            onClick={onNavigate}
            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[12px] transition-colors
              ${collapsed ? 'justify-center' : ''}`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
            {!collapsed && <span className="truncate text-foreground/70 hover:text-foreground">{wb.name}</span>}
          </Link>
        );
      })}
    </div>
  );
}

export default function WorkspaceSidebar({ collapsed, onToggle, mobile, onNavigate }) {
  const { currentWorkspace, currentWorkspaceId, isAdmin } = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();
  const [workboards, setWorkboards] = useState([]);
  const [teams, setTeams] = useState([]);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    if (!currentWorkspaceId || isLoadingRef.current) return;
    isLoadingRef.current = true;
    
    const loadSidebarData = async () => {
      try {
        const [w, t] = await Promise.all([
          base44.entities.Workboard.filter({ workspace: currentWorkspaceId, archived: false }, '-updated_date', 20).catch(() => []),
          base44.entities.Team.filter({ workspace: currentWorkspaceId }, '-updated_date', 10).catch(() => []),
        ]);
        // Client-side safeguard: filter out archived, deleted, or inaccessible boards + dedupe
        const seen = new Set();
        const valid = w.filter(wb => {
          if (!wb || !wb.id || seen.has(wb.id)) return false;
          if (wb.archived === true || wb.status === 'archived') return false;
          if (wb.status === 'template') return false;
          seen.add(wb.id);
          return true;
        });
        setWorkboards(valid);
        setTeams(t);
      } catch (error) {
        console.error('Sidebar load error:', error);
      } finally {
        isLoadingRef.current = false;
      }
    };
    
    loadSidebarData();
  }, [currentWorkspaceId]);

  const favorites = workboards.filter(w => w.is_favorite && w.status !== 'archived' && !w.archived);
  const recent = workboards.filter(w => !w.is_favorite && w.status !== 'archived' && !w.archived).slice(0, 5);

  const isPathActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <aside className={`flex flex-col bg-sidebar border-r border-sidebar-border h-full transition-all duration-300
      ${collapsed ? 'w-16' : 'w-64'}`}>
      {/* Workspace Header */}
      <div className="h-14 px-3 border-b border-sidebar-border shrink-0 flex items-center justify-between">
        {!collapsed && currentWorkspace ? (
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">{currentWorkspace.workspace_name}</p>
            <p className="text-[10px] text-muted-foreground truncate capitalize">
              {currentWorkspace.workspace_type?.replace('_', ' ')}
            </p>
          </div>
        ) : (
          <div className="flex-1" />
        )}
        {!mobile && !collapsed && (
          <button onClick={onToggle} className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors shrink-0">
            <ChevronRight className="w-4 h-4 text-sidebar-foreground/40" />
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
          <>
            <WorkspaceSwitcher />
            <QuickCreate collapsed={false} />
          </>
        )}
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {/* Primary */}
        <div className="space-y-0.5">
          {primaryNav.map(item => (
            <NavItem key={item.path} item={item} collapsed={collapsed} isActive={isPathActive(item.path)} onClick={onNavigate} />
          ))}
        </div>

        {/* Workspace Boards */}
        {!collapsed && currentWorkspace && (
          <div className="space-y-3">
            {favorites.length > 0 && (
              <WorkboardGroup label="Favorites" workboards={favorites} collapsed={collapsed} onNavigate={onNavigate} />
            )}
            {recent.length > 0 && (
              <WorkboardGroup label="Recent" workboards={recent} collapsed={collapsed} onNavigate={onNavigate} />
            )}
            {teams.length > 0 && (
              <div>
                <p className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/40">
                  Teams
                </p>
                <div className="space-y-0.5">
                  {teams.slice(0, 5).map(team => (
                    <Link
                      key={team.id}
                      to={`/teams`}
                      onClick={onNavigate}
                      className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[12px] text-foreground/60 hover:bg-accent hover:text-foreground transition-colors"
                    >
                      <Users className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{team.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Administration */}
        {!collapsed && isAdmin && (
          <div className="pt-3 border-t border-sidebar-border">
            <p className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/40">
              Administration
            </p>
            <div className="space-y-0.5">
              {adminNav.map(item => (
                <NavItem key={item.path} item={item} collapsed={false} isActive={isPathActive(item.path)} onClick={onNavigate} />
              ))}
            </div>
          </div>
        )}
      </nav>
    </aside>
  );
}