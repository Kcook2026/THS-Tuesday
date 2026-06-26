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
import { ChevronLeft, Save, Zap } from 'lucide-react';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import TriggerEditor from '@/components/automations/TriggerEditor';
import ConditionEditor from '@/components/automations/ConditionEditor';
import ActionEditor from '@/components/automations/ActionEditor';
import RecipePreview from '@/components/automations/RecipePreview';

export default function AutomationBuilder() {
  const { ruleId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentWorkspaceId, user } = useWorkspace();
  const isNew = !ruleId;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [boardData, setBoardData] = useState({ statuses: [], priorities: [], groups: [], users: [] });
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
    const [members] = await Promise.all([
      base44.entities.WorkspaceMember.filter({ workspace: currentWorkspaceId, status: 'active' }).catch(() => []),
    ]);
    let statuses = [], priorities = [], groups = [];
    if (wbId) {
      [statuses, priorities, groups] = await Promise.all([
        base44.entities.StatusOption.filter({ workboard: wbId }).catch(() => []),
        base44.entities.PriorityOption.filter({ workboard: wbId }).catch(() => []),
        base44.entities.BoardGroup.filter({ workboard: wbId, archived: false }).catch(() => []),
      ]);
    }
    setBoardData({ statuses, priorities, groups, users: members });
  }, [currentWorkspaceId, form.workboard]);

  useEffect(() => { loadRule().finally(() => setLoading(false)); }, [loadRule]);
  useEffect(() => { loadBoardData(); }, [loadBoardData]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
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
      console.error('Save failed:', e);
    } finally { setSaving(false); }
  };

  if (loading) return <LoadingSpinner />;

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
            <RecipePreview rule={form} />
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <Button variant="outline" onClick={() => navigate('/automations')}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
          <Save className="w-4 h-4 mr-1.5" /> {saving ? 'Saving...' : 'Save Automation'}
        </Button>
      </div>
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