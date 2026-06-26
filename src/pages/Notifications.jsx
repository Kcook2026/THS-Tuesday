import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, CheckCheck, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

const ROUTE_MAP = {
  Task: '/tasks/table',
  Project: '/projects',
  Client: '/clients',
  Document: '/documents',
  Workboard: '/workboards',
  Process: '/processes',
};

const getNotificationRoute = (n) => {
  if (n.target_url) return n.target_url;
  if (n.record_type === 'WorkboardItem' && n.workboard && n.record_id) {
    const tab = n.type === 'mention' ? 'updates' : 'activity';
    return `/workboards/${n.workboard}?item=${n.record_id}&tab=${tab}`;
  }
  if (n.record_type && ROUTE_MAP[n.record_type]) {
    return ROUTE_MAP[n.record_type];
  }
  return null;
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const navigate = useNavigate();

  const load = () => {
    if (!currentUserId) return;
    setLoading(true);
    base44.entities.Notification.filter({ recipient: currentUserId }, '-created_date', 50)
      .then(setNotifications)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    base44.auth.me().then(me => {
      if (me?.id) {
        setCurrentUserId(me.id);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    load();
  }, [currentUserId]);

  const markRead = async (n) => {
    if (!n.read_status) {
      await base44.entities.Notification.update(n.id, { read_status: true, read_date: new Date().toISOString() });
      load();
    }
    const route = getNotificationRoute(n);
    if (route) navigate(route);
  };

  const markAllRead = async () => {
    const unreadNotifs = notifications.filter(n => !n.read_status);
    if (unreadNotifs.length === 0) return;
    await base44.entities.Notification.bulkUpdate(
      unreadNotifs.map(n => ({ id: n.id, read_status: true, read_date: new Date().toISOString() }))
    );
    load();
  };

  const deleteNotification = async (n) => {
    await base44.entities.Notification.delete(n.id);
    load();
  };

  const clearAllRead = async () => {
    const readIds = notifications.filter(n => n.read_status).map(n => n.id);
    if (readIds.length === 0) return;
    await base44.entities.Notification.deleteMany({ id: { $in: readIds } });
    load();
  };

  if (loading) return <LoadingSpinner />;

  const unread = notifications.filter(n => !n.read_status).length;
  const readCount = notifications.length - unread;

  return (
    <div>
      <PageHeader title="Notifications" subtitle={`${unread} unread of ${notifications.length} total`}>
        <div className="flex gap-2">
          {readCount > 0 && (
            <Button variant="outline" onClick={clearAllRead}>
              <X className="w-4 h-4 mr-1.5" /> Clear read ({readCount})
            </Button>
          )}
          <Button variant="outline" onClick={markAllRead} disabled={unread === 0}>
            <CheckCheck className="w-4 h-4 mr-1.5" /> Mark all read
          </Button>
        </div>
      </PageHeader>

      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" description="You're all caught up!" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {notifications.map(n => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-5 py-4 hover:bg-muted/50 transition-colors ${!n.read_status ? 'bg-primary/5' : ''}`}
                >
                  <button onClick={() => markRead(n)} className="flex-1 text-left flex items-start gap-3 min-w-0">
                    {!n.read_status && <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />}
                    <div className={`flex-1 min-w-0 ${n.read_status ? 'ml-5' : ''}`}>
                      <p className="text-sm font-medium">{n.title}</p>
                      {n.message && <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>}
                      {n.sender_name && <p className="text-xs text-muted-foreground mt-0.5">From {n.sender_name}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        {n.record_type && <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{n.record_type}</span>}
                        <span className="text-xs text-muted-foreground">{new Date(n.created_date).toLocaleString()}</span>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => deleteNotification(n)}
                    className="text-muted-foreground hover:text-destructive p-1 shrink-0"
                    title="Delete notification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}