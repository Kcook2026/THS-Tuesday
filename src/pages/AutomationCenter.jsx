import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Zap, Play, History, Clock, CheckCircle, XCircle, SkipForward } from 'lucide-react';
import { AutomationStatusBadge, RunStatusBadge } from '@/components/shared/Phase3Badges';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { logActivity } from '@/hooks/useActivityLogger';
import usePermissions from '@/hooks/usePermissions';

const TRIGGER_TYPES = [
  { value: 'status_changed', label: 'Status Changed' },
  { value: 'priority_changed', label: 'Priority Changed' },
  { value: 'assignee_changed', label: 'Assignee Changed' },
  { value: 'due_date_approaching', label: 'Due Date Approaching' },
  { value: 'due_date_passed', label: 'Due Date Passed' },
  { value: 'task_created', label: 'Task Created' },
  { value: 'task_completed', label: 'Task Completed' },
  { value: 'document_uploaded', label: 'Document Uploaded' },
  { value: 'comment_added', label: 'Comment Added' },
  { value: 'process_step_completed', label: 'Process Step Completed' },
  { value: 'manual', label: 'Manual Trigger' },
];

const ACTION_TYPES = [
  { value: 'create_task', label: 'Create Task' },
  { value: 'update_status', label: 'Update Status' },
  { value: 'assign_user', label: 'Assign User' },
  { value: 'send_notification', label: 'Send Notification' },
  { value: 'create_activity', label: 'Create Activity Log' },
  { value: 'create_process_step', label: 'Create Process Step' },
  { value: 'add_comment', label: 'Add Comment' },
  { value: 'mark_health_at_risk', label: 'Mark Health At Risk' },
];

const TRIGGER_ENTITIES = ['Task', 'Project', 'Document', 'Comment', 'Process', 'Client'];

export default function AutomationCenter() {
  const [rules, setRules] = useState([]);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRule, setEditRule] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', trigger_type: 'task_created', trigger_entity: 'Task', trigger_conditions: '', action_type: 'create_task', action_config: '', status: 'active' });
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const { can } = usePermissions();

  const load = () => {
    setLoading(true);
    Promise.all([base44.entities.AutomationRule.list(), base44.entities.AutomationRun.list('-run_date', 20), base44.auth.me()])
      .then(([r, rn, u]) => { setRules(r); setRuns(rn); setUser(u); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openForm = (rule) => {
    setEditRule(rule);
    if (rule) {
      setForm({ name: rule.name || '', description: rule.description || '', trigger_type: rule.trigger_type || 'task_created', trigger_entity: rule.trigger_entity || 'Task', trigger_conditions: rule.trigger_conditions || '', action_type: rule.action_type || 'create_task', action_config: rule.action_config || '', status: rule.status || 'active' });
    } else {
      setForm({ name: '', description: '', trigger_type: 'task_created', trigger_entity: 'Task', trigger_conditions: '', action_type: 'create_task', action_config: '', status: 'active' });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const data = { ...form, owner: user?.id };
    if (editRule) {
      await base44.entities.AutomationRule.update(editRule.id, data);
      logActivity(user, 'updated automation rule', 'AutomationRule', editRule.id, editRule.name);
    } else {
      await base44.entities.AutomationRule.create(data);
      logActivity(user, 'created automation rule', 'AutomationRule', '', form.name);
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async (rule) => {
    await base44.entities.AutomationRule.delete(rule.id);
    logActivity(user, 'deleted automation rule', 'AutomationRule', rule.id, rule.name);
    load();
  };

  const handleToggle = async (rule) => {
    const newStatus = rule.status === 'active' ? 'paused' : 'active';
    await base44.entities.AutomationRule.update(rule.id, { status: newStatus });
    logActivity(user, `${newStatus === 'active' ? 'enabled' : 'disabled'} automation`, 'AutomationRule', rule.id, rule.name);
    load();
  };

  const handleRunNow = async (rule) => {
    await base44.entities.AutomationRule.update(rule.id, { run_count: (rule.run_count || 0) + 1 });
    await base44.entities.AutomationRun.create({
      automation_rule: rule.id,
      automation_rule_name: rule.name,
      status: 'success',
      trigger_record_type: rule.trigger_entity,
      result_message: 'Manual run completed successfully',
      executed_actions: rule.action_type,
      run_date: new Date().toISOString(),
    });
    logActivity(user, 'ran automation', 'AutomationRule', rule.id, rule.name);
    load();
  };

  const filtered = rules.filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()));
  const activeCount = rules.filter(r => r.status === 'active').length;
  const successCount = runs.filter(r => r.status === 'success').length;
  const failedCount = runs.filter(r => r.status === 'failed').length;

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Automation Center" subtitle={`${activeCount} active rules · ${rules.length} total`}>
        {can('canManageAutomations') && <Button onClick={() => openForm(null)}><Plus className="w-4 h-4 mr-1.5" /> New Rule</Button>}
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Zap className="w-3.5 h-3.5" /> Total Rules</div>
          <p className="text-2xl font-bold">{rules.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><CheckCircle className="w-3.5 h-3.5" /> Active</div>
          <p className="text-2xl font-bold text-emerald-600">{activeCount}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><CheckCircle className="w-3.5 h-3.5" /> Successful Runs</div>
          <p className="text-2xl font-bold text-blue-600">{successCount}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><XCircle className="w-3.5 h-3.5" /> Failed Runs</div>
          <p className="text-2xl font-bold text-red-600">{failedCount}</p>
        </CardContent></Card>
      </div>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search automations..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="history">Run History</TabsTrigger>
        </TabsList>
        <TabsContent value="rules">
          {filtered.length === 0 ? (
            <EmptyState icon={Zap} title="No automations yet" description="Create your first automation rule to streamline repetitive work" actionLabel={can('canManageAutomations') ? 'New Rule' : undefined} onAction={() => can('canManageAutomations') && openForm(null)} />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(rule => (
                <Card key={rule.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-violet-500/10 text-violet-600">
                          <Zap className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm truncate">{rule.name}</h3>
                          {rule.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{rule.description}</p>}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"><MoreHorizontal className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {can('canRunAutomations') && <DropdownMenuItem onClick={() => handleRunNow(rule)}><Play className="w-3.5 h-3.5 mr-2" /> Run Now</DropdownMenuItem>}
                          {can('canManageAutomations') && <DropdownMenuItem onClick={() => openForm(rule)}><Pencil className="w-3.5 h-3.5 mr-2" /> Edit</DropdownMenuItem>}
                          {can('canManageAutomations') && <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(rule)}><Trash2 className="w-3.5 h-3.5 mr-2" /> Delete</DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <AutomationStatusBadge status={rule.status} />
                      <span className="text-[11px] text-muted-foreground">{rule.run_count || 0} runs</span>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p><span className="font-medium text-foreground/70">Trigger:</span> {TRIGGER_TYPES.find(t => t.value === rule.trigger_type)?.label || rule.trigger_type}</p>
                      <p><span className="font-medium text-foreground/70">Action:</span> {ACTION_TYPES.find(a => a.value === rule.action_type)?.label || rule.action_type}</p>
                    </div>
                    {can('canManageAutomations') && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                        <Switch checked={rule.status === 'active'} onCheckedChange={() => handleToggle(rule)} />
                        <span className="text-xs text-muted-foreground">{rule.status === 'active' ? 'Enabled' : 'Disabled'}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="history">
          {runs.length === 0 ? (
            <EmptyState icon={History} title="No run history" description="Automation runs will appear here once triggered" />
          ) : (
            <Card>
              <div className="divide-y">
                {runs.map(run => (
                  <div key={run.id} className="flex items-center gap-3 p-4">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-muted">
                      {run.status === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : run.status === 'failed' ? <XCircle className="w-4 h-4 text-red-600" /> : <SkipForward className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{run.automation_rule_name || 'Unknown Rule'}</p>
                      <p className="text-xs text-muted-foreground">{run.result_message || 'No result message'}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <RunStatusBadge status={run.status} />
                      {run.run_date && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(run.run_date).toLocaleString()}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editRule ? 'Edit Automation Rule' : 'New Automation Rule'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={2} /></div>
            <div>
              <Label>Trigger Type</Label>
              <Select value={form.trigger_type} onValueChange={v => setForm(f => ({...f, trigger_type: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Trigger Entity</Label>
              <Select value={form.trigger_entity} onValueChange={v => setForm(f => ({...f, trigger_entity: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_ENTITIES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Trigger Conditions</Label><Input value={form.trigger_conditions} onChange={e => setForm(f => ({...f, trigger_conditions: e.target.value}))} placeholder="e.g. status = done AND priority = high" /></div>
            <div>
              <Label>Action Type</Label>
              <Select value={form.action_type} onValueChange={v => setForm(f => ({...f, action_type: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Action Configuration</Label><Textarea value={form.action_config} onChange={e => setForm(f => ({...f, action_config: e.target.value}))} rows={2} placeholder="JSON or key-value config for the action" /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.name}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}