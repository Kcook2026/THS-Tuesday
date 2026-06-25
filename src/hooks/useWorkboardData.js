import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import {
  sortGroups,
  sortItems,
  sortStatusOptions,
  sortPriorityOptions,
  sortColumns,
} from '@/lib/workboardService';

export function useWorkboardData(boardId, workspaceId) {
  const [board, setBoard] = useState(null);
  const [items, setItems] = useState([]);
  const [groups, setGroups] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [priorityOptions, setPriorityOptions] = useState([]);
  const [columns, setColumns] = useState([]);
  const [teams, setTeams] = useState([]);
  const [boardMembers, setBoardMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const isLoadingRef = useRef(false);

  const load = useCallback(async () => {
    if (!boardId || isLoadingRef.current) return;
    isLoadingRef.current = true;
    setLoading(true);

    try {
      const [b, g, s, p, i, cols, t, bm] = await Promise.all([
        base44.entities.Workboard.get(boardId),
        base44.entities.BoardGroup.filter({ workboard: boardId, archived: false }),
        base44.entities.StatusOption.filter({ workboard: boardId }),
        base44.entities.PriorityOption.filter({ workboard: boardId }),
        base44.entities.WorkboardItem.filter({ workspace: workspaceId, workboard: boardId, archived: false }),
        base44.entities.BoardColumn.filter({ workboard: boardId }).catch(() => []),
        base44.entities.Team.filter({ workspace: workspaceId }).catch(() => []),
        base44.entities.WorkboardMember.filter({ workboard: boardId }).catch(() => []),
      ]);

      setBoard(b);
      setGroups(sortGroups(g));
      setStatusOptions(sortStatusOptions(s));
      setPriorityOptions(sortPriorityOptions(p));
      setItems(i);
      setColumns(sortColumns(cols));
      setTeams(t);
      setBoardMembers(bm);
    } catch (error) {
      console.error('Error loading board data:', error);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [boardId, workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!boardId) return;
    const unsubscribe = base44.entities.WorkboardItem.subscribe((event) => {
      if (event.type === 'create' && event.data && event.data.workboard === boardId) {
        setItems(prev => prev.some(item => item.id === event.data.id) ? prev : [...prev, event.data]);
      } else if (event.type === 'update' && event.data && event.data.workboard === boardId) {
        setItems(prev => prev.map(it => it.id === event.data.id ? { ...it, ...event.data } : it));
      } else if (event.type === 'delete') {
        setItems(prev => prev.filter(it => it.id !== event.entity_id));
      }
    });
    return () => unsubscribe();
  }, [boardId]);

  return {
    board,
    items,
    groups,
    statusOptions,
    priorityOptions,
    columns,
    teams,
    boardMembers,
    loading,
    reload: load,
    setBoard,
    setItems,
    setGroups,
    setStatusOptions,
    setPriorityOptions,
    setColumns,
  };
}