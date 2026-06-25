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
    
    // Subscribe to real-time notification changes
    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (event.type === 'create') {
        load();
      }
    });
    
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  const unread = notifications.filter(n => !n.read_status).length;

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (n) => {
    if (!n.read_status) {
      await base44.entities.Notification.update(n.id, { read_status: true });
      load();
    }
    
    // Route to the correct page
    if (n.record_type === 'WorkboardItem' && n.workboard && n.record_id) {
      navigate(`/workboards/${n.workboard}?item=${n.record_id}&tab=updates`);
      setOpen(false);
    } else if (n.record_type && ROUTE_MAP[n.record_type]) {
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

  const deleteNotification = async (n, e) => {
    e.stopPropagation();
    await base44.entities.Notification.delete(n.id);
    load();
  };

  const clearAllRead = async () => {
    const readIds = notifications.filter(n => n.read_status);
    if (readIds.length === 0) return;
    await base44.entities.Notification.deleteMany({ id: { $in: readIds.map(n => n.id) } });
    load();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(o => !o); if (!open) load(); }}
        className={`relative p-2 rounded-lg transition-colors ${unread > 0 ? 'bg-primary/10 hover:bg-primary/20' : 'hover:bg-muted'}`}
      >
        <Bell className={`w-4.5 h-4.5 ${unread > 0 ? 'text-primary' : 'text-foreground/70'}`} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-pulse">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-popover border rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="text-sm font-semibold">Notifications</span>
            <div className="flex gap-2">
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-primary hover:underline">Mark all read</button>
              )}
              {notifications.some(n => n.read_status) && (
                <button onClick={clearAllRead} className="text-xs text-muted-foreground hover:text-foreground hover:underline">Clear read</button>
              )}
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No notifications</div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`flex items-start gap-2 px-4 py-3 border-b last:border-0 hover:bg-muted/50 transition-colors ${!n.read_status ? 'bg-primary/5' : ''}`}
                >
                  <button
                    onClick={() => markRead(n)}
                    className="flex-1 text-left min-w-0"
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
                  <button
                    onClick={(e) => deleteNotification(n, e)}
                    className="text-muted-foreground hover:text-destructive p-1"
                    title="Delete notification"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}