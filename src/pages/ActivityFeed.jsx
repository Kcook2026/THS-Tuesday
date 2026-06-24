import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Activity, FolderKanban, CheckSquare, Users, Building2, FileText, Workflow, LayoutGrid } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

const ICONS = {
  Project: FolderKanban,
  Task: CheckSquare,
  Team: Users,
  Client: Building2,
  Document: FileText,
  Process: Workflow,
  Workboard: LayoutGrid,
};

const RECORD_TYPES = ['Project', 'Task', 'Team', 'Client', 'Document', 'Process', 'Workboard'];

export default function ActivityFeed() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userFilter, setUserFilter] = useState('all');
  const [recordTypeFilter, setRecordTypeFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [users, setUsers] = useState([]);
  const { currentWorkspaceId } = useWorkspace();

  useEffect(() => {
    if (!currentWorkspaceId) return;
    Promise.all([
      base44.entities.Activity.filter({ workspace: currentWorkspaceId }, '-created_date', 100),
      base44.entities.User.list(),
    ]).then(([a, u]) => {
      setActivities(a);
      setUsers(u);
    }).finally(() => setLoading(false));
  }, [currentWorkspaceId]);

  if (loading) return <LoadingSpinner />;

  const userMap = Object.fromEntries(users.map(u => [u.id, u.full_name]));
  const uniqueActions = [...new Set(activities.map(a => a.action))].filter(Boolean).sort();

  const filtered = activities.filter(a => {
    if (userFilter !== 'all' && a.user !== userFilter) return false;
    if (recordTypeFilter !== 'all' && a.record_type !== recordTypeFilter) return false;
    if (actionFilter !== 'all' && a.action !== actionFilter) return false;
    if (dateFrom && new Date(a.created_date) < new Date(dateFrom)) return false;
    return true;
  });

  return (
    <div>
      <PageHeader title="Activity" subtitle="Recent updates and changes across the workspace" />

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">User</Label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Record Type</Label>
              <Select value={recordTypeFilter} onValueChange={setRecordTypeFilter}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {RECORD_TYPES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Action</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {uniqueActions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">From Date</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState icon={Activity} title="No activity found" description="Try adjusting your filters" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filtered.map(a => {
                const Icon = ICONS[a.record_type] || Activity;
                return (
                  <div key={a.id} className="flex items-start gap-4 px-5 py-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-semibold">{a.user_name || userMap[a.user] || 'Unknown'}</span>{' '}
                        <span className="text-muted-foreground">{a.action}</span>{' '}
                        {a.record_name && <span className="font-medium">{a.record_name}</span>}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{a.record_type || 'Unknown'}</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{new Date(a.created_date).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}