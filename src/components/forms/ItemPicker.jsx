import React, { useState, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export default function ItemPicker({ workboardId, onPick, onClose }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [filterGroup, setFilterGroup] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    if (!workboardId) return;
    Promise.all([
      base44.entities.BoardGroup.filter({ workboard: workboardId }).catch(() => []),
      base44.entities.User.list().catch(() => []),
    ]).then(([g, u]) => {
      setGroups(g);
      setUsers(u);
    });
  }, [workboardId]);

  const searchItems = useCallback(async (q) => {
    if (!workboardId) return;
    setLoading(true);
    try {
      const items = await base44.entities.WorkboardItem.filter({ workboard: workboardId }, '-updated_date', 50);
      let filtered = items.filter(i => !i.archived);

      if (q.trim()) {
        const ql = q.toLowerCase();
        filtered = filtered.filter(i =>
          i.title?.toLowerCase().includes(ql) ||
          (i.description || '').toLowerCase().includes(ql)
        );
      }

      if (filterGroup) {
        filtered = filtered.filter(i => i.group === filterGroup);
      }
      if (filterStatus) {
        filtered = filtered.filter(i => i.status === filterStatus);
      }

      // Sort by recently updated
      filtered.sort((a, b) => new Date(b.updated_date || b.created_date) - new Date(a.updated_date || a.created_date));
      setResults(filtered.slice(0, 30));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [workboardId, filterGroup, filterStatus]);

  useEffect(() => {
    const debounce = setTimeout(() => searchItems(search), 250);
    return () => clearTimeout(debounce);
  }, [search, searchItems]);

  const getUser = (id) => users.find(u => u.id === id);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by item name, owner, status..."
          className="pl-9"
          autoFocus
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        <select
          value={filterGroup}
          onChange={e => setFilterGroup(e.target.value)}
          className="text-xs rounded-md border border-input bg-transparent px-2 py-1"
        >
          <option value="">All Groups</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Searching...</div>
      ) : results.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">No items found</div>
      ) : (
        <div className="max-h-80 overflow-y-auto space-y-1">
          {results.map(item => (
            <button
              key={item.id}
              onClick={() => onPick(item)}
              className="w-full flex items-center gap-2 rounded-lg border p-2.5 hover:bg-accent transition-colors text-left"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {item.status && <Badge variant="secondary" className="text-[10px] py-0">{item.status}</Badge>}
                  <span className="text-xs text-muted-foreground">
                    {getUser(item.owner)?.full_name || 'Unassigned'}
                  </span>
                </div>
              </div>
              <Check className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}