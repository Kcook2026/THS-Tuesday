import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Workflow, ArrowRight } from 'lucide-react';
import { ProcessStatusBadge } from '@/components/shared/EnhancedBadges';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { logActivity } from '@/hooks/useActivityLogger';
import { useToast } from '@/components/ui/use-toast';

export default function Processes() {
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProcess, setEditProcess] = useState(null);
  const [form, setForm] = useState({ process_name: '', description: '', department: '', status: 'draft' });
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const { currentWorkspaceId } = useWorkspace();
  const { toast } = useToast();

  const load = () => {
    if (!currentWorkspaceId) return;
    setLoading(true);
    Promise.all([base44.entities.Process.filter({ workspace: currentWorkspaceId }), base44.auth.me()])
      .then(([p, me]) => { setProcesses(p); setUser(me); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('create') === 'true') {
      openForm(null);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => { load(); }, [currentWorkspaceId]);

  const openForm = (proc) => {
    setEditProcess(proc);
    if (proc) {
      setForm({ process_name: proc.process_name || '', description: proc.description || '', department: proc.department || '', status: proc.status || 'draft' });
    } else {
      setForm({ process_name: '', description: '', department: '', status: 'draft' });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editProcess) {
        await base44.entities.Process.update(editProcess.id, form);
        logActivity(user, 'updated process', 'Process', editProcess.id, editProcess.process_name);
        toast({ title: 'Process updated' });
      } else {
        await base44.entities.Process.create({ ...form, steps: [], workspace: currentWorkspaceId });
        logActivity(user, 'created process', 'Process', '', form.process_name);
        toast({ title: 'Process created' });
      }
      setDialogOpen(false);
      load();
    } catch (error) {
      toast({ title: 'Error saving process', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p) => {
    try {
      await base44.entities.Process.delete(p.id);
      logActivity(user, 'deleted process', 'Process', p.id, p.process_name);
      toast({ title: 'Process deleted' });
      load();
    } catch (error) {
      toast({ title: 'Error deleting process', description: error.message, variant: 'destructive' });
    }
  };

  const filtered = processes.filter(p => !search || p.process_name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="SOPs" subtitle={`${processes.length} standard operating procedures`}>
        <Button onClick={() => openForm(null)}><Plus className="w-4 h-4 mr-1.5" /> New SOP</Button>
      </PageHeader>

      <div className="mb-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search SOPs..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Workflow} title="No SOPs found" description="Define your first SOP to standardize workflows" actionLabel="New SOP" onAction={() => openForm(null)} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => {
            const steps = p.steps || [];
            const completed = steps.filter(s => s.status === 'completed').length;
            const pct = steps.length > 0 ? Math.round((completed / steps.length) * 100) : 0;
            return (
              <Card key={p.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                        <Workflow className="w-5 h-5 text-amber-600" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm truncate">{p.process_name}</h3>
                        {p.department && <p className="text-xs text-muted-foreground mt-0.5">{p.department}</p>}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"><MoreHorizontal className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openForm(p)}><Pencil className="w-3.5 h-3.5 mr-2" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(p)}><Trash2 className="w-3.5 h-3.5 mr-2" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {p.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{p.description}</p>}
                  <div className="flex items-center gap-2 mb-3">
                    <ProcessStatusBadge status={p.status} />
                    <span className="text-xs text-muted-foreground">{steps.length} steps</span>
                  </div>
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Completion</span>
                      <span className="font-medium">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <Link to={`/processes/${p.id}`} className="flex items-center gap-1 text-sm text-primary hover:gap-2 transition-all">
                    Open process <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editProcess ? 'Edit Process' : 'New Process'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Process Name *</Label><Input value={form.process_name} onChange={e => setForm(f => ({...f, process_name: e.target.value}))} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Department</Label><Input value={form.department} onChange={e => setForm(f => ({...f, department: e.target.value}))} /></div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({...f, status: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['draft','active','paused','completed','archived'].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.process_name}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}