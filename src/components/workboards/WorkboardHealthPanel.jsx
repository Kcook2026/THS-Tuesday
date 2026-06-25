import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { runWorkboardHealthCheck, fixOrphanedBoard, fixStaleMembership } from '@/lib/workboardHealth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Shield, AlertTriangle, CheckCircle, RefreshCw, Activity } from 'lucide-react';
import { useWorkspace } from '@/lib/WorkspaceContext';
import usePermissions from '@/hooks/usePermissions';

export default function WorkboardHealthPanel() {
  const { currentWorkspaceId } = useWorkspace();
  const { isSystemAdmin } = usePermissions();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [healthData, setHealthData] = useState(null);

  const runCheck = async () => {
    if (!currentWorkspaceId) return;
    setLoading(true);
    try {
      const result = await runWorkboardHealthCheck(currentWorkspaceId);
      setHealthData(result);
      toast({ 
        title: result.status === 'success' ? 'Health check complete' : 'Health check failed',
        description: result.status === 'success' 
          ? `Found ${Object.values(result.summary || {}).reduce((a, b) => a + b, 0)} issues`
          : result.error,
        variant: result.status === 'success' ? 'default' : 'destructive',
        duration: 4000,
      });
    } catch (error) {
      toast({ title: 'Health check failed', description: error.message, variant: 'destructive', duration: 6000 });
    } finally {
      setLoading(false);
    }
  };

  const handleFixOrphan = async (boardId) => {
    const me = await base44.auth.me().catch(() => null);
    const result = await fixOrphanedBoard(boardId, me);
    if (result.status === 'fixed') {
      toast({ title: 'Board fixed', description: `Board ${boardId} assigned to you`, duration: 3000 });
      runCheck();
    } else {
      toast({ title: 'Fix failed', description: result.error, variant: 'destructive', duration: 5000 });
    }
  };

  const handleFixMembership = async (membershipId) => {
    const result = await fixStaleMembership(membershipId);
    if (result.status === 'fixed') {
      toast({ title: 'Membership cleaned', duration: 3000 });
      runCheck();
    } else {
      toast({ title: 'Fix failed', description: result.error, variant: 'destructive', duration: 5000 });
    }
  };

  if (!isSystemAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Workboard Health Check
          </CardTitle>
          <CardDescription>Admin-only diagnostic tool</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Only System Administrators can access this tool.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Workboard Health Check
        </CardTitle>
        <CardDescription>Diagnose and fix data integrity issues</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Button onClick={runCheck} disabled={loading} className="gap-2">
          <Activity className="w-4 h-4" />
          {loading ? 'Running...' : 'Run Health Check'}
        </Button>

        {healthData && healthData.status === 'success' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatBadge label="Orphaned Boards" value={healthData.summary.totalOrphanedBoards} icon={AlertTriangle} color="text-amber-600" />
              <StatBadge label="Missing Owner" value={healthData.summary.totalBoardsWithoutOwner} icon={AlertTriangle} color="text-red-600" />
              <StatBadge label="Stale Memberships" value={healthData.summary.totalStaleMemberships} icon={RefreshCw} color="text-blue-600" />
              <StatBadge label="Duplicate Columns" value={healthData.summary.totalDuplicateSystemColumns} icon={AlertTriangle} color="text-orange-600" />
            </div>

            {healthData.issues.orphanedBoards.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Orphaned Boards
                </h4>
                <div className="space-y-2">
                  {healthData.issues.orphanedBoards.map(issue => (
                    <IssueRow key={issue.id} issue={issue} onFix={() => handleFixOrphan(issue.id)} />
                  ))}
                </div>
              </div>
            )}

            {healthData.issues.staleMemberships.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-blue-600" />
                  Stale Memberships
                </h4>
                <div className="space-y-2">
                  {healthData.issues.staleMemberships.map(issue => (
                    <IssueRow key={issue.id} issue={issue} onFix={() => handleFixMembership(issue.id)} />
                  ))}
                </div>
              </div>
            )}

            {Object.values(healthData.issues).every(arr => arr.length === 0) && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <p className="text-sm font-medium">No issues found. Your workboards are healthy!</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StatBadge({ label, value, icon: Icon, color }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </CardContent>
    </Card>
  );
}

function IssueRow({ issue, onFix }) {
  return (
    <div className="flex items-center justify-between p-2 border rounded-lg bg-muted/30">
      <div className="text-sm">
        <p className="font-medium">{issue.name || issue.id}</p>
        {issue.reason && <p className="text-xs text-muted-foreground">{issue.reason}</p>}
      </div>
      {onFix && (
        <Button size="sm" variant="outline" onClick={onFix}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Fix
        </Button>
      )}
    </div>
  );
}