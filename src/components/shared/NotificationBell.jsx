import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Bell, Trash2 } from 'lucide-react';
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
  const [currentUserId, setCurrentUserId] = useState(null);
  const ref = useRef(null);
  const navigate = useNavigate();
  const prevUnreadRef = useRef(null);
  const audioCtxRef = useRef(null);

  const ensureAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      try {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) { return null; }
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // Unlock audio context on first user interaction (browser security requirement)
  useEffect(() => {
    const unlock = () => ensureAudio();
    document.addEventListener('click', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, [ensureAudio]);

  const playSound = useCallback(() => {
    const ctx = ensureAudio();
    if (!ctx || ctx.state !== 'running') return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
  }, [ensureAudio]);

  const load = useCallback(() => {
    if (!currentUserId) return;
    setLoading(true);
    base44.entities.Notification.filter({ recipient: currentUserId }, '-created_date', 30)
      .then(setNotifications)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentUserId]);

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
    const interval = setInterval(load, 30000);

    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (event.type === 'create') {
        const isForMe = !event.data?.recipient || event.data.recipient === currentUserId;
        if (isForMe) load();
      }
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [currentUserId, load]);

  const unread = notifications.filter(n => !n.read_status).length;

  // Play sound when unread count increases (covers both realtime and polling)
  useEffect(() => {
    if (prevUnreadRef.current !== null && unread > prevUnreadRef.current) {
      playSound();
    }
    if (prevUnreadRef.current === null) {
      prevUnreadRef.current = unread;
    } else {
      prevUnreadRef.current = unread;
    }
  }, [unread, playSound]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (n) => {
    if (!n.read_status) {
      await base44.entities.Notification.update(n.id, { read_status: true, read_date: new Date().toISOString() });
      load();
    }

    // Route to target_url if available
    if (n.target_url) {
      navigate(n.target_url);
      setOpen(false);
    } else if (n.record_type === 'WorkboardItem' && n.workboard && n.record_id) {
      navigate(`/workboards/${n.workboard}?item=${n.record_id}&tab=updates`);
      setOpen(false);
    } else if (n.record_type && ROUTE_MAP[n.record_type]) {
      navigate(ROUTE_MAP[n.record_type]);
      setOpen(false);
    }
  };

  const markAllRead = async () => {
    const unreadNotifs = notifications.filter(n => !n.read_status);
    if (unreadNotifs.length === 0) return;
    await base44.entities.Notification.bulkUpdate(
      unreadNotifs.map(n => ({ id: n.id, read_status: true, read_date: new Date().toISOString() }))
    );
    load();
  };

  const deleteNotification = async (n, e) => {
    e.stopPropagation();
    await base44.entities.Notification.delete(n.id);
    load();
  };

  const clearAllRead = async () => {
    const readIds = notifications.filter(n => n.read_status).map(n => n.id);
    if (readIds.length === 0) return;
    await base44.entities.Notification.deleteMany({ id: { $in: readIds } });
    load();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(o => !o); if (!open) load(); }}
        className={`relative p-2 rounded-lg transition-colors ${unread > 0 ? 'bg-primary/10 hover:bg-primary/20' : 'hover:bg-muted'}`}
      >
        <Bell className={`w-5 h-5 ${unread > 0 ? 'text-primary' : 'text-foreground/70'}`} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-pulse ring-2 ring-background">
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
                        {n.sender_name && <p className="text-[11px] text-muted-foreground mt-0.5">From {n.sender_name}</p>}
                        <p className="text-[11px] text-muted-foreground mt-1">{new Date(n.created_date).toLocaleString()}</p>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={(e) => deleteNotification(n, e)}
                    className="text-muted-foreground hover:text-destructive p-1 shrink-0"
                    title="Delete notification"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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