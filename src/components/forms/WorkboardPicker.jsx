import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, LayoutGrid, Check } from 'lucide-react';

const BOARD_TYPE_LABELS = {
  project_board: 'Project',
  task_board: 'Task',
  process_board: 'Process',
  operations_board: 'Operations',
  planning_board: 'Planning',
  team_board: 'Team',
};

export default function WorkboardPicker({ workspaceId, value, onPick, onClose }) {
  const [search, setSearch] = useState('');
  const [workboards, setWorkboards] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const [boards, allUsers] = await Promise.all([
        base44.entities.Workboard.filter({ workspace: workspaceId }),
        base44.entities.User.list().catch(() => []),
      ]);
      setWorkboards(boards.filter(b => b.status === 'active' && !b.archived));
      setUsers(allUsers);
    } catch {
      setWorkboards([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);

  const getUser = (id) => users.find(u => u.id === id);

  const filtered = workboards.filter(wb => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const owner = getUser(wb.owner);
    return (
      wb.name?.toLowerCase().includes(q) ||
      (owner?.full_name || '').toLowerCase().includes(q) ||
      (BOARD_TYPE_LABELS[wb.board_type] || '').toLowerCase().includes(q)
    );
  });

  const sorted = search.trim()
    ? filtered
    : [...filtered].sort((a, b) =>
        new Date(b.updated_date || b.created_date) - new Date(a.updated_date || a.created_date)
      );

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by board name, owner, type..."
          className="pl-9"
          autoFocus
        />
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Loading workboards...</div>
      ) : sorted.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          {search.trim() ? 'No workboards match your search.' : 'No active workboards found.'}
        </div>
      ) : (
        <div className="max-h-72 overflow-y-auto space-y-1">
          {sorted.map(wb => {
            const owner = getUser(wb.owner);
            const isSelected = value === wb.id;
            return (
              <button
                key={wb.id}
                onClick={() => { onPick(wb); onClose?.(); }}
                className={`w-full flex items-center gap-2 rounded-lg border p-2.5 hover:bg-accent transition-colors text-left ${isSelected ? 'border-primary ring-1 ring-primary/30' : ''}`}
              >
                <LayoutGrid className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{wb.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {wb.board_type && (
                      <Badge variant="secondary" className="text-[10px] py-0">
                        {BOARD_TYPE_LABELS[wb.board_type] || wb.board_type}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">{owner?.full_name || 'No owner'}</span>
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}