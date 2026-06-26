import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { ChevronLeft, ExternalLink, Inbox, RotateCcw, FileText } from 'lucide-react';
import FilePreview from '@/components/forms/FilePreview';
import { useConfirm } from '@/components/shared/ConfirmDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const FILE_FIELD_TYPES = ['file_upload', 'image_upload'];

export default function FormSubmissions({ form, users, items, onItemClick, onClose }) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [values, setValues] = useState([]);
  const [fields, setFields] = useState([]);
  const [loadingValues, setLoadingValues] = useState(false);
  const [attachments, setAttachments] = useState([]);

  const load = useCallback(async () => {
    if (!form?.id) return;
    setLoading(true);
    try {
      const data = await base44.entities.FormSubmission.filter({ form: form.id });
      setSubmissions(data.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch (e) {
      toast({ title: 'Failed to load submissions', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [form?.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    base44.entities.FormField.filter({ form: form?.id }).then(f => {
      setFields(f.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
    }).catch(() => {});
  }, [form?.id]);

  const handleSelect = async (submission) => {
    setSelected(submission);
    setLoadingValues(true);
    try {
      const vals = await base44.entities.FormSubmissionValue.filter({ submission: submission.id });
      const fieldMap = {};
      fields.forEach(f => { fieldMap[f.id] = f; });
      setValues(vals
        .map(v => ({
          ...v,
          field_label: fieldMap[v.field]?.label || 'Unknown',
          field_type: fieldMap[v.field]?.field_type,
        }))
        .sort((a, b) => (fieldMap[a.field]?.sort_order || 0) - (fieldMap[b.field]?.sort_order || 0))
      );

      // Load attachments for file fields
      if (submission.created_item || submission.linked_item) {
        const itemId = submission.created_item || submission.linked_item;
        const atts = await base44.entities.Attachment.filter({ item: itemId }).catch(() => []);
        setAttachments(atts);
      } else {
        setAttachments([]);
      }
    } catch {
      setValues([]);
      setAttachments([]);
    } finally {
      setLoadingValues(false);
    }
  };

  const handleViewItem = (itemId) => {
    if (!itemId) return;
    const item = items?.find(i => i.id === itemId);
    if (item) {
      onItemClick(item);
      onClose();
    } else {
      window.location.href = `/workboards/${form.workboard}`;
    }
  };

  const handleReopen = async () => {
    const ok = await confirm({
      title: 'Reopen Submission?',
      message: 'This will mark the submission as reopened for further action.',
      confirmLabel: 'Reopen',
      variant: 'warning',
    });
    if (!ok) return;
    try {
      await base44.entities.FormSubmission.update(selected.id, { status: 'reopened' });
      setSelected({ ...selected, status: 'reopened' });
      setSubmissions(prev => prev.map(s => s.id === selected.id ? { ...s, status: 'reopened' } : s));
      toast({ title: 'Submission reopened', duration: 2000 });
    } catch (e) {
      toast({ title: 'Failed to reopen', description: e.message, variant: 'destructive' });
    }
  };

  const formatDate = (d) => {
    try { return new Date(d).toLocaleString(); } catch { return ''; }
  };

  return (
    <div className="w-full sm:max-w-2xl flex flex-col p-0 h-full">
      <div className="flex items-center gap-2 p-4 border-b">
        {selected && (
          <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        )}
        <div className="flex-1">
          <h2 className="font-semibold">{selected ? 'Submission Detail' : `Submissions — ${form.title}`}</h2>
          <p className="text-xs text-muted-foreground">{form.submission_count || submissions.length} total</p>
        </div>
        {selected && (
          <Button variant="outline" size="sm" onClick={handleReopen} disabled={selected.status === 'reopened'}>
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reopen
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex-1"><LoadingSpinner /></div>
      ) : selected ? (
        <div className="flex-1 overflow-auto p-4">
          <Tabs defaultValue="answers">
            <TabsList className="w-full">
              <TabsTrigger value="answers">Answers</TabsTrigger>
              <TabsTrigger value="files">Files</TabsTrigger>
              <TabsTrigger value="linked">Linked Item</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="answers" className="mt-4">
              <div className="rounded-lg border p-3 space-y-1 mb-4">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className={
                    selected.status === 'processed' ? 'bg-emerald-100 text-emerald-700' :
                    selected.status === 'reopened' ? 'bg-amber-100 text-amber-700' : 'bg-muted'
                  }>{selected.status}</Badge>
                  <span className="text-sm text-muted-foreground">{formatDate(selected.created_date)}</span>
                </div>
                <p className="text-sm"><span className="text-muted-foreground">Submitted by:</span> {selected.submitter_name || selected.submitter_email}</p>
              </div>

              {loadingValues ? (
                <LoadingSpinner />
              ) : values.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No values recorded</p>
              ) : (
                <div className="space-y-3">
                  {values.map(v => (
                    <div key={v.id} className="space-y-0.5">
                      <p className="text-xs font-medium text-muted-foreground">{v.field_label}</p>
                      <p className="text-sm">{v.display_value || '—'}</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="files" className="mt-4">
              {attachments.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">No files attached</div>
              ) : (
                <div className="space-y-3">
                  {attachments.map(att => (
                    <FilePreview key={att.id} fileName={att.file_name} fileUrl={att.file_url} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="linked" className="mt-4">
              {selected.created_item || selected.linked_item ? (
                <Button variant="outline" className="w-full" onClick={() => handleViewItem(selected.created_item || selected.linked_item)}>
                  <ExternalLink className="w-4 h-4 mr-1.5" /> View {selected.created_item ? 'Created' : 'Linked'} Item
                </Button>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No linked workboard item</p>
                  <p className="text-xs text-muted-foreground mt-1">This is a standalone form submission</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5" />
                  <div>
                    <p className="font-medium">Submission created</p>
                    <p className="text-xs text-muted-foreground">{formatDate(selected.created_date)}</p>
                    <p className="text-xs text-muted-foreground">by {selected.submitter_name || selected.submitter_email}</p>
                  </div>
                </div>
                {selected.status !== 'pending' && (
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                    <div>
                      <p className="font-medium">Status changed to {selected.status}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(selected.updated_date)}</p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      ) : submissions.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <Inbox className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No submissions yet</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          {submissions.map(s => (
            <button
              key={s.id}
              onClick={() => handleSelect(s)}
              className="w-full text-left p-3 border-b hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{s.submitter_name || s.submitter_email}</span>
                <Badge variant="secondary" className={
                  s.status === 'processed' ? 'bg-emerald-100 text-emerald-700' :
                  s.status === 'reopened' ? 'bg-amber-100 text-amber-700' : 'bg-muted'
                }>{s.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{formatDate(s.created_date)}</p>
              {s.values && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                  {(() => { try { return JSON.parse(s.values).map(v => v.value).join(', '); } catch { return ''; } })()}
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}