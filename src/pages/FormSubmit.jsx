import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { DISPLAY_ONLY_TYPES, FILE_FIELD_TYPES, FORM_TYPE_LABELS } from '@/components/forms/FormConstants';
import FormFieldRenderer from '@/components/forms/FormFieldRenderer';
import ItemPicker from '@/components/forms/ItemPicker';
import WorkboardPicker from '@/components/forms/WorkboardPicker';
import { ChevronLeft, Send, CheckCircle2, ExternalLink, Link2 } from 'lucide-react';

export default function FormSubmit() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState(null);
  const [fields, setFields] = useState([]);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState({});
  const [fileObjects, setFileObjects] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [linkedItem, setLinkedItem] = useState(null);

  const load = useCallback(async () => {
    if (!formId) return;
    setLoading(true);
    try {
      const [f, flds] = await Promise.all([
        base44.entities.Form.get(formId),
        base44.entities.FormField.filter({ form: formId }),
      ]);
      setForm(f);
      setFields(flds.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
      const [allUsers, allTeams] = await Promise.all([
        base44.entities.User.list().catch(() => []),
        base44.entities.Team.filter({ workspace: f.workspace }).catch(() => []),
      ]);
      setUsers(allUsers);
      setTeams(allTeams);
    } catch (e) {
      toast({ title: 'Failed to load form', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [formId]);

  useEffect(() => { load(); }, [load]);

  const handleChange = (fieldId, value) => {
    setValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleFileChange = (fieldId, files) => {
    setFileObjects(prev => ({ ...prev, [fieldId]: files }));
  };

  const handleSubmit = async () => {
    for (const field of fields) {
      if (DISPLAY_ONLY_TYPES.includes(field.field_type)) continue;
      if (!field.required) continue;
      const val = values[field.id];
      const files = fileObjects[field.id];
      const isEmpty = (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0))
        && (!files || files.length === 0);
      if (isEmpty) {
        toast({ title: 'Validation Error', description: `"${field.label}" is required`, variant: 'destructive' });
        return;
      }
    }

    setSubmitting(true);
    try {
      const fileUrls = {};
      for (const [fieldId, files] of Object.entries(fileObjects)) {
        if (files && files.length > 0) {
          const urls = [];
          for (const file of files) {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            urls.push(file_url);
          }
          fileUrls[fieldId] = urls;
        }
      }

      const response = await base44.functions.invoke('submitForm', {
        formId: form.id,
        values,
        fileUrls,
        linkedItemId: linkedItem?.id || null,
      });

      setResult(response.data);
      toast({ title: 'Form submitted successfully', duration: 2000 });
    } catch (e) {
      const msg = e?.response?.data?.error || e?.data?.error || e.message;
      toast({ title: 'Submission failed', description: msg, variant: 'destructive', duration: 6000 });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!form) return <div className="p-8 text-center text-muted-foreground">Form not found</div>;

  const isStandalone = form.form_type === 'standalone_form';
  const backUrl = form.workboard ? `/workboards/${form.workboard}` : '/forms';

  if (form.status !== 'published' && form.status !== 'active') {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-lg font-semibold mb-2">This form is not published</p>
            <p className="text-sm text-muted-foreground mb-4">The form owner needs to publish this form before it can accept submissions.</p>
            <Button variant="outline" onClick={() => navigate(backUrl)}>
              <ChevronLeft className="w-4 h-4 mr-1.5" /> Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (result) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-1">Submission Successful</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {isStandalone
                ? 'Your form has been submitted successfully.'
                : 'Your form has been submitted and a workboard item has been created.'}
            </p>
            {result.item_title && <p className="text-sm font-medium mb-4">Item: {result.item_title}</p>}
            <div className="flex justify-center gap-2">
              {!isStandalone && result.item_id && (
                <Button variant="outline" onClick={() => navigate(`/workboards/${form.workboard}`)}>
                  <ExternalLink className="w-4 h-4 mr-1.5" /> View Item
                </Button>
              )}
              <Button onClick={() => { setResult(null); setValues({}); setFileObjects({}); setLinkedItem(null); }}>
                Submit Another
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(backUrl)} className="mb-4">
        <ChevronLeft className="w-4 h-4 mr-1" /> Back
      </Button>

      <div className="mb-6 pb-4 border-b">
        <h1 className="text-2xl font-bold">{form.title}</h1>
        {form.description && <p className="text-sm text-muted-foreground mt-1">{form.description}</p>}
        <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
          {FORM_TYPE_LABELS[form.form_type] || form.form_type}
        </span>
      </div>

      {isStandalone && (
        <div className="mb-6 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Link to existing item (optional)</p>
              <p className="text-xs text-muted-foreground">Search and link a workboard item to this submission</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowItemPicker(true)}>
              <Link2 className="w-3.5 h-3.5 mr-1" /> {linkedItem ? 'Change' : 'Link Item'}
            </Button>
          </div>
          {linkedItem && (
            <div className="mt-2 p-2 rounded bg-accent text-sm">
              <span className="font-medium">{linkedItem.title}</span>
              <button onClick={() => setLinkedItem(null)} className="ml-2 text-xs text-muted-foreground hover:text-destructive">Remove</button>
            </div>
          )}
        </div>
      )}

      <div className="space-y-5">
        {fields.map(field => (
          <div key={field.id}>
            {FILE_FIELD_TYPES.includes(field.field_type) ? (
              <FormFieldRenderer
                field={field}
                value={fileObjects[field.id]}
                onChange={(files) => handleFileChange(field.id, files)}
                users={users}
                teams={teams}
              />
            ) : (
              <FormFieldRenderer
                field={field}
                value={values[field.id]}
                onChange={(val) => handleChange(field.id, val)}
                users={users}
                teams={teams}
              />
            )}
          </div>
        ))}
      </div>

      {fields.length > 0 && (
        <div className="mt-6 pt-4 border-t">
          <Button onClick={handleSubmit} disabled={submitting} className="w-full sm:w-auto">
            {submitting ? (
              <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" /> Submitting...</>
            ) : (
              <><Send className="w-4 h-4 mr-1.5" /> Submit Form</>
            )}
          </Button>
        </div>
      )}

      {showItemPicker && (
        <Dialog open={showItemPicker} onOpenChange={setShowItemPicker}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Link Workboard Item</DialogTitle>
            </DialogHeader>
            {form.workboard && (
              <ItemPicker
                workboardId={form.workboard}
                onPick={(item) => { setLinkedItem(item); setShowItemPicker(false); }}
                onClose={() => setShowItemPicker(false)}
              />
            )}
            {!form.workboard && (
              <WorkboardPicker
                workspaceId={form.workspace}
                onPick={(wb) => setForm(prev => ({ ...prev, workboard: wb.id }))}
              />
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}