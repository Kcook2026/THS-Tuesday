import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Send, AtSign } from 'lucide-react';
import { getUserInitials } from '@/lib/userHelpers';

export default function UpdatesSection({ itemId, boardId }) {
  const { user } = useWorkspace();
  const { toast } = useToast();
  const [updates, setUpdates] = useState([]);
  const [newUpdate, setNewUpdate] = useState('');
  const [loading, setLoading] = useState(false);

  const loadUpdates = async () => {
    try {
      // For now, load comments - will implement Comment entity
      setUpdates([]);
    } catch (error) {
      console.error('Error loading updates:', error);
    }
  };

  const handlePostUpdate = async () => {
    if (!newUpdate.trim()) return;
    
    setLoading(true);
    try {
      // Create comment/update
      toast({ 
        title: 'Update posted', 
        description: 'Comment system coming soon',
        duration: 3000 
      });
      setNewUpdate('');
      loadUpdates();
    } catch (error) {
      toast({ title: 'Failed to post update', description: error.message, variant: 'destructive', duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Updates</h3>
      
      {/* Post Update */}
      <div className="flex gap-3">
        <Avatar className="w-8 h-8">
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
            {getUserInitials(user)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <Textarea
            value={newUpdate}
            onChange={(e) => setNewUpdate(e.target.value)}
            placeholder="Write an update... use @ to mention teammates"
            rows={3}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-8">
                <AtSign className="w-4 h-4 mr-1" />
                Mention
              </Button>
            </div>
            <Button onClick={handlePostUpdate} disabled={loading || !newUpdate.trim()} size="sm">
              <Send className="w-4 h-4 mr-2" />
              Post
            </Button>
          </div>
        </div>
      </div>

      {/* Updates List */}
      <div className="space-y-3">
        {updates.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            <p>No updates yet</p>
            <p className="text-xs mt-1">Be the first to post an update</p>
          </div>
        ) : (
          updates.map(update => (
            <div key={update.id} className="flex gap-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                  {getUserInitials(update.user)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{update.user_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(update.created_date).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm">{update.content}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}