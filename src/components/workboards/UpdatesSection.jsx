import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Send, Trash2, Pencil, AtSign } from 'lucide-react';
import { getUserInitials } from '@/lib/userHelpers';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function UpdatesSection({ item, boardId, users }) {
  const { toast } = useToast();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    loadComments();
  }, [item?.id]);

  const loadComments = async () => {
    if (!item?.id) return;
    try {
      const data = await base44.entities.Comment.filter({
        record_type: 'WorkboardItem',
        record_id: item.id,
      }, '-created_date');
      setComments(data);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newComment.trim() || saving) return;
    setSaving(true);
    try {
      const me = await base44.auth.me();
      const comment = await base44.entities.Comment.create({
        body: newComment.trim(),
        record_type: 'WorkboardItem',
        record_id: item.id,
        workspace: item.workspace,
        user: me.id,
        user_name: me.full_name || me.email || 'Unassigned',
        mentions: [],
      });
      setComments(prev => [comment, ...prev]);
      setNewComment('');
      toast({ title: 'Comment posted', duration: 2000 });
    } catch (error) {
      toast({ title: 'Failed to post comment', description: error.message, variant: 'destructive', duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (commentId) => {
    if (!editText.trim() || saving) return;
    setSaving(true);
    try {
      await base44.entities.Comment.update(commentId, { body: editText.trim() });
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, body: editText.trim() } : c));
      setEditingId(null);
      toast({ title: 'Comment updated', duration: 2000 });
    } catch (error) {
      toast({ title: 'Failed to update', description: error.message, variant: 'destructive', duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (commentId) => {
    if (!confirm('Delete this comment?')) return;
    setSaving(true);
    try {
      await base44.entities.Comment.delete(commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
      toast({ title: 'Comment deleted', duration: 2000 });
    } catch (error) {
      toast({ title: 'Failed to delete', description: error.message, variant: 'destructive', duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  const handleMentionInsert = (user) => {
    const cursorPos = textareaRef.current?.selectionStart || newComment.length;
    const before = newComment.substring(0, cursorPos);
    const after = newComment.substring(cursorPos);
    const lastAtIndex = before.lastIndexOf('@');
    const newBefore = lastAtIndex >= 0 ? before.substring(0, lastAtIndex) : before;
    const mentionText = `@${user.full_name || user.email || 'User'} `;
    setNewComment(newBefore + mentionText + after);
    setShowMentions(false);
    setMentionQuery('');
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleCommentChange = (e) => {
    const value = e.target.value;
    setNewComment(value);
    const cursorPos = e.target.selectionStart;
    const before = value.substring(0, cursorPos);
    const lastAtIndex = before.lastIndexOf('@');
    if (lastAtIndex >= 0) {
      const query = before.substring(lastAtIndex + 1);
      if (!query.includes(' ')) {
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

  return (
    <div className="space-y-3">
      {/* New Comment */}
      <div className="relative">
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
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                  {getUserInitials(u)}
                </div>
                <span className="truncate">{u.full_name || u.email || 'Unassigned'}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Press Cmd/Ctrl+Enter to post</span>
        <Button size="sm" onClick={handleAdd} disabled={saving || !newComment.trim()}>
          <Send className="w-3.5 h-3.5 mr-1.5" />
          Post
        </Button>
      </div>

      {/* Comments List */}
      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-4">Loading...</p>
      ) : comments.length === 0 ? (
        <div className="text-center py-8">
          <AtSign className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No updates yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Start the conversation</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map(comment => (
            <div key={comment.id} className="flex gap-3 p-3 border rounded-lg">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                {getUserInitials({ full_name: comment.user_name })}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{comment.user_name || 'Unassigned'}</span>
                  <span className="text-xs text-muted-foreground">{formatTimestamp(comment.created_date)}</span>
                </div>
                {editingId === comment.id ? (
                  <div className="mt-1 space-y-2">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={2}
                      autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleEdit(comment.id); if (e.key === 'Escape') setEditingId(null); }}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleEdit(comment.id)} disabled={saving}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap">{comment.body}</p>
                )}
              </div>
              {editingId !== comment.id && (
                <div className="flex items-start gap-1">
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditingId(comment.id); setEditText(comment.body); }}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDelete(comment.id)}>
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}