import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, CheckCheck } from 'lucide-react';
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

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    base44.entities.Notification.list('-created_date', 50)
      .then(setNotifications)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const markRead = async (n) => {
    if (!n.read_status) {
      await base44.entities.Notification.update(n.id, { read_status: true });
      load();
    }
    if (n.record_type && ROUTE_MAP[n.record_type]) navigate(ROUTE_MAP[n.record_type]);
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.read_status);
    if (unreadIds.length === 0) return;
    await base44.entities.Notification.bulkUpdate(unreadIds.map(n => ({ id: n.id, read_status: true })));
    load();
  };

  if (loading) return <LoadingSpinner />;

  const unread = notifications.filter(n => !n.read_status).length;

  return (
    <div>
      <PageHeader title="Notifications" subtitle={`${unread} unread of ${notifications.length} total`}>
        <Button variant="outline" onClick={markAllRead} disabled={unread === 0}>
          <CheckCheck className="w-4 h-4 mr-1.5" /> Mark all read
        </Button>
      </PageHeader>

      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" description="You're all caught up!" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => markRead(n)}
                  className={`w-full text-left flex items-start gap-3 px-5 py-4 hover:bg-muted/50 transition-colors ${!n.read_status ? 'bg-primary/5' : ''}`}
                >
                  {!n.read_status && <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />}
                  <div className={`flex-1 ${n.read_status ? 'ml-5' : ''}`}>
                    <p className="text-sm font-medium">{n.title}</p>
                    {n.message && <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      {n.record_type && <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{n.record_type}</span>}
                      <span className="text-xs text-muted-foreground">{new Date(n.created_date).toLocaleString()}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}