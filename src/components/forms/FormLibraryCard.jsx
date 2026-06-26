import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileText, MoreHorizontal, Edit, Copy, Archive, Trash2, Inbox, Send, Link as LinkIcon, RotateCcw } from 'lucide-react';
import { STATUS_COLORS, STATUS_LABELS, FORM_TYPE_LABELS } from '@/components/forms/FormConstants';

export default function FormLibraryCard({ form, users, onArchive, onRestore, onDelete, onDuplicate }) {
  const navigate = useNavigate();
  const owner = users.find(u => u.id === form.owner);

  const formatDate = (d) => {
    try {
      const date = new Date(d);
      const now = new Date();
      const diff = now - date;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      if (days === 0) return 'Today';
      if (days === 1) return 'Yesterday';
      if (days < 7) return `${days} days ago`;
      return date.toLocaleDateString();
    } catch { return ''; }
  };

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-md bg-primary/10 shrink-0">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium truncate">{form.title}</span>
                <Badge variant="secondary" className={STATUS_COLORS[form.status] || STATUS_COLORS.draft}>
                  {STATUS_LABELS[form.status] || form.status}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {FORM_TYPE_LABELS[form.form_type] || form.form_type}
                </Badge>
              </div>
              {form.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{form.description}</p>
              )}
              {form.tags && form.tags.length > 0 && (
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {form.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{tag}</span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span>{owner?.full_name || 'Unassigned'}</span>
                <span>·</span>
                <span>{form.submission_count || 0} submissions</span>
                <span>·</span>
                <span>Modified {formatDate(form.updated_date || form.created_date)}</span>
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {form.status !== 'archived' && (
                <>
                  <DropdownMenuItem onClick={() => navigate(`/forms/${form.id}/builder`)}>
                    <Edit className="w-3.5 h-3.5 mr-2" /> Edit
                  </DropdownMenuItem>
                  {(form.status === 'published' || form.status === 'active') && (
                    <DropdownMenuItem onClick={() => navigate(`/forms/${form.id}/submit`)}>
                      <Send className="w-3.5 h-3.5 mr-2" /> Submit
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => navigate(`/forms/${form.id}/submissions`)}>
                    <Inbox className="w-3.5 h-3.5 mr-2" /> Submissions
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDuplicate(form)}>
                    <Copy className="w-3.5 h-3.5 mr-2" /> Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/forms/${form.id}/submit`);
                  }}>
                    <LinkIcon className="w-3.5 h-3.5 mr-2" /> Copy Link
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onArchive(form.id)}>
                    <Archive className="w-3.5 h-3.5 mr-2" /> Archive
                  </DropdownMenuItem>
                </>
              )}
              {form.status === 'archived' && (
                <>
                  <DropdownMenuItem onClick={() => onRestore(form.id)}>
                    <RotateCcw className="w-3.5 h-3.5 mr-2" /> Restore
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDuplicate(form)}>
                    <Copy className="w-3.5 h-3.5 mr-2" /> Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete(form)} className="text-destructive">
                    <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete Permanently
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}