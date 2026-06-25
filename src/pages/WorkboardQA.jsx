import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/lib/WorkspaceContext';
import usePermissions from '@/hooks/usePermissions';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { SYSTEM_COLUMN_NAMES } from '@/components/workboards/WorkboardConstants';
import {
  ShieldCheck, Trash2, RefreshCw, AlertTriangle, CheckCircle2,
  LayoutGrid, Columns3, Users as UsersIcon, ListChecks,
} from 'lucide-react';

export default function WorkboardQA() {
  const { currentWorkspaceId } = useWorkspace();
  const { isSystemAdmin, loading: permLoading } = usePermissions();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);

  const runDiagnostics = useCallback(async () => {
    if (!currentWorkspaceId) return;
    setLoading(true);
    try {
      const [boards, allColumns, allMembers, allItems, allValues] = await Promise.all([
        base44.entities.Workboard.filter({ workspace: currentWorkspaceId }).catch(() => []),
        base44.entities.BoardColumn.filter({ workspace: currentWorkspaceId }).catch(() => []),
        base44.entities.WorkboardMember.filter({ workspace: currentWorkspaceId }).catch(() => []),
        base44.entities.WorkboardItem.filter({ workspace: currentWorkspaceId }).catch(() => []),
        base44.entities.WorkboardItemValue.filter({ workspace: currentWorkspaceId }).catch(() => []),
      ]);

      const activeBoards = boards.filter(b => !b.archived && b.status !== 'archived' && b.status !== 'template');
      const archivedBoards = boards.filter(b => b.archived || b.status === 'archived');
      const activeBoardIds = new Set(activeBoards.map(b => b.id));
      const allBoardIds = new Set(boards.map(b => b.id));
      const allUserIds = new Set((await base44.entities.User.list().catch(() => [])).map(u => u.id));

      // Duplicate system columns: BoardColumn records whose name matches a system column
      const duplicateSystemColumns = allColumns.filter(c =>
        SYSTEM_COLUMN_NAMES.includes((c.name || '').toLowerCase())
      );

      // Stale memberships: board doesn't exist, is archived/template, or user doesn't exist
      const staleMembers = allMembers.filter(wm =>
        !activeBoardIds.has(wm.workboard) || !allUserIds.has(wm.user)
      );

      // Duplicate memberships: same user + same board appearing more than once
      const seenPairs = new Set();
      const duplicateMembers = [];
      const sortedMembers = [...allMembers].sort((a, b) => (a.created_date || '').localeCompare(b.created_date || ''));
      for (const wm of sortedMembers) {
        const key = `${wm.user}::${wm.workboard}`;
        if (seenPairs.has(key)) duplicateMembers.push(wm);
        else seenPairs.add(key);
      }

      // Custom columns without any values
      const columnsWithValueIds = new Set(allValues.map(v => v.column));
      const columnsWithoutValues = allColumns.filter(c =>
        !SYSTEM_COLUMN_NAMES.includes((c.name || '').toLowerCase()) &&
        !columnsWithValueIds.has(c.id)
      );

      // Items without workspace, workboard, or group
      const itemsMissingLinks = allItems.filter(i =>
        !i.workspace || !i.workboard || !i.group
      );

      setDiagnostics({
        totalBoards: boards.length,
        activeBoards: activeBoards.length,
        archivedBoards: archivedBoards.length,
        totalColumns: allColumns.length,
        duplicateSystemColumns,
        totalMembers: allMembers.length,
        staleMembers,
        duplicateMembers,
        columnsWithoutValues,
        itemsMissingLinks,
        totalItems: allItems.length,
        totalValues: allValues.length,
      });
    } catch (error) {
      toast({ title: 'Diagnostics failed', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [currentWorkspaceId, toast]);

  useEffect(() => {
    if (isSystemAdmin) runDiagnostics();
  }, [isSystemAdmin, runDiagnostics]);

  const handleCleanDuplicateColumns = async () => {
    if (!diagnostics?.duplicateSystemColumns?.length) return;
    if (!confirm(`Delete ${diagnostics.duplicateSystemColumns.length} duplicate system column(s)?`)) return;
    setCleaning('columns');
    try {
      for (const col of diagnostics.duplicateSystemColumns) {
        await base44.entities.BoardColumn.delete(col.id);
      }
      toast({ title: `Deleted ${diagnostics.duplicateSystemColumns.length} duplicate column(s)`, duration: 3000 });
      await runDiagnostics();
    } catch (error) {
      toast({ title: 'Cleanup failed', description: error.message, variant: 'destructive' });
    } finally {
      setCleaning(null);
    }
  };

  const handleCleanStaleMemberships = async () => {
    const stale = [...(diagnostics?.staleMembers || []), ...(diagnostics?.duplicateMembers || [])];
    const unique = [...new Map(stale.map(wm => [wm.id, wm])).values()];
    if (!unique.length) return;
    if (!confirm(`Delete ${unique.length} stale/duplicate membership(s)?`)) return;
    setCleaning('members');
    try {
      for (const wm of unique) {
        await base44.entities.WorkboardMember.delete(wm.id);
      }
      toast({ title: `Deleted ${unique.length} stale/duplicate membership(s)`, duration: 3000 });
      await runDiagnostics();
    } catch (error) {
      toast({ title: 'Cleanup failed', description: error.message, variant: 'destructive' });
    } finally {
      setCleaning(null);
    }
  };

  if (permLoading || loading) return <LoadingSpinner />;
  if (!isSystemAdmin) {
    return (
      <div className="py-16 text-center">
        <ShieldCheck className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">This page is restricted to system admins.</p>
      </div>
    );
  }

  if (!diagnostics) return null;

  const d = diagnostics;

  return (
    <div className="space-y-6">
      <PageHeader title="Workboard QA" subtitle="Diagnostics and cleanup for workboard data integrity">
        <Button variant="outline" size="sm" onClick={runDiagnostics} disabled={loading}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </PageHeader>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={LayoutGrid} label="Total Boards" value={d.totalBoards} sub={`${d.activeBoards} active, ${d.archivedBoards} archived`} />
        <StatCard icon={Columns3} label="Board Columns" value={d.totalColumns} sub={`${d.duplicateSystemColumns.length} duplicates`} alert={d.duplicateSystemColumns.length > 0} />
        <StatCard icon={UsersIcon} label="Board Memberships" value={d.totalMembers} sub={`${d.staleMembers.length + d.duplicateMembers.length} stale`} alert={d.staleMembers.length + d.duplicateMembers.length > 0} />
        <StatCard icon={ListChecks} label="Items" value={d.totalItems} sub={`${d.itemsMissingLinks.length} missing links`} alert={d.itemsMissingLinks.length > 0} />
      </div>

      {/* Issues & Cleanup */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Duplicate System Columns */}
        <Card className={d.duplicateSystemColumns.length > 0 ? 'border-amber-300' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              {d.duplicateSystemColumns.length > 0 ? <AlertTriangle className="w-4 h-4 text-amber-500" /> : <CheckCircle2 className="w-4 h-4 text-green-500" />}
              Duplicate System Columns
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {d.duplicateSystemColumns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No duplicate system columns found.</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-3">
                  {d.duplicateSystemColumns.length} BoardColumn record(s) duplicate system column names and should be deleted.
                </p>
                <div className="space-y-1 mb-3 max-h-40 overflow-y-auto">
                  {d.duplicateSystemColumns.map(col => (
                    <div key={col.id} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-muted/50">
                      <span className="font-medium">{col.name}</span>
                      <Badge variant="outline" className="text-[10px]">{col.column_type}</Badge>
                    </div>
                  ))}
                </div>
                <Button size="sm" variant="destructive" onClick={handleCleanDuplicateColumns} disabled={cleaning === 'columns'}>
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  {cleaning === 'columns' ? 'Cleaning...' : `Delete ${d.duplicateSystemColumns.length} Duplicate(s)`}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Stale Memberships */}
        <Card className={d.staleMembers.length + d.duplicateMembers.length > 0 ? 'border-amber-300' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              {d.staleMembers.length + d.duplicateMembers.length > 0 ? <AlertTriangle className="w-4 h-4 text-amber-500" /> : <CheckCircle2 className="w-4 h-4 text-green-500" />}
              Stale / Duplicate Memberships
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {(d.staleMembers.length + d.duplicateMembers.length) === 0 ? (
              <p className="text-sm text-muted-foreground">No stale or duplicate memberships found.</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-3">
                  {d.staleMembers.length} stale (board archived/deleted or user removed), {d.duplicateMembers.length} duplicate(s).
                </p>
                <Button size="sm" variant="destructive" onClick={handleCleanStaleMemberships} disabled={cleaning === 'members'}>
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  {cleaning === 'members' ? 'Cleaning...' : `Clean ${d.staleMembers.length + d.duplicateMembers.length} Membership(s)`}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Columns Without Values */}
        <Card className={d.columnsWithoutValues.length > 0 ? 'border-amber-300' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              {d.columnsWithoutValues.length > 0 ? <AlertTriangle className="w-4 h-4 text-amber-500" /> : <CheckCircle2 className="w-4 h-4 text-green-500" />}
              Custom Columns Without Values
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {d.columnsWithoutValues.length === 0 ? (
              <p className="text-sm text-muted-foreground">All custom columns have at least one value.</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-3">
                  {d.columnsWithoutValues.length} custom column(s) have no item values stored yet.
                </p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {d.columnsWithoutValues.map(col => (
                    <div key={col.id} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-muted/50">
                      <span className="font-medium">{col.name}</span>
                      <Badge variant="outline" className="text-[10px]">{col.column_type}</Badge>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Items Missing Links */}
        <Card className={d.itemsMissingLinks.length > 0 ? 'border-amber-300' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              {d.itemsMissingLinks.length > 0 ? <AlertTriangle className="w-4 h-4 text-amber-500" /> : <CheckCircle2 className="w-4 h-4 text-green-500" />}
              Items Missing Workspace/Board/Group
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {d.itemsMissingLinks.length === 0 ? (
              <p className="text-sm text-muted-foreground">All items have proper workspace, board, and group links.</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-3">
                  {d.itemsMissingLinks.length} item(s) are missing workspace, workboard, or group references.
                </p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {d.itemsMissingLinks.slice(0, 20).map(item => (
                    <div key={item.id} className="text-xs px-2 py-1 rounded bg-muted/50 truncate">
                      <span className="font-medium">{item.title || 'Untitled'}</span>
                      <span className="text-muted-foreground ml-2">
                        {!item.workspace && ' [no workspace]'} {!item.workboard && ' [no board]'} {!item.group && ' [no group]'}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, alert }) {
  return (
    <Card className={alert ? 'border-amber-300' : ''}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`w-5 h-5 ${alert ? 'text-amber-500' : 'text-muted-foreground'}`} />
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
        </div>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className={`text-[10px] mt-1 ${alert ? 'text-amber-600' : 'text-muted-foreground'}`}>{sub}</p>}
      </CardContent>
    </Card>
  );
}