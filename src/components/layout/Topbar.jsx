import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Menu, ChevronRight } from 'lucide-react';
import { useWorkspace } from '@/lib/WorkspaceContext';

const ROUTE_MAP = {
  '/': { label: 'Home', parent: null },
  '/my-work': { label: 'My Work', parent: null },
  '/workboards': { label: 'Workboards', parent: null },
  '/projects': { label: 'Projects', parent: '/workboards' },
  '/tasks/table': { label: 'Tasks', parent: '/workboards' },
  '/tasks/board': { label: 'Board', parent: '/tasks/table' },
  '/calendar': { label: 'Calendar', parent: '/workboards' },
  '/teams': { label: 'Teams', parent: null },
  '/activity': { label: 'Activity', parent: null },
  '/members': { label: 'Members', parent: null },
  '/workspace-settings': { label: 'Settings', parent: null },
  '/notifications': { label: 'Notifications', parent: null },
};

function getBreadcrumb(pathname) {
  const entries = [];
  let current = pathname;

  if (current.startsWith('/workboards/')) {
    entries.push({ label: 'Workboards', path: '/workboards' });
    entries.push({ label: 'Board' });
    return entries;
  }
  if (current.startsWith('/processes/')) {
    entries.push({ label: 'SOPs', path: '/processes' });
    entries.push({ label: 'SOP' });
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

export default function Topbar({ onMobileMenuClick }) {
  const location = useLocation();
  const { currentWorkspace } = useWorkspace();

  const breadcrumbs = getBreadcrumb(location.pathname);

  return (
    <header className="sticky top-0 z-20 h-10 border-b bg-background/80 backdrop-blur-sm flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <button
          onClick={onMobileMenuClick}
          className="lg:hidden p-1.5 rounded-md hover:bg-accent transition-colors shrink-0"
        >
          <Menu className="w-4 h-4" />
        </button>
        {breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1 min-w-0">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/40 shrink-0" />}
                {crumb.path ? (
                  <Link to={crumb.path} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors truncate max-w-[180px]">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-[11px] font-medium text-foreground truncate max-w-[180px]">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
      </div>
      {currentWorkspace && (
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted/40 shrink-0">
          <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[150px]">
            {currentWorkspace.workspace_name}
          </span>
        </div>
      )}
    </header>
  );
}