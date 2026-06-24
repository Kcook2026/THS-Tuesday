import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, FolderKanban, CheckSquare, Building2, FileText,
  Users, Workflow, LayoutGrid, Mail, Sparkles,
} from 'lucide-react';
import usePermissions from '@/hooks/usePermissions';
import WorkspaceFormDialog from './WorkspaceFormDialog';
import InviteUserDialog from './InviteUserDialog';

export default function QuickCreate({ collapsed }) {
  const { can, isAdmin, isManager } = usePermissions();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const items = [
    ...(isAdmin || isManager
      ? [{ label: 'Workspace', icon: Sparkles, action: () => setWorkspaceOpen(true) }]
      : []),
    ...(can('canManageBoards')
      ? [{ label: 'Workboard', icon: LayoutGrid, action: () => navigate('/workboards?create=true') }]
      : []),
    ...(can('canCreate')
      ? [{ label: 'Project', icon: FolderKanban, action: () => navigate('/projects?create=true') }]
      : []),
    ...(can('canCreate')
      ? [{ label: 'Task', icon: CheckSquare, action: () => navigate('/tasks/table?create=true') }]
      : []),
    ...(can('canCreate')
      ? [{ label: 'Client', icon: Building2, action: () => navigate('/clients?create=true') }]
      : []),
    ...(can('canCreate')
      ? [{ label: 'Document', icon: FileText, action: () => navigate('/documents?create=true') }]
      : []),
    ...(can('canManageProcesses')
      ? [{ label: 'Process', icon: Workflow, action: () => navigate('/processes?create=true') }]
      : []),
    ...(can('canManageBoards')
      ? [{ label: 'Team', icon: Users, action: () => navigate('/teams?create=true') }]
      : []),
    ...(isAdmin || isManager
      ? [{ label: 'Invite User', icon: Mail, action: () => setInviteOpen(true) }]
      : []),
  ];

  if (items.length === 0) return null;

  const dropdownClass = collapsed
    ? 'absolute left-full ml-2 top-0 w-56'
    : 'absolute right-0 top-full mt-2 w-56';

  return (
    <>
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(o => !o)}
          className={`flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium
            ${collapsed ? 'w-9 h-9 justify-center p-0' : 'w-full px-3 py-2'}`}
        >
          <Plus className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Create</span>}
        </button>
        {open && (
          <div className={`${dropdownClass} bg-popover border rounded-xl shadow-lg z-50 p-1.5`}>
            <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Create New</p>
            {items.map(item => (
              <button
                key={item.label}
                onClick={() => { item.action(); setOpen(false); }}
                className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-muted transition-colors text-sm w-full text-left"
              >
                <item.icon className="w-4 h-4 text-muted-foreground" />
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <WorkspaceFormDialog open={workspaceOpen} onClose={() => setWorkspaceOpen(false)} />
      <InviteUserDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </>
  );
}