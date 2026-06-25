import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Activity, MessageSquare, File, Tag, User, Calendar, CheckCircle } from 'lucide-react';
import UserAvatar from '@/components/shared/UserAvatar';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';

export default function WorkboardUpdates({ boardId }) {
  const { currentWorkspaceId } = useWorkspace();
  const { toast } = useToast();
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [users, setUsers] = useState([]);

  useEffect(() => {
    loadUpdates();
    loadUsers();
  }, [boardId]);

  const loadUpdates = async () => {
    if (!boardId) return;
    setLoading(true);
    try {
      const [comments, activities] = await Promise.all([
        base44.entities.Comment.filter({ workboard: boardId, deleted: false }, '-created_date', 50).catch(() => []),
        base44.entities.Activity.filter({ workspace: currentWorkspaceId, record_type: 'WorkboardItem' }, '-created_date', 50).catch(() => []),
      ]);

      const combined = [
        ...comments.map(c => ({ ...c, type: 'comment' })),
        ...activities.map(a => ({ ...a, type: 'activity' })),
      ].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

      setUpdates(combined.slice(0, 50));
    } catch (error) {
      console.error('Error loading updates:', error);
      toast({ title: 'Failed to load updates', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const u = await base44.entities.User.list();
      setUsers(u);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const filteredUpdates = updates.filter(update => {
    if (filterType !== 'all' && update.type !== filterType) return false;
    if (filterUser !== 'all' && update.user !== filterUser) return false;
    return true;
  });

  const formatTimestamp = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
  };

  const getActionIcon = (type, action) => {
    if (type === 'comment') return MessageSquare;
    if (action?.includes('status')) return Tag;
    if (action?.includes('priority')) return Tag;
    if (action?.includes('owner') || action?.includes('assignee')) return User;
    if (action?.includes('due_date')) return Calendar;
    if (action?.includes('created')) return CheckCircle;
    return Activity;
  };

  const renderUpdate = (update) => {
    const Icon = getActionIcon(update.type, update.action);
    
    return (
      <div key={update.id} className="flex gap-3 p-3 border rounded-lg hover:bg-muted/50">
        <UserAvatar userId={update.user} users={users} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">{update.user_name || 'User'}</span>
            <span className="text-xs text-muted-foreground">{formatTimestamp(update.created_date)}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-muted">{update.type === 'comment' ? 'Comment' : 'Activity'}</span>
          </div>
          {update.type === 'comment' ? (
            <p className="text-sm text-foreground whitespace-pre-wrap">{update.body}</p>
          ) : (
            <p className="text-sm text-foreground">
              <span className="font-medium">{update.action || 'Updated'}</span>
              {update.record_name && <span> — {update.record_name}</span>}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Board Updates" subtitle="Recent collaboration activity" />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="comment">Comments</SelectItem>
            <SelectItem value="activity">Activity</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterUser} onValueChange={setFilterUser}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by user" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            {users.map(u => (
              <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Updates List */}
      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-8">Loading...</p>
      ) : filteredUpdates.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No updates yet"
          description="Activity will appear here as team members collaborate"
        />
      ) : (
        <div className="space-y-3">
          {filteredUpdates.map(renderUpdate)}
        </div>
      )}
    </div>
  );
}