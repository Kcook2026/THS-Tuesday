import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { DISPLAY_ONLY_TYPES, FILE_FIELD_TYPES } from '@/components/forms/FormConstants';
import FormFieldRenderer from '@/components/forms/FormFieldRenderer';
import { ChevronLeft, Send, CheckCircle2, ExternalLink } from 'lucide-react';

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
      if (f?.workspace) {
        const [allUsers, allTeams] = await Promise.all([
          base44.entities.User.list().catch(() => []),
          base44.entities.Team.filter({ workspace: f.workspace }).catch(() => []),
        ]);
        setUsers(allUsers);
        setTeams(allTeams);
      }
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
    // Validate required fields
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
      // Upload files first
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

      // Submit form via backend function
      const response = await base44.functions.invoke('submitForm', {
        formId: form.id,
        values,
        fileUrls,
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

  if (form.status !== 'active') {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-lg font-semibold mb-2">This form is not published</p>
            <p className="text-sm text-muted-foreground mb-4">The form owner needs to publish this form before it can accept submissions.</p>
            <Button variant="outline" onClick={() => navigate(`/workboards/${form.workboard}`)}>
              <ChevronLeft className="w-4 h-4 mr-1.5" /> Back to Workboard
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
            <p className="text-sm text-muted-foreground mb-4">Your form has been submitted and a workboard item has been created.</p>
            {result.item_title && <p className="text-sm font-medium mb-4">Item: {result.item_title}</p>}
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={() => navigate(`/workboards/${form.workboard}`)}>
                <ExternalLink className="w-4 h-4 mr-1.5" /> View Item
              </Button>
              <Button onClick={() => { setResult(null); setValues({}); setFileObjects({}); }}>
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
      <Button variant="ghost" size="sm" onClick={() => navigate(`/workboards/${form.workboard}`)} className="mb-4">
        <ChevronLeft className="w-4 h-4 mr-1" /> Back
      </Button>

      <div className="mb-6 pb-4 border-b">
        <h1 className="text-2xl font-bold">{form.title}</h1>
        {form.description && <p className="text-sm text-muted-foreground mt-1">{form.description}</p>}
      </div>

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
    </div>
  );
}