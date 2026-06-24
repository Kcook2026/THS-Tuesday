import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ROUTE_MAP = {
  Task: '/tasks/table',
  Project: '/projects',
  Client: '/clients',
  Document: '/documents',
  Workboard: '/workboards',
  Process: '/processes',
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    base44.entities.Notification.filter({}, '-created_date', 20)
      .then(setNotifications)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unread = notifications.filter(n => !n.read_status).length;

  const markRead = async (n) => {
    if (!n.read_status) {
      await base44.entities.Notification.update(n.id, { read_status: true });
      load();
    }
    if (n.record_type && ROUTE_MAP[n.record_type]) {
      navigate(ROUTE_MAP[n.record_type]);
      setOpen(false);
    }
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.read_status);
    if (unreadIds.length === 0) return;
    await base44.entities.Notification.bulkUpdate(unreadIds.map(n => ({ id: n.id, read_status: true })));
    load();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(o => !o); if (!open) load(); }}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
      >
        <Bell className="w-4.5 h-4.5 text-foreground/70" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-popover border rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary hover:underline">Mark all read</button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No notifications</div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => markRead(n)}
                  className={`w-full text-left px-4 py-3 border-b last:border-0 hover:bg-muted/50 transition-colors ${!n.read_status ? 'bg-primary/5' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read_status && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      {n.message && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>}
                      <p className="text-[11px] text-muted-foreground mt-1">{new Date(n.created_date).toLocaleString()}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}