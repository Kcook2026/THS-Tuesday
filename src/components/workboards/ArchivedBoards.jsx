import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useConfirm } from '@/components/shared/ConfirmDialog';
import usePermissions from '@/hooks/usePermissions';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import EmptyState from '@/components/shared/EmptyState';
import { Archive, RotateCcw, Trash2, ArchiveX, UserPlus, AlertTriangle } from 'lucide-react';
import { getArchivedWorkboards } from '@/lib/workboardHelpers';
import { isOrphanedBoard, safeDeleteBoardData, assignBoardToMe } from '@/lib/boardLifecycle';

export default function ArchivedBoards({ workspaceId, onRefresh, compact = false }) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const { isSystemAdmin } = usePermissions();
  const [boards, setBoards] = useState([]);
  const [wbMembers, setWbMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const [all, members, users] = await Promise.all([
        base44.entities.Workboard.filter({ workspace: workspaceId }).catch(() => []),
        base44.entities.WorkboardMember.filter({ workspace: workspaceId }).catch(() => []),
        base44.entities.User.list().catch(() => []),
      ]);
      const archived = getArchivedWorkboards(all, workspaceId);
      setBoards(archived);
      setWbMembers(members);
      setAllUsers(users);
    } catch (e) {
      console.error('ArchivedBoards load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [workspaceId]);

  const handleRestore = async (board) => {
    const ok = await confirm({
      title: 'Restore Board?',
      message: `Restore "${board.name}" to active workboards?`,
      confirmLabel: 'Restore',
    });
    if (!ok) return;
    setActionLoading(true);
    try {
      await base44.entities.Workboard.update(board.id, {
        status: 'active',
        archived: false,
        archived_date: null,
        archived_by: null,
      });
      toast({ title: 'Board restored', duration: 3000 });
      await load();
      onRefresh?.();
      window.dispatchEvent(new Event('workboards-changed'));
    } catch (e) {
      toast({ title: 'Failed to restore board', description: e.message, variant: 'destructive', duration: 6000 });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignToMe = async (board) => {
    setActionLoading(true);
    try {
      const me = await base44.auth.me().catch(() => null);
      await assignBoardToMe(board.id, workspaceId, me);
      toast({ title: 'Board assigned to you', duration: 3000 });
      await load();
      onRefresh?.();
      window.dispatchEvent(new Event('workboards-changed'));
    } catch (e) {
      toast({ title: 'Failed to assign board', description: e.message, variant: 'destructive', duration: 6000 });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePermanentDelete = async (board) => {
    const ok = await confirm({
      title: 'Permanently Delete Board?',
      message: `This will permanently delete "${board.name}" and ALL related items, groups, columns, statuses, priorities, and memberships. This cannot be undone.`,
      confirmLabel: 'Delete Permanently',
      requireText: board.name,
      variant: 'destructive',
    });
    if (!ok) return;
    setActionLoading(true);
    try {
      await safeDeleteBoardData(board.id);
      const me = await base44.auth.me().catch(() => null);
      await base44.entities.Workboard.update(board.id, {
        status: 'deleted',
        deleted_date: new Date().toISOString(),
        deleted_by: me?.id,
      });
      toast({ title: 'Board permanently deleted', duration: 3000 });
      await load();
      onRefresh?.();
      window.dispatchEvent(new Event('workboards-changed'));
    } catch (e) {
      toast({ title: 'Failed to delete board', description: e.message, variant: 'destructive', duration: 6000 });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (boards.length === 0) {
    return <EmptyState icon={ArchiveX} title="No archived boards" description="Archived boards will appear here for restore or permanent deletion." />;
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {boards.map(b => (
            <div key={b.id} className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Archive className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate flex items-center gap-2">
                  {b.name}
                  {isSystemAdmin && isOrphanedBoard(b, wbMembers.filter(m => m.workboard === b.id), allUsers) && (
                    <Badge variant="destructive" className="text-[10px] gap-1"><AlertTriangle className="w-3 h-3" /> Orphaned</Badge>
                  )}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  {b.archived_date && <span>Archived {new Date(b.archived_date).toLocaleDateString()}</span>}
                  {b.board_type && <Badge variant="outline" className="text-[10px]">{b.board_type.replace(/_/g, ' ')}</Badge>}
                </div>
              </div>
              {isSystemAdmin && isOrphanedBoard(b, wbMembers.filter(m => m.workboard === b.id), allUsers) && (
                <Button variant="outline" size="sm" onClick={() => handleAssignToMe(b)} disabled={actionLoading}>
                  <UserPlus className="w-3.5 h-3.5 mr-1" /> Assign to Me
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => handleRestore(b)} disabled={actionLoading}>
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Restore
              </Button>
              {isSystemAdmin && (
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handlePermanentDelete(b)} disabled={actionLoading}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}