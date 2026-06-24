import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronsUpDown, Check, Plus, Settings, Building2, Briefcase, Users, FolderKanban, Wrench } from 'lucide-react';
import { useWorkspace } from '@/lib/WorkspaceContext';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

const TYPE_ICONS = {
  company_workspace: Building2,
  department_workspace: Briefcase,
  team_workspace: Users,
  project_workspace: FolderKanban,
  operations_workspace: Wrench,
};

const TYPE_LABELS = {
  company_workspace: 'Company',
  department_workspace: 'Department',
  team_workspace: 'Team',
  project_workspace: 'Project',
  operations_workspace: 'Operations',
};

export default function WorkspaceSwitcher({ collapsed }) {
  const { workspaces, currentWorkspace, currentWorkspaceId, switchWorkspace, isAdmin, user } = useWorkspace();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);

  const canCreate = isAdmin || user?.role === 'manager';
  const Icon = currentWorkspace ? (TYPE_ICONS[currentWorkspace.workspace_type] || Building2) : Building2;

  if (collapsed) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="w-9 h-9 rounded-lg bg-sidebar-accent flex items-center justify-center hover:bg-sidebar-accent/80 transition-colors mx-auto">
            <Icon className="w-4 h-4 text-sidebar-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="w-64">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Workspaces</DropdownMenuLabel>
          {workspaces.map(ws => (
            <DropdownMenuItem key={ws.id} onClick={() => switchWorkspace(ws.id)}>
              {ws.workspace_name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-sidebar-accent transition-colors group">
            <div className="w-7 h-7 rounded-md bg-sidebar-primary flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-sidebar-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {currentWorkspace?.workspace_name || 'No Workspace'}
              </p>
              <p className="text-[11px] text-sidebar-foreground/50 truncate">
                {currentWorkspace ? (TYPE_LABELS[currentWorkspace.workspace_type] || 'Workspace') : 'Select workspace'}
              </p>
            </div>
            <ChevronsUpDown className="w-3.5 h-3.5 text-sidebar-foreground/40 shrink-0" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" align="start" className="w-64">
          <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
            Your Workspaces
          </DropdownMenuLabel>
          {workspaces.length === 0 && (
            <div className="px-2 py-3 text-xs text-muted-foreground">No workspaces available</div>
          )}
          {workspaces.map(ws => {
            const WsIcon = TYPE_ICONS[ws.workspace_type] || Building2;
            const isActive = ws.id === currentWorkspaceId;
            return (
              <DropdownMenuItem key={ws.id} onClick={() => switchWorkspace(ws.id)} className="gap-2.5">
                <WsIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="flex-1 truncate text-sm">{ws.workspace_name}</span>
                {isActive && <Check className="w-3.5 h-3.5 text-primary" />}
              </DropdownMenuItem>
            );
          })}
          {canCreate && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/workspace-settings')} className="gap-2.5">
                <Plus className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Create Workspace</span>
              </DropdownMenuItem>
            </>
          )}
          {isAdmin && currentWorkspace && (
            <DropdownMenuItem onClick={() => navigate('/workspace-settings')} className="gap-2.5">
              <Settings className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Manage Workspace</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}