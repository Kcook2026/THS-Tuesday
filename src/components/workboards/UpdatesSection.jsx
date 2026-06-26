import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useConfirm } from '@/components/shared/ConfirmDialog';
import { Send, Trash2, Pencil, AtSign, Reply } from 'lucide-react';
import { getUserInitials } from '@/lib/userHelpers';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import UserAvatar from '@/components/shared/UserAvatar';

export default function UpdatesSection({ item, boardId, workspaceId, users, currentUserId, onCommentCountChange }) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const textareaRef = useRef(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadUser();
    loadComments();
  }, [item?.id]);

  const loadUser = async () => {
    let me;
    if (currentUserId) {
      me = { id: currentUserId };
      // Resolve full user object from users array
      const matchedUser = users?.find(u => u.id === currentUserId);
      if (matchedUser) {
        me = { ...me, ...matchedUser };
      } else {
        me = await base44.auth.me().catch(() => me);
      }
    } else {
      me = await base44.auth.me().catch(() => null);
    }
    setCurrentUser(me);
  };

  const loadComments = async () => {
    if (!item?.id) return;
    setLoading(true);
    try {
      const data = await base44.entities.Comment.filter({
        record_type: 'WorkboardItem',
        record_id: item.id,
        deleted: false,
      }, '-created_date');
      setComments(data || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (parentId = null) => {
    const text = replyingTo ? editText : newComment;
    if (!text.trim() || saving) return;
    setSaving(true);
    try {
      const me = currentUser || await base44.auth.me();
      const mentions = extractMentions(text);
      const meName = me.full_name || me.email || 'User';
      
      const comment = await base44.entities.Comment.create({
        body: text.trim(),
        record_type: 'WorkboardItem',
        record_id: item.id,
        workspace: item.workspace || workspaceId,
        workboard: item.workboard || boardId,
        user: me.id,
        user_name: meName,
        user_email: me.email || '',
        parent_comment: parentId,
        mentions,
        edited: false,
        created_date: new Date().toISOString(),
      });

      setComments(prev => [comment, ...prev]);
      setNewComment('');
      setEditText('');
      setReplyingTo(null);
      toast({ title: 'Comment posted', duration: 2000 });
      onCommentCountChange?.(item.id, (prevCount) => (prevCount || 0) + 1);

      // Log activity
      try {
        await base44.entities.Activity.create({
          workspace: item.workspace || workspaceId,
          workboard: item.workboard || boardId,
          record_type: 'WorkboardItem',
          record_id: item.id,
          user: me.id,
          user_name: me.full_name || me.email || 'User',
          action: 'comment added',
          before_value: '',
          after_value: text.trim().substring(0, 50),
          created_date: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Failed to log activity:', err);
      }

      // Create notifications for mentioned users (do NOT auto-add as watchers)
      if (mentions.length > 0) {
        const workboardId = item.workboard || boardId;
        const wsId = item.workspace || workspaceId;
        const targetUrl = `/workboards/${workboardId}?item=${item.id}&tab=updates`;
        for (const mentionedUserId of mentions) {
            try {
              await base44.entities.Notification.create({
                workspace: wsId,
                workboard: workboardId,
                recipient: mentionedUserId,
                sender: me.id,
                sender_name: meName,
                type: 'mention',
                title: 'You were mentioned',
                message: `${meName} mentioned you in a comment`,
                record_type: 'WorkboardItem',
                record_id: item.id,
                target_url: targetUrl,
                read_status: false,
                created_date: new Date().toISOString(),
              });
            } catch (err) {
              console.error('Failed to create notification:', err);
            }
        }
      }
    } catch (error) {
      toast({ title: 'Failed to post comment', description: error.message, variant: 'destructive', duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  const extractMentions = (text) => {
    const mentions = [];
    const mentionRegex = /@([^@\s]+)/g;
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      const mentionedName = match[1];
      const user = users?.find(u => 
        (u.full_name || u.email || '').toLowerCase().includes(mentionedName.toLowerCase())
      );
      if (user) {
        mentions.push(user.id);
      }
    }
    return [...new Set(mentions)];
  };

  // Removed: auto-adding mentioned users as watchers
  // Mentions now only create notifications, not watcher subscriptions

  const handleEdit = async (commentId) => {
    if (!editText.trim() || saving) return;
    setSaving(true);
    try {
      const oldComment = comments.find(c => c.id === commentId);
      await base44.entities.Comment.update(commentId, { 
        body: editText.trim(),
        edited: true,
        edited_date: new Date().toISOString(),
      });
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, body: editText.trim(), edited: true, edited_date: new Date().toISOString() } : c));
      setEditingId(null);
      toast({ title: 'Comment updated', duration: 2000 });

      // Log activity
      try {
        await base44.entities.Activity.create({
          workspace: item.workspace || workspaceId,
          workboard: item.workboard || boardId,
          record_type: 'WorkboardItem',
          record_id: item.id,
          user: currentUser?.id,
          user_name: currentUser?.full_name || currentUser?.email || 'User',
          action: 'comment edited',
          before_value: oldComment?.body?.substring(0, 50) || '',
          after_value: editText.trim().substring(0, 50),
          created_date: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Failed to log activity:', err);
      }
    } catch (error) {
      toast({ title: 'Failed to update', description: error.message, variant: 'destructive', duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (commentId) => {
    const ok = await confirm({
      title: 'Delete Comment?',
      description: 'Are you sure you want to delete this comment?',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    setSaving(true);
    try {
      const oldComment = comments.find(c => c.id === commentId);
      await base44.entities.Comment.update(commentId, { 
        deleted: true,
        body: '[Deleted]',
        deleted_date: new Date().toISOString(),
      });
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, deleted: true, body: '[Deleted]', deleted_date: new Date().toISOString() } : c));
      toast({ title: 'Comment deleted', duration: 2000 });
      onCommentCountChange?.(item.id, (prevCount) => Math.max((prevCount || 0) - 1, 0));

      // Log activity
      try {
        await base44.entities.Activity.create({
          workspace: item.workspace || workspaceId,
          workboard: item.workboard || boardId,
          record_type: 'WorkboardItem',
          record_id: item.id,
          user: currentUser?.id,
          user_name: currentUser?.full_name || currentUser?.email || 'User',
          action: 'comment deleted',
          before_value: oldComment?.body?.substring(0, 50) || '',
          after_value: '[Deleted]',
          created_date: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Failed to log activity:', err);
      }
    } catch (error) {
      toast({ title: 'Failed to delete', description: error.message, variant: 'destructive', duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  const handleMentionInsert = (user) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const cursorPos = textarea.selectionStart || newComment.length;
    const before = newComment.substring(0, cursorPos);
    const after = newComment.substring(cursorPos);
    const lastAtIndex = before.lastIndexOf('@');
    const newBefore = lastAtIndex >= 0 ? before.substring(0, lastAtIndex) : before;
    const mentionText = `@${user.full_name || user.email || 'User'} `;
    setNewComment(newBefore + mentionText + after);
    setShowMentions(false);
    setMentionQuery('');
    setTimeout(() => textarea.focus(), 0);
  };

  const handleCommentChange = (e) => {
    const value = e.target.value;
    setNewComment(value);
    const cursorPos = e.target.selectionStart;
    const before = value.substring(0, cursorPos);
    const lastAtIndex = before.lastIndexOf('@');
    if (lastAtIndex >= 0) {
      const query = before.substring(lastAtIndex + 1);
      if (!query.includes(' ') && query.length > 0) {
        setShowMentions(true);
        setMentionQuery(query);
        return;
      }
    }
    setShowMentions(false);
  };

  const filteredMentionUsers = (users || []).filter(u => {
    if (!mentionQuery) return true;
    const name = (u.full_name || u.email || '').toLowerCase();
    return name.includes(mentionQuery.toLowerCase());
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
    return d.toLocaleDateString('en', { month: 'short', day: 'numeric', year: diffDay > 365 ? 'numeric' : undefined });
  };

  const canDeleteComment = (comment) => {
    if (!currentUser) return false;
    return comment.user === currentUser.id;
  };

  const getAuthorName = (comment) => {
    // Priority: resolve from users > user_name > user_email > fallback
    // Never show "User" or "Unassigned" for authored comments
    if (comment.user) {
      const user = users?.find(u => u.id === comment.user);
      if (user) return user.full_name || user.email || comment.user_email || 'User';
    }
    if (comment.user_name && comment.user_name !== 'User') return comment.user_name;
    if (comment.user_email) return comment.user_email.split('@')[0];
    return 'User';
  };

  const renderComment = (comment, isReply = false) => {
    const isEditing = editingId === comment.id;
    const replies = comments.filter(c => c.parent_comment === comment.id && !c.deleted);

    return (
      <div key={comment.id} className={`space-y-2 ${isReply ? 'ml-8 pl-4 border-l-2 border-muted' : ''}`}>
        <div className={`flex gap-3 ${comment.deleted ? 'opacity-50' : ''}`}>
          <UserAvatar userId={comment.user} users={users} size="md" />
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{getAuthorName(comment)}</span>
                <span className="text-xs text-muted-foreground">{formatTimestamp(comment.created_date)}</span>
                {comment.edited && <span className="text-xs text-muted-foreground">(edited)</span>}
              </div>
              {!comment.deleted && canDeleteComment(comment) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setEditingId(comment.id); setEditText(comment.body); }}>
                      <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(comment.id)} className="text-destructive">
                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            
            {isEditing ? (
              <div className="mt-2 space-y-2">
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={3}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleEdit(comment.id)} disabled={saving}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm mt-1 whitespace-pre-wrap">{comment.body}</p>
            )}

            {!comment.deleted && !isReply && (
              <div className="flex items-center gap-2 mt-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                >
                  <Reply className="w-3.5 h-3.5 mr-1" />
                  Reply
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Reply input */}
        {replyingTo === comment.id && (
          <div className="ml-12 mt-2 space-y-2">
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder={`Reply to ${comment.user_name}...`}
              rows={2}
              className="text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleAdd(comment.id);
                }
              }}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleAdd(comment.id)} disabled={saving || !editText.trim()}>
                <Send className="w-3.5 h-3.5 mr-1.5" /> Reply
              </Button>
              <Button size="sm" variant="outline" onClick={() => setReplyingTo(null)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Nested replies */}
        {replies.length > 0 && (
          <div className="space-y-2 mt-2">
            {replies.map(reply => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* New Comment */}
      <div className="relative space-y-2">
        <Textarea
          ref={textareaRef}
          value={newComment}
          onChange={handleCommentChange}
          placeholder="Write an update... (type @ to mention someone)"
          rows={3}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        {showMentions && filteredMentionUsers.length > 0 && (
          <div className="absolute z-10 bottom-full mb-1 left-0 w-64 bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {filteredMentionUsers.slice(0, 5).map(u => (
              <button
                key={u.id}
                className="flex items-center gap-2 w-full px-3 py-2 hover:bg-accent text-left text-sm"
                onClick={() => handleMentionInsert(u)}
              >
                <Avatar className="w-6 h-6">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {getUserInitials(u)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{u.full_name || u.email || 'Unassigned'}</span>
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Press Cmd/Ctrl+Enter to post</span>
          <Button size="sm" onClick={() => handleAdd()} disabled={saving || !newComment.trim()}>
            <Send className="w-3.5 h-3.5 mr-1.5" />
            Post
          </Button>
        </div>
      </div>

      {/* Comments List */}
      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-4">Loading...</p>
      ) : comments.length === 0 ? (
        <div className="text-center py-8">
          <AtSign className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No updates yet</p>
          <p className="text-xs text-muted-foreground">Be the first to add an update</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {comments.filter(c => !c.parent_comment && !c.deleted).map(comment => renderComment(comment))}
        </div>
      )}
    </div>
  );
}