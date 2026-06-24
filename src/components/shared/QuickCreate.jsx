import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FolderKanban, CheckSquare, Building2, FileText, Users, Workflow, LayoutGrid } from 'lucide-react';

const ITEMS = [
  { label: 'Project', icon: FolderKanban, path: '/projects' },
  { label: 'Task', icon: CheckSquare, path: '/tasks/board' },
  { label: 'Client', icon: Building2, path: '/clients' },
  { label: 'Document', icon: FileText, path: '/documents' },
  { label: 'Team', icon: Users, path: '/teams' },
  { label: 'Process', icon: Workflow, path: '/processes' },
  { label: 'Workboard', icon: LayoutGrid, path: '/workboards' },
];

export default function QuickCreate() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
      >
        <Plus className="w-4 h-4" />
        <span className="hidden sm:inline">Quick Create</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-popover border rounded-xl shadow-lg z-50 p-1.5">
          <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Create New</p>
          {ITEMS.map(item => (
            <Link
              key={item.label}
              to={item.path}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-muted transition-colors text-sm"
            >
              <item.icon className="w-4 h-4 text-muted-foreground" />
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}