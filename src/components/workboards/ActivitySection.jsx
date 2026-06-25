import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Activity as ActivityIcon } from 'lucide-react';
import UserAvatar from '@/components/shared/UserAvatar';

export default function ActivitySection({ item, boardId, workspaceId, users }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, [item?.id]);

  const loadActivities = async () => {
    if (!item?.id) return;
    setLoading(true);
    try {
      const activityList = await base44.entities.Activity.filter({
        record_type: 'WorkboardItem',
        record_id: item.id,
        workspace: workspaceId,
      }, '-created_date', 50);
      setActivities(activityList || []);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatAction = (activity) => {
    const action = activity.action || '';
    const before = activity.before_value;
    const after = activity.after_value;

    if (action.includes('created')) return 'created this item';
    if (action.includes('title') && action.includes('changed')) return `changed title from "${before}" to "${after}"`;
    if (action.includes('status') && action.includes('changed')) return `changed status from "${before}" to "${after}"`;
    if (action.includes('priority') && action.includes('changed')) return `changed priority from "${before}" to "${after}"`;
    if (action.includes('owner') && action.includes('changed')) return `changed owner from "${before}" to "${after}"`;
    if (action.includes('assignee') && action.includes('changed')) return `changed assignee from "${before}" to "${after}"`;
    if (action.includes('due_date') && action.includes('changed')) return `changed due date from "${before || 'none'}" to "${after || 'none'}"`;
    if (action.includes('progress') && action.includes('changed')) return `changed progress from ${before}% to ${after}%`;
    if (action.includes('sub-item') && action.includes('added')) return 'added a sub-item';
    if (action.includes('comment') && action.includes('added')) return 'added a comment';
    if (action.includes('file') && action.includes('uploaded')) return 'uploaded a file';
    if (action.includes('watcher') && action.includes('added')) return 'added a watcher';
    return action || 'Updated item';
  };

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
    return d.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return <p className="text-center text-sm text-muted-foreground py-8">Loading...</p>;
  }

  return (
    <div className="space-y-3">
      {activities.length === 0 ? (
        <div className="text-center py-8">
          <ActivityIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No activity yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Changes to this item will appear here</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {activities.map(activity => (
            <div key={activity.id} className="flex gap-3 p-3 border rounded-lg bg-muted/30">
              <UserAvatar userId={activity.user} users={users} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{activity.user_name || 'User'}</span>
                  <span className="text-xs text-muted-foreground">{formatTimestamp(activity.created_date)}</span>
                </div>
                <p className="text-sm text-foreground">{formatAction(activity)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}