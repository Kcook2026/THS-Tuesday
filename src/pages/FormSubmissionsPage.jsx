import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import FormSubmissions from '@/components/forms/FormSubmissions';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ChevronLeft } from 'lucide-react';

export default function FormSubmissionsPage() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!formId) return;
    setLoading(true);
    try {
      const [f, u] = await Promise.all([
        base44.entities.Form.get(formId),
        base44.entities.User.list().catch(() => []),
      ]);
      setForm(f);
      setUsers(u);
    } catch (e) {
      toast({ title: 'Failed to load form', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [formId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;
  if (!form) return <div className="p-8 text-center text-muted-foreground">Form not found</div>;

  const backUrl = form.workboard ? `/workboards/${form.workboard}` : '/forms';

  return (
    <div className="p-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(backUrl)} className="mb-4">
        <ChevronLeft className="w-4 h-4 mr-1" /> Back
      </Button>
      <div className="max-w-2xl mx-auto">
        <div className="rounded-lg border">
          <FormSubmissions
            form={form}
            users={users}
            items={[]}
            onItemClick={() => {}}
            onClose={() => navigate(backUrl)}
          />
        </div>
      </div>
    </div>
  );
}