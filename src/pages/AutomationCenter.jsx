import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Zap, Pencil, Trash2, Clock, CheckCircle, XCircle, Sparkles, Play } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import RecipePreview from '@/components/automations/RecipePreview';
import RecipeGallery from '@/components/automations/RecipeGallery';
import TestRuleDialog from '@/components/automations/TestRuleDialog';
import usePermissions from '@/hooks/usePermissions';

export default function AutomationCenter() {
  const navigate = useNavigate();
  const { currentWorkspaceId, user, loading: wsLoading } = useWorkspace();
  const { isSystemAdmin, isExecutive, isManager, workspacePermissions, loading: permLoading } = usePermissions();
  const canManage = user?.role === 'admin' || isSystemAdmin || isExecutive || isManager || workspacePermissions?.canManageWorkspaceAutomations;

  const [rules, setRules] = useState([]);
  const [runs, setRuns] = useState([]);
  const [workboards, setWorkboards] = useState([]);
  const [boardData, setBoardData] = useState({});
  const [loading, setLoading] = useState(true);
  const [filterWorkboard, setFilterWorkboard] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterOwner, setFilterOwner] = useState('all');
  const [failedOnly, setFailedOnly] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [testRule, setTestRule] = useState(null);

  const load = useCallback(() => {
    if (!currentWorkspaceId) return;
    setLoading(true);
    Promise.all([
      base44.entities.AutomationRule.filter({ workspace: currentWorkspaceId }, '-updated_date', 100),
      base44.entities.AutomationRun.filter({ workspace: currentWorkspaceId }, '-started_date', 50),
      base44.entities.Workboard.filter({ workspace: currentWorkspaceId, status: 'active' }, '-updated_date', 50).catch(() => []),
      base44.entities.BoardGroup.filter({ workspace: currentWorkspaceId, archived: false }).catch(() => []),
      base44.entities.WorkspaceMember.filter({ workspace: currentWorkspaceId, status: 'active' }).catch(() => []),
      base44.entities.Team.filter({ workspace: currentWorkspaceId }).catch(() => []),
      base44.entities.BoardColumn.filter({ workspace: currentWorkspaceId, hidden: false, system_column: false }).catch(() => []),
      base44.entities.StatusOption.filter({ workspace: currentWorkspaceId }).catch(() => []),
      base44.entities.PriorityOption.filter({ workspace: currentWorkspaceId }).catch(() => []),
    ]).then(([r, rn, wbs, groups, users, teams, columns, statuses, priorities]) => {
      setRules(r); setRuns(rn); setWorkboards(wbs || []);
      const boardMap = {};
      (wbs || []).forEach(b => { boardMap[b.id] = b.name; });
      setBoardData({ groups: groups || [], users: users || [], teams: teams || [], columns: columns || [], statuses: statuses || [], priorities: priorities || [], boardMap });
    }).catch(() => {}).finally(() => setLoading(false));
  }, [currentWorkspaceId]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (rule) => {
    const newStatus = rule.status === 'active' ? 'paused' : 'active';
    await base44.entities.AutomationRule.update(rule.id, { status: newStatus });
    load();
  };

  const handleDelete = async (rule) => {
    await base44.entities.AutomationRule.update(rule.id, { archived: true, status: 'archived' });
    load();
  };

  const handleSeed = () => {
    setGalleryOpen(true);
  };

  const filtered = rules.filter(r => {
    if (r.archived) return false;
    if (filterWorkboard !== 'all' && r.workboard !== filterWorkboard) return false;
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterOwner !== 'all' && r.created_by !== filterOwner) return false;
    if (failedOnly && !(r.failure_count > 0)) return false;
    return true;
  });

  const activeCount = rules.filter(r => r.status === 'active' && !r.archived).length;
  const successCount = runs.filter(r => r.status === 'success').length;
  const failedCount = runs.filter(r => r.status === 'failed').length;

  if (loading || wsLoading || permLoading) return <LoadingSpinner />;
  if (!currentWorkspaceId) return (
    <div className="p-8 text-center text-muted-foreground">No workspace found. Create or select a workspace to continue.</div>
  );

  return (
    <div>
      <PageHeader title="Automation Center" subtitle={`${activeCount} active · ${rules.filter(r => !r.archived).length} total rules`}>
        <Button variant="outline" onClick={handleSeed} disabled={!canManage}>
          <Sparkles className="w-4 h-4 mr-1.5" /> Starter Recipes
        </Button>
        {canManage && (
          <Button onClick={() => navigate('/automations/builder')}>
            <Plus className="w-4 h-4 mr-1.5" /> New Automation
          </Button>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Zap className="w-3.5 h-3.5" /> Total Rules</div>
          <p className="text-2xl font-bold">{rules.filter(r => !r.archived).length}</p>
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

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="history">Run History</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={filterWorkboard} onValueChange={setFilterWorkboard}>
              <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Workboard" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All workboards</SelectItem>
                {workboards.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterOwner} onValueChange={setFilterOwner}>
              <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Owner" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All owners</SelectItem>
                {[...new Set(rules.filter(r => !r.archived && r.created_by).map(r => r.created_by))].map(uid => {
                  const rule = rules.find(r => r.created_by === uid);
                  return <SelectItem key={uid} value={uid}>{rule.owner_name || rule.created_by || 'Unknown'}</SelectItem>;
                })}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={failedOnly} onChange={e => setFailedOnly(e.target.checked)} className="rounded" />
              Failed only
            </label>
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={Zap} title="No automations yet" description="Create your first automation rule or seed starter recipes to get going." actionLabel={canManage ? 'New Automation' : undefined} onAction={() => canManage && navigate('/automations/builder')} />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(rule => (
                <Card key={rule.id} className="hover:shadow-md transition-shadow flex flex-col">
                  <CardContent className="p-5 flex flex-col flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {rule.is_starter && <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                        <h3 className="font-semibold text-sm truncate">{rule.name}</h3>
                      </div>
                      {canManage && (
                        <Switch checked={rule.status === 'active'} onCheckedChange={() => handleToggle(rule)} />
                      )}
                    </div>
                    {rule.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{rule.description}</p>}
                    <div className="mb-3">
                      <RecipePreview rule={rule} boardData={boardData} />
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-auto pt-3 border-t">
                      <Badge variant={rule.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">{rule.status}</Badge>
                      <span>{rule.run_count || 0} runs</span>
                      {(rule.failure_count || 0) > 0 && <span className="text-red-500">{rule.failure_count} failed</span>}
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-1 mt-3">
                         <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => navigate(`/automations/${rule.id}/edit`)}>
                           <Pencil className="w-3 h-3 mr-1" /> Edit
                         </Button>
                         <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setTestRule(rule)}>
                           <Play className="w-3 h-3 mr-1" /> Test
                         </Button>
                         <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleDelete(rule)}>
                           <Trash2 className="w-3 h-3 mr-1 text-destructive" /> Delete
                         </Button>
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
            <EmptyState icon={Clock} title="No run history" description="Automation runs will appear here once triggered." />
          ) : (
            <Card>
              <div className="divide-y">
                {runs.filter(r => !failedOnly || r.status === 'failed').map(run => {
                  const rule = rules.find(r => r.id === run.rule);
                  return (
                    <div key={run.id} className="flex items-center gap-3 p-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${run.status === 'success' ? 'bg-emerald-500/10' : run.status === 'failed' ? 'bg-red-500/10' : 'bg-muted'}`}>
                        {run.status === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : run.status === 'failed' ? <XCircle className="w-4 h-4 text-red-600" /> : <Clock className="w-4 h-4 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{rule?.name || 'Unknown Rule'}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{run.trigger_type?.replace(/_/g, ' ')}</span>
                          {run.error_message ? (
                            <p className="text-xs text-red-500 truncate">{run.error_message}</p>
                          ) : run.actions_performed ? (
                            <p className="text-xs text-muted-foreground truncate">{JSON.parse(run.actions_performed || '[]').map(a => a.action).join(', ') || 'No actions'}</p>
                          ) : null}
                        </div>
                      </div>
                      <Badge variant={run.status === 'success' ? 'default' : run.status === 'failed' ? 'destructive' : 'secondary'} className="text-[10px]">{run.status}</Badge>
                      {run.started_date && <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0"><Clock className="w-3 h-3" />{new Date(run.started_date).toLocaleString()}</span>}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      <RecipeGallery open={galleryOpen} onClose={() => setGalleryOpen(false)} workboards={workboards} />
      {testRule && (
        <TestRuleDialog
          open={!!testRule}
          onClose={() => setTestRule(null)}
          ruleId={testRule.id}
          workspace={currentWorkspaceId}
          workboard={testRule.workboard || null}
        />
      )}
    </div>
  );
}