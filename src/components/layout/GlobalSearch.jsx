import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Hash, FolderKanban, CheckSquare, LayoutGrid, FileText, Building2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/lib/WorkspaceContext';
import {
  Dialog, DialogContent,
} from '@/components/ui/dialog';

const QUICK_LINKS = [
  { label: 'Home', path: '/', icon: Hash },
  { label: 'My Work', path: '/my-work', icon: CheckSquare },
  { label: 'Workboards', path: '/workboards', icon: LayoutGrid },
  { label: 'Projects', path: '/projects', icon: FolderKanban },
  { label: 'Tasks', path: '/tasks/table', icon: CheckSquare },
  { label: 'Clients', path: '/clients', icon: Building2 },
  { label: 'Documents', path: '/documents', icon: FileText },
];

export default function GlobalSearch({ open, onOpenChange }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { currentWorkspaceId } = useWorkspace();
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim() || !currentWorkspaceId) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function search() {
      try {
        const wsFilter = { workspace: currentWorkspaceId };
        const [boards, projects, tasks] = await Promise.all([
          base44.entities.Workboard.filter(wsFilter, '-updated_date', 5).catch(() => []),
          base44.entities.Project.filter(wsFilter, '-updated_date', 5).catch(() => []),
          base44.entities.Task.filter(wsFilter, '-updated_date', 5).catch(() => []),
        ]);

        if (cancelled) return;

        const q = query.toLowerCase();
        const filtered = [
          ...boards.filter(b => b.name?.toLowerCase().includes(q)).map(b => ({
            type: 'Workboard', label: b.name, path: `/workboards/${b.id}`, icon: LayoutGrid,
          })),
          ...projects.filter(p => p.project_name?.toLowerCase().includes(q)).map(p => ({
            type: 'Project', label: p.project_name, path: '/projects', icon: FolderKanban,
          })),
          ...tasks.filter(t => t.title?.toLowerCase().includes(q)).map(t => ({
            type: 'Task', label: t.title, path: '/tasks/table', icon: CheckSquare,
          })),
        ];
        setResults(filtered.slice(0, 8));
      } catch (e) {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    const debounce = setTimeout(search, 250);
    return () => { cancelled = true; clearTimeout(debounce); };
  }, [query, currentWorkspaceId]);

  const handleSelect = (path) => {
    onOpenChange(false);
    navigate(path);
  };

  const filteredLinks = query.trim()
    ? QUICK_LINKS.filter(l => l.label.toLowerCase().includes(query.toLowerCase()))
    : QUICK_LINKS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-2xl top-[15%] translate-y-0">
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search workboards, projects, tasks..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-[400px] overflow-y-auto p-2">
          {loading && (
            <div className="py-6 text-center text-sm text-muted-foreground">Searching...</div>
          )}
          {!loading && results.length > 0 && (
            <>
              <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Results</p>
              {results.map((r, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(r.path)}
                  className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-accent transition-colors text-left"
                >
                  <r.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm flex-1 truncate">{r.label}</span>
                  <span className="text-[10px] text-muted-foreground">{r.type}</span>
                </button>
              ))}
            </>
          )}
          {!loading && filteredLinks.length > 0 && (results.length === 0 || !query.trim()) && (
            <>
              <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Quick Links</p>
              {filteredLinks.map(link => (
                <button
                  key={link.path}
                  onClick={() => handleSelect(link.path)}
                  className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-accent transition-colors text-left"
                >
                  <link.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">{link.label}</span>
                </button>
              ))}
            </>
          )}
          {!loading && results.length === 0 && filteredLinks.length === 0 && query.trim() && (
            <div className="py-6 text-center text-sm text-muted-foreground">No results found</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}