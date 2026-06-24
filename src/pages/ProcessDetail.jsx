import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Trash2, GripVertical, CheckCircle2, Circle, Clock, FileText } from 'lucide-react';
import { ProcessStatusBadge } from '@/components/shared/EnhancedBadges';
import Breadcrumbs from '@/components/shared/Breadcrumbs';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import CommentSection from '@/components/shared/CommentSection';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { logActivity } from '@/hooks/useActivityLogger';

const STEP_STATUSES = ['pending', 'in_progress', 'completed', 'skipped'];
const STEP_STATUS_STYLES = {
  pending: 'bg-slate-400',
  in_progress: 'bg-violet-500',
  completed: 'bg-emerald-500',
  skipped: 'bg-slate-300',
};

export default function ProcessDetail() {
  const { id } = useParams();
  const [process, setProcess] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newStep, setNewStep] = useState({ step_name: '', description: '', owner: '', due_offset: '', status: 'pending' });
  const [user, setUser] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([base44.entities.Process.get(id), base44.entities.User.list(), base44.auth.me()])
      .then(([p, u, me]) => { setProcess(p); setUsers(u); setUser(me); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const userMap = Object.fromEntries(users.map(u => [u.id, u.full_name]));

  const update = async (data) => {
    await base44.entities.Process.update(process.id, data);
  };

  const addStep = async () => {
    if (!newStep.step_name.trim()) return;
    const steps = [...(process.steps || []), { ...newStep, due_offset: Number(newStep.due_offset) || 0 }];
    await update({ steps });
    logActivity(user, 'added step to', 'Process', process.id, process.process_name);
    setNewStep({ step_name: '', description: '', owner: '', due_offset: '', status: 'pending' });
    load();
  };

  const updateStep = async (idx, field, value) => {
    const steps = [...(process.steps || [])];
    steps[idx] = { ...steps[idx], [field]: value };
    await update({ steps });
    if (field === 'status' && value === 'completed') {
      logActivity(user, 'completed step in', 'Process', process.id, steps[idx].step_name);
    }
    load();
  };

  const removeStep = async (idx) => {
    const steps = (process.steps || []).filter((_, i) => i !== idx);
    await update({ steps });
    load();
  };

  if (loading) return <LoadingSpinner />;
  if (!process) return <div className="py-16 text-center text-muted-foreground">Process not found</div>;

  const steps = process.steps || [];
  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const pct = steps.length > 0 ? Math.round((completedSteps / steps.length) * 100) : 0;

  return (
    <div>
      <Breadcrumbs items={[
        { label: 'Processes', path: '/processes' },
        { label: process.process_name },
      ]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{process.process_name}</h1>
          {process.description && <p className="text-sm text-muted-foreground mt-0.5">{process.description}</p>}
        </div>
        <ProcessStatusBadge status={process.status} />
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">{completedSteps} of {steps.length} steps completed</span>
          <span className="font-medium">{pct}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <Tabs defaultValue="steps">
        <TabsList>
          <TabsTrigger value="steps">Steps</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
        </TabsList>

        <TabsContent value="steps" className="mt-4">
          <Card>
            <CardContent className="p-4">
              {steps.length === 0 && <p className="text-sm text-muted-foreground text-center py-4 mb-4">No steps yet. Add the first one below.</p>}
              <div className="space-y-2">
                {steps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow">
                    <div className="flex flex-col items-center pt-1">
                      <GripVertical className="w-4 h-4 text-muted-foreground/30" />
                      <div className={`w-3 h-3 rounded-full ${STEP_STATUS_STYLES[step.status] || 'bg-slate-400'}`} />
                      {idx < steps.length - 1 && <div className="w-0.5 flex-1 bg-border mt-1 min-h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">Step {idx + 1}</span>
                        {step.status === 'completed' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Circle className="w-3.5 h-3.5 text-muted-foreground" />}
                      </div>
                      <Input
                        value={step.step_name || ''}
                        onChange={e => updateStep(idx, 'step_name', e.target.value)}
                        className="h-7 text-sm font-medium border-0 px-0 focus-visible:ring-0"
                      />
                      {step.description && <Textarea
                        value={step.description}
                        onChange={e => updateStep(idx, 'description', e.target.value)}
                        rows={1}
                        className="text-xs text-muted-foreground border-0 px-0 focus-visible:ring-0 resize-none mt-1"
                      />}
                      <div className="flex items-center gap-3 mt-2">
                        <Select value={step.status || 'pending'} onValueChange={v => updateStep(idx, 'status', v)}>
                          <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STEP_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Select value={step.owner || ''} onValueChange={v => updateStep(idx, 'owner', v)}>
                          <SelectTrigger className="h-7 w-32 text-xs"><SelectValue placeholder="Owner" /></SelectTrigger>
                          <SelectContent>
                            {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        {step.due_offset > 0 && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />+{step.due_offset}d</span>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeStep(idx)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Add Step */}
              <div className="border-t mt-4 pt-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input placeholder="Step name" value={newStep.step_name} onChange={e => setNewStep(s => ({...s, step_name: e.target.value}))} className="flex-1" />
                  <Input placeholder="Due offset (days)" type="number" value={newStep.due_offset} onChange={e => setNewStep(s => ({...s, due_offset: e.target.value}))} className="w-full sm:w-32" />
                  <Select value={newStep.owner} onValueChange={v => setNewStep(s => ({...s, owner: v}))}>
                    <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Owner" /></SelectTrigger>
                    <SelectContent>
                      {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button onClick={addStep}><Plus className="w-4 h-4 mr-1.5" /> Add Step</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <CommentSection recordType="Process" recordId={process.id} recordName={process.process_name} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}