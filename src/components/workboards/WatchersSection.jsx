import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { UserPlus, X, Users } from 'lucide-react';
import UserAvatar from '@/components/shared/UserAvatar';
import { getUserInitials } from '@/lib/userHelpers';

export default function WatchersSection({ item, boardId, workspaceId, users, currentUserId }) {
  const { toast } = useToast();
  const [watchers, setWatchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [isWatching, setIsWatching] = useState(false);

  useEffect(() => {
    loadUser();
    loadWatchers();
  }, [item?.id]);

  const loadUser = async () => {
    if (currentUserId) {
      setCurrentUser({ id: currentUserId });
    } else {
      const me = await base44.auth.me().catch(() => null);
      setCurrentUser(me);
    }
  };

  const loadWatchers = async () => {
    if (!item?.id) return;
    setLoading(true);
    try {
      const watcherList = await base44.entities.ItemWatcher.filter({
        item: item.id,
      }, '-created_date');
      // Ensure each watcher has all required fields
      const enriched = watcherList.map(w => ({
        ...w,
        id: w.id,
        workspace: w.workspace || workspaceId,
        workboard: w.workboard || boardId,
        item: w.item || item.id,
        user: w.user,
        user_name: w.user_name || users?.find(u => u.id === w.user)?.full_name || '',
        added_by: w.added_by,
        created_date: w.created_date,
      }));
      setWatchers(enriched || []);
      
      // Check if current user is watching
      const me = currentUser || await base44.auth.me().catch(() => null);
      if (me) {
        setIsWatching(enriched?.some(w => w.user === me.id) || false);
      }
    } catch (error) {
      console.error('Error loading watchers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleWatch = async () => {
    if (!item?.id || !currentUser) return;
    
    try {
      if (isWatching) {
        // Remove watcher
        const watcher = watchers.find(w => w.user === currentUser.id);
        if (watcher) {
          await base44.entities.ItemWatcher.delete(watcher.id);
          setWatchers(prev => prev.filter(w => w.id !== watcher.id));
          toast({ title: 'Stopped watching', duration: 2000 });
        }
      } else {
        // Add watcher
        const me = currentUser;
        await base44.entities.ItemWatcher.create({
          workspace: item.workspace || workspaceId,
          workboard: item.workboard || boardId,
          item: item.id,
          user: me.id,
          added_by: me.id,
        });
        
        const newWatcher = {
          workspace: item.workspace || workspaceId,
          workboard: item.workboard || boardId,
          item: item.id,
          user: me.id,
          user_name: me.full_name || me.email,
          added_by: me.id,
          created_date: new Date().toISOString(),
        };
        
        setWatchers(prev => [newWatcher, ...prev]);
        toast({ title: 'Now watching', duration: 2000 });
      }
      
      setIsWatching(!isWatching);
    } catch (error) {
      toast({ title: 'Failed to update', description: error.message, variant: 'destructive', duration: 5000 });
    }
  };

  const handleRemoveWatcher = async (watcherId, userId) => {
    if (!watcherId) {
      toast({ title: 'Invalid watcher', description: 'Watcher ID is missing', variant: 'destructive', duration: 4000 });
      return;
    }
    try {
      await base44.entities.ItemWatcher.delete(watcherId);
      setWatchers(prev => prev.filter(w => w.id !== watcherId));
      if (userId === currentUser?.id) {
        setIsWatching(false);
      }
      toast({ title: 'Watcher removed', duration: 2000 });
    } catch (error) {
      toast({ title: 'Failed to remove', description: error.message, variant: 'destructive', duration: 5000 });
    }
  };

  const getWatcherName = (watcher) => {
    return watcher.user_name || 
           users?.find(u => u.id === watcher.user)?.full_name || 
           'User';
  };

  if (loading) {
    return <p className="text-center text-sm text-muted-foreground py-4">Loading...</p>;
  }

  return (
    <div className="space-y-4">
      {/* Watch Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {watchers.length} {watchers.length === 1 ? 'Watcher' : 'Watchers'}
          </span>
        </div>
        <Button
          variant={isWatching ? 'default' : 'outline'}
          size="sm"
          onClick={handleToggleWatch}
        >
          {isWatching ? (
            <>
              <X className="w-3.5 h-3.5 mr-1.5" />
              Stop Watching
            </>
          ) : (
            <>
              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
              Watch Item
            </>
          )}
        </Button>
      </div>

      {/* Watchers List */}
      {watchers.length === 0 ? (
        <div className="text-center py-8 border border-dashed rounded-lg">
          <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No watchers yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            {isWatching ? 'You are watching this item' : 'Click "Watch Item" to receive updates'}
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {watchers.map(watcher => (
            <div
              key={watcher.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <UserAvatar userId={watcher.user} users={users} size="md" />
                <div>
                  <p className="text-sm font-medium">{getWatcherName(watcher)}</p>
                  <p className="text-xs text-muted-foreground">
                    Added {new Date(watcher.created_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {watcher.user === currentUser?.id && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleRemoveWatcher(watcher.id, watcher.user)}
                  title="Remove"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}