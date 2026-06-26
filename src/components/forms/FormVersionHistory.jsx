import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { useConfirm } from '@/components/shared/ConfirmDialog';
import { History, RotateCcw, ChevronLeft } from 'lucide-react';

export default function FormVersionHistory({ form, onClose }) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState(null);

  const load = useCallback(async () => {
    if (!form?.id) return;
    setLoading(true);
    try {
      const data = await base44.entities.FormVersion.filter({ form: form.id });
      setVersions(data.sort((a, b) => (b.version_number || 0) - (a.version_number || 0)));
    } catch {
      setVersions([]);
    } finally {
      setLoading(false);
    }
  }, [form?.id]);

  useEffect(() => { load(); }, [load]);

  const handleRestore = async (version) => {
    const ok = await confirm({
      title: 'Restore Version?',
      message: `This will restore version ${version.version_number}. Current fields will be replaced. This cannot be undone.`,
      confirmLabel: 'Restore',
      variant: 'warning',
    });
    if (!ok) return;

    try {
      const snapshot = JSON.parse(version.snapshot);
      // Delete current fields
      const currentFields = await base44.entities.FormField.filter({ form: form.id });
      await Promise.all(currentFields.map(f => base44.entities.FormField.delete(f.id)));

      // Recreate fields from snapshot
      if (snapshot.fields && snapshot.fields.length > 0) {
        await base44.entities.FormField.bulkCreate(snapshot.fields.map(f => ({
          ...f,
          id: undefined,
          form: form.id,
        })));
      }

      // Restore form settings
      if (snapshot.form) {
        await base44.entities.Form.update(form.id, {
          title: snapshot.form.title,
          description: snapshot.form.description,
          canvas_layout: snapshot.form.canvas_layout,
        });
      }

      toast({ title: `Version ${version.version_number} restored`, duration: 2000 });
      onClose();
    } catch (e) {
      toast({ title: 'Failed to restore', description: e.message, variant: 'destructive' });
    }
  };

  const formatDate = (d) => {
    try { return new Date(d).toLocaleString(); } catch { return ''; }
  };

  return (
    <Sheet open={!!form} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0">
        <div className="flex items-center gap-2 p-4 border-b">
          {selectedVersion && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedVersion(null)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          )}
          <div className="flex-1">
            <h2 className="font-semibold flex items-center gap-2">
              <History className="w-4 h-4" /> Version History
            </h2>
            <p className="text-xs text-muted-foreground">{form.title}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex-1"><LoadingSpinner /></div>
        ) : selectedVersion ? (
          <div className="flex-1 overflow-auto p-4 space-y-3">
            <div className="rounded-lg border p-3 space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Version {selectedVersion.version_number}</Badge>
                <span className="text-xs text-muted-foreground">{formatDate(selectedVersion.created_date)}</span>
              </div>
              {selectedVersion.change_description && (
                <p className="text-sm text-muted-foreground">{selectedVersion.change_description}</p>
              )}
            </div>
            <Button onClick={() => handleRestore(selectedVersion)} className="w-full">
              <RotateCcw className="w-4 h-4 mr-1.5" /> Restore This Version
            </Button>
          </div>
        ) : versions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <History className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No versions saved yet</p>
            <p className="text-xs text-muted-foreground mt-1">Versions are created when you save changes</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            {versions.map(v => (
              <button
                key={v.id}
                onClick={() => setSelectedVersion(v)}
                className="w-full text-left p-3 border-b hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Version {v.version_number}</span>
                  {v.version_number === form.version && <Badge variant="secondary" className="bg-primary/10 text-primary">Current</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{formatDate(v.created_date)}</p>
                {v.change_description && <p className="text-xs text-muted-foreground mt-1">{v.change_description}</p>}
              </button>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}