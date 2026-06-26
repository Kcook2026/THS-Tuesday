import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';
import { logActivity } from '@/hooks/useActivityLogger';

export default function CommentSection({ recordType, recordId, recordName }) {
  const [comments, setComments] = useState([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const textareaRef = useRef(null);

  const load = () => {
    if (!recordId) return;
    setLoading(true);
    Promise.all([
      base44.entities.Comment.filter({ record_type: recordType, record_id: recordId }, 'created_date'),
      base44.entities.User.list(),
      base44.auth.me(),
    ]).then(([c, u, me]) => {
      setComments(c);
      setAllUsers(u);
      setUser(me);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [recordId, recordType]);

  const handleSubmit = async () => {
    if (!body.trim()) return;
    setSubmitting(true);
    const mentions = [];
    allUsers.forEach(u => {
      if (body.includes(`@${u.full_name}`) || body.includes(`@${u.email?.split('@')[0]}`)) {
        mentions.push(u.id);
      }
    });
    const comment = await base44.entities.Comment.create({
      body: body.trim(),
      record_type: recordType,
      record_id: recordId,
      user: user?.id,
      user_name: user?.full_name,
      mentions,
    });
    mentions.forEach(uid => {
      base44.entities.Notification.create({
        recipient: uid,
        sender: user?.id,
        sender_name: user?.full_name,
        type: 'mention',
        title: `${user?.full_name} mentioned you`,
        message: body.trim().slice(0, 100),
        record_type: recordType,
        record_id: recordId,
        read_status: false,
      }).catch(() => {});
    });
    logActivity(user, 'commented on', recordType, recordId, recordName);
    setBody('');
    setSubmitting(false);
    load();
  };

  const handleMention = (name) => {
    const cursorPos = textareaRef.current?.selectionStart || body.length;
    const newBody = body.slice(0, cursorPos) + `@${name} ` + body.slice(cursorPos);
    setBody(newBody);
    textareaRef.current?.focus();
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h4 className="text-sm font-semibold">Comments</h4>
        <span className="text-xs text-muted-foreground">({comments.length})</span>
      </div>

      {allUsers.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {allUsers.slice(0, 6).map(u => (
            <button
              key={u.id}
              onClick={() => handleMention(u.full_name)}
              className="text-xs px-2 py-0.5 rounded-full bg-muted hover:bg-primary/10 hover:text-primary transition-colors"
            >
              @{u.full_name}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-xs font-semibold text-primary">{(user?.full_name || '?')[0]}</span>
        </div>
        <div className="flex-1">
          <Textarea
            ref={textareaRef}
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Write a comment... use @ to mention someone"
            rows={2}
            className="resize-none text-sm"
          />
          <Button size="sm" className="mt-2" onClick={handleSubmit} disabled={submitting || !body.trim()}>
            <Send className="w-3 h-3 mr-1.5" />
            {submitting ? 'Posting...' : 'Comment'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-4 text-center text-sm text-muted-foreground">Loading comments...</div>
      ) : comments.length === 0 ? (
        <div className="py-4 text-center text-sm text-muted-foreground">No comments yet</div>
      ) : (
        <div className="space-y-3">
          {comments.map(c => (
            <div key={c.id} className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold">{(c.user_name || '?')[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{c.user_name || 'Unknown'}</span>
                  <span className="text-xs text-muted-foreground">{new Date(c.created_date).toLocaleString()}</span>
                </div>
                <p className="text-sm text-foreground/90 mt-0.5 whitespace-pre-wrap">{c.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}