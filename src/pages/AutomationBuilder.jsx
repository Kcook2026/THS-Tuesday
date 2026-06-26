import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, Save, Zap, Play } from 'lucide-react';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { useToast } from '@/components/ui/use-toast';
import usePermissions from '@/hooks/usePermissions';
import TriggerEditor from '@/components/automations/TriggerEditor';
import ConditionEditor from '@/components/automations/ConditionEditor';
import ActionEditor from '@/components/automations/ActionEditor';
import RecipePreview from '@/components/automations/RecipePreview';
import TestRuleDialog from '@/components/automations/TestRuleDialog';
import { getTriggerMeta, getActionMeta } from '@/components/automations/AutomationConstants';

export default function AutomationBuilder() {
  const { ruleId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentWorkspaceId, user, loading: wsLoading } = useWorkspace();
  const { isSystemAdmin, isExecutive, isManager, workspacePermissions, loading: permLoading } = usePermissions();
  const canManage = user?.role === 'admin' || isSystemAdmin || isExecutive || isManager || workspacePermissions?.canManageWorkspaceAutomations;
  const isNew = !ruleId;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [boardData, setBoardData] = useState({ statuses: [], priorities: [], groups: [], columns: [], users: [], teams: [], boards: [], boardMap: {} });
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: '', description: '', status: 'paused', trigger_type: 'status_changed',
    trigger_config: '{}', conditions: '[]', actions: '[]', workboard: searchParams.get('workboard') || '',
  });

  const loadRule = useCallback(async () => {
    if (!ruleId) return;
    try {
      const rule = await base44.entities.AutomationRule.get(ruleId);
      setForm({
        name: rule.name || '', description: rule.description || '', status: rule.status || 'paused',
        trigger_type: rule.trigger_type || 'status_changed', trigger_config: rule.trigger_config || '{}',
        conditions: rule.conditions || '[]', actions: rule.actions || '[]', workboard: rule.workboard || '',
      });
    } catch { navigate('/automations'); }
  }, [ruleId, navigate]);

  const loadBoardData = useCallback(async () => {
    if (!currentWorkspaceId) return;
    const wbId = form.workboard;
    const [members, teams, allBoards] = await Promise.all([
      base44.entities.WorkspaceMember.filter({ workspace: currentWorkspaceId, status: 'active' }).catch(() => []),
      base44.entities.Team.filter({ workspace: currentWorkspaceId }).catch(() => []),
      base44.entities.Workboard.filter({ workspace: currentWorkspaceId, status: 'active' }, '-updated_date', 100).catch(() => []),
    ]);
    const boardMap = {};
    (allBoards || []).forEach(b => { boardMap[b.id] = b.name; });
    let statuses = [], priorities = [], groups = [], columns = [];
    if (wbId) {
      [statuses, priorities, groups, columns] = await Promise.all([
        base44.entities.StatusOption.filter({ workboard: wbId }).catch(() => []),
        base44.entities.PriorityOption.filter({ workboard: wbId }).catch(() => []),
        base44.entities.BoardGroup.filter({ workboard: wbId, archived: false }).catch(() => []),
        base44.entities.BoardColumn.filter({ workboard: wbId, hidden: false, system_column: false }).catch(() => []),
      ]);
      if (statuses.length === 0 && canManage) {
        const defaultStatuses = [
          { label: 'Not Started', color: 'gray' },
          { label: 'Working On It', color: 'blue' },
          { label: 'Stuck', color: 'red' },
          { label: 'Waiting', color: 'amber' },
          { label: 'Done', color: 'green' },
        ];
        await Promise.all(defaultStatuses.map((s, i) =>
          base44.entities.StatusOption.create({
            workspace: currentWorkspaceId, workboard: wbId, label: s.label, color: s.color,
            sort_order: i, is_default: i === 0, created_by: user?.id,
          }).catch(() => {})
        ));
        statuses = await base44.entities.StatusOption.filter({ workboard: wbId }).catch(() => []);
        toast({ title: 'Default statuses created', description: '5 default status options were added to this board.' });
      }
      if (priorities.length === 0 && canManage) {
        const defaultPriorities = [
          { label: 'Critical', color: 'red' },
          { label: 'High', color: 'orange' },
          { label: 'Medium', color: 'yellow' },
          { label: 'Low', color: 'gray' },
        ];
        await Promise.all(defaultPriorities.map((p, i) =>
          base44.entities.PriorityOption.create({
            workspace: currentWorkspaceId, workboard: wbId, label: p.label, color: p.color,
            sort_order: i, is_default: i === 2, created_by: user?.id,
          }).catch(() => {})
        ));
        priorities = await base44.entities.PriorityOption.filter({ workboard: wbId }).catch(() => []);
      }
    } else {
      [statuses, priorities, groups, columns] = await Promise.all([
        base44.entities.StatusOption.filter({ workspace: currentWorkspaceId }).catch(() => []),
        base44.entities.PriorityOption.filter({ workspace: currentWorkspaceId }).catch(() => []),
        base44.entities.BoardGroup.filter({ workspace: currentWorkspaceId, archived: false }).catch(() => []),
        base44.entities.BoardColumn.filter({ workspace: currentWorkspaceId, hidden: false, system_column: false }).catch(() => []),
      ]);
    }
    setBoardData({ statuses, priorities, groups, columns, users: members, teams: teams || [], boards: allBoards || [], boardMap });
  }, [currentWorkspaceId, form.workboard, canManage, user, toast]);

  useEffect(() => { loadRule().finally(() => setLoading(false)); }, [loadRule]);
  useEffect(() => { loadBoardData(); }, [loadBoardData]);

  const validate = () => {
    setValidationError('');
    if (!form.name.trim()) {
      setValidationError('Enter a name for this automation.');
      return false;
    }
    // Only enforce config validation for active rules
    if (form.status !== 'active') return true;

    let tc = {};
    try { tc = JSON.parse(form.trigger_config || '{}'); } catch {}
    const triggerMeta = getTriggerMeta(form.trigger_type);
    if (triggerMeta.hasValue && triggerMeta.valueType !== 'number' && !tc.value) {
      setValidationError(`Select a ${triggerMeta.valueType} before saving this automation.`);
      return false;
    }

    let actions = [];
    try { actions = JSON.parse(form.actions || '[]'); } catch {}
    for (const action of actions) {
      const meta = getActionMeta(action.type);
      if (action.type === 'set_custom_column') {
        if (!action.column) { setValidationError('Select a custom column for the action.'); return false; }
        if (action.value === undefined || action.value === '') { setValidationError('Provide a value for the custom column action.'); return false; }
        continue;
      }
      if (action.type === 'clear_custom_column') {
        if (!action.column) { setValidationError('Select a custom column to clear.'); return false; }
        continue;
      }
      if (meta.hasValue && !action.value) {
        if (meta.valueType === 'status') { setValidationError('Select a status for the action before saving.'); return false; }
        if (meta.valueType === 'priority') { setValidationError('Select a priority for the action before saving.'); return false; }
        if (meta.valueType === 'group') { setValidationError('Select a target group.'); return false; }
        if (meta.valueType === 'user') { setValidationError('Select a notification recipient.'); return false; }
        setValidationError(`Provide a value for the "${meta.label}" action.`);
        return false;
      }
    }
    let conditions = [];
    try { conditions = JSON.parse(form.conditions || '[]'); } catch {}
    for (const cond of conditions) {
      if (cond.field === 'custom_column' && !cond.column) {
        setValidationError('Select a custom column for the condition.');
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        workspace: currentWorkspaceId,
        workboard: form.workboard || null,
        owner: user?.id,
        created_by: user?.id,
      };
      if (ruleId) {
        await base44.entities.AutomationRule.update(ruleId, payload);
      } else {
        await base44.entities.AutomationRule.create({ ...payload, run_count: 0, failure_count: 0, archived: false });
      }
      navigate('/automations');
    } catch (e) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleTest = () => {
    if (!ruleId) {
      toast({ title: 'Save first', description: 'Save the automation before testing it.', variant: 'default' });
      return;
    }
    setTestOpen(true);
  };

  if (loading || wsLoading || permLoading) return <LoadingSpinner />;
  if (!currentWorkspaceId) return <div className="p-8 text-center text-muted-foreground">No workspace found. Create or select a workspace to continue.</div>;
  if (!canManage) return <div className="p-8 text-center text-muted-foreground">You don't have permission to manage automations.</div>;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/automations')}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold">{isNew ? 'New Automation' : 'Edit Automation'}</h1>
      </div>

      <Card className="mb-6">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <Label className="mb-1.5 block">Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Auto-archive completed items" />
            </div>
            <div className="flex items-center gap-2 shrink-0 pt-6">
              <Switch checked={form.status === 'active'} onCheckedChange={v => setForm(f => ({ ...f, status: v ? 'active' : 'paused' }))} />
              <span className="text-sm text-muted-foreground">{form.status === 'active' ? 'Enabled' : 'Disabled'}</span>
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block">Description</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="What does this automation do?" />
          </div>
          <div>
            <Label className="mb-1.5 block">Workboard (optional — leave empty for all boards)</Label>
            <Select value={form.workboard || 'all'} onValueChange={v => setForm(f => ({ ...f, workboard: v === 'all' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="All workboards" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All workboards</SelectItem>
                {currentWorkspaceId && (
                  <WorkboardOptions workspaceId={currentWorkspaceId} />
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">1</span>
              WHEN — Trigger
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TriggerEditor
              triggerType={form.trigger_type}
              triggerConfig={form.trigger_config}
              onChange={({ triggerType, triggerConfig }) => setForm(f => ({ ...f, trigger_type: triggerType, trigger_config: triggerConfig }))}
              boardData={boardData}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center text-[10px] font-bold">2</span>
              IF — Conditions (optional)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ConditionEditor conditions={form.conditions} onChange={c => setForm(f => ({ ...f, conditions: c }))} boardData={boardData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-[10px] font-bold">3</span>
              THEN — Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActionEditor actions={form.actions} onChange={a => setForm(f => ({ ...f, actions: a }))} boardData={boardData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" /> Recipe Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RecipePreview rule={form} boardData={boardData} />
          </CardContent>
        </Card>
      </div>

      {validationError && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm text-amber-700 flex items-start gap-2">
          <Zap className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      <div className="flex justify-end gap-2 mt-6">
        <Button variant="outline" onClick={() => navigate('/automations')}>Cancel</Button>
        {ruleId && (
          <Button variant="outline" onClick={handleTest}>
            <Play className="w-4 h-4 mr-1.5" /> Test Rule
          </Button>
        )}
        <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
          <Save className="w-4 h-4 mr-1.5" /> {saving ? 'Saving...' : 'Save Automation'}
        </Button>
      </div>

      {ruleId && (
        <TestRuleDialog
          open={testOpen}
          onClose={() => setTestOpen(false)}
          ruleId={ruleId}
          workspace={currentWorkspaceId}
          workboard={form.workboard || null}
        />
      )}
    </div>
  );
}

function WorkboardOptions({ workspaceId }) {
  const [boards, setBoards] = React.useState([]);
  React.useEffect(() => {
    base44.entities.Workboard.filter({ workspace: workspaceId, status: 'active' }, '-updated_date', 50)
      .then(setBoards).catch(() => {});
  }, [workspaceId]);
  return boards.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>);
}