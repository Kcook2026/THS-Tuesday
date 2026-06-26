import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { ChevronLeft, ExternalLink, Inbox } from 'lucide-react';

export default function FormSubmissions({ form, users, items, onItemClick, onClose }) {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [values, setValues] = useState([]);
  const [loadingValues, setLoadingValues] = useState(false);

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

  const handleSelect = async (submission) => {
    setSelected(submission);
    setLoadingValues(true);
    try {
      const [vals, fields] = await Promise.all([
        base44.entities.FormSubmissionValue.filter({ submission: submission.id }),
        base44.entities.FormField.filter({ form: form.id }),
      ]);
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
    } catch (e) {
      setValues([]);
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

  const formatDate = (d) => {
    try { return new Date(d).toLocaleString(); } catch { return ''; }
  };

  return (
    <Sheet open={!!form} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col p-0">
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
        </div>

        {loading ? (
          <div className="flex-1"><LoadingSpinner /></div>
        ) : selected ? (
          <div className="flex-1 overflow-auto p-4 space-y-4">
            <div className="rounded-lg border p-3 space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className={selected.status === 'processed' ? 'bg-emerald-100 text-emerald-700' : 'bg-muted'}>{selected.status}</Badge>
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

            {selected.created_item && (
              <div className="pt-2 border-t">
                <Button variant="outline" className="w-full" onClick={() => handleViewItem(selected.created_item)}>
                  <ExternalLink className="w-4 h-4 mr-1.5" /> View Created Item
                </Button>
              </div>
            )}
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
                  <Badge variant="secondary" className={s.status === 'processed' ? 'bg-emerald-100 text-emerald-700' : 'bg-muted'}>{s.status}</Badge>
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
      </SheetContent>
    </Sheet>
  );
}