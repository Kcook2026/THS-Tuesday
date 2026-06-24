import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Target, ArrowRight, Users } from 'lucide-react';
import { GoalStatusBadge } from '@/components/shared/Phase3Badges';
import { PriorityBadge } from '@/components/shared/StatusBadge';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { logActivity } from '@/hooks/useActivityLogger';
import usePermissions from '@/hooks/usePermissions';

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [users, setUsers] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [quarterFilter, setQuarterFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editGoal, setEditGoal] = useState(null);
  const [form, setForm] = useState({ goal_name: '', description: '', status: 'not_started', priority: 'medium', department: '', start_date: '', target_date: '', quarter: 'Q1', related_portfolio: '' });
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const { can } = usePermissions();

  const load = () => {
    setLoading(true);
    Promise.all([base44.entities.Goal.list(), base44.entities.User.list(), base44.entities.Portfolio.list(), base44.auth.me()])
      .then(([g, u, p, me]) => { setGoals(g); setUsers(u); setPortfolios(p); setUser(me); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const userMap = Object.fromEntries(users.map(u => [u.id, u.full_name]));
  const portfolioMap = Object.fromEntries(portfolios.map(p => [p.id, p.portfolio_name]));

  const openForm = (goal) => {
    setEditGoal(goal);
    if (goal) {
      setForm({ goal_name: goal.goal_name || '', description: goal.description || '', status: goal.status || 'not_started', priority: goal.priority || 'medium', department: goal.department || '', start_date: goal.start_date || '', target_date: goal.target_date || '', quarter: goal.quarter || 'Q1', related_portfolio: goal.related_portfolio || '' });
    } else {
      setForm({ goal_name: '', description: '', status: 'not_started', priority: 'medium', department: '', start_date: '', target_date: '', quarter: 'Q1', related_portfolio: '' });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const data = { ...form, owner: user?.id };
    if (!data.related_portfolio) delete data.related_portfolio;
    if (editGoal) {
      await base44.entities.Goal.update(editGoal.id, data);
      logActivity(user, 'updated goal', 'Goal', editGoal.id, editGoal.goal_name);
    } else {
      await base44.entities.Goal.create(data);
      logActivity(user, 'created goal', 'Goal', '', form.goal_name);
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async (g) => {
    await base44.entities.Goal.delete(g.id);
    logActivity(user, 'deleted goal', 'Goal', g.id, g.goal_name);
    load();
  };

  const filtered = goals.filter(g => {
    if (search && !g.goal_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && g.status !== statusFilter) return false;
    if (quarterFilter !== 'all' && g.quarter !== quarterFilter) return false;
    return true;
  });

  const onTrack = goals.filter(g => g.status === 'on_track').length;
  const achieved = goals.filter(g => g.status === 'achieved').length;
  const atRisk = goals.filter(g => g.status === 'at_risk').length;
  const avgProgress = goals.length ? Math.round(goals.reduce((s, g) => s + (g.progress_percentage || 0), 0) / goals.length) : 0;

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Goals & OKRs" subtitle={`${goals.length} goals · ${achieved} achieved`}>
        {can('canManageGoals') && <Button onClick={() => openForm(null)}><Plus className="w-4 h-4 mr-1.5" /> New Goal</Button>}
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Target className="w-3.5 h-3.5" /> Total Goals</div>
          <p className="text-2xl font-bold">{goals.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">On Track</div>
          <p className="text-2xl font-bold text-blue-600">{onTrack}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">At Risk</div>
          <p className="text-2xl font-bold text-amber-600">{atRisk}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">Avg Progress</div>
          <p className="text-2xl font-bold text-emerald-600">{avgProgress}%</p>
        </CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search goals..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {['not_started','on_track','at_risk','achieved','missed','archived'].map(s => <SelectItem key={s} value={s}>{s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={quarterFilter} onValueChange={setQuarterFilter}>
          <SelectTrigger className="w-full sm:w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Quarters</SelectItem>
            {['Q1','Q2','Q3','Q4'].map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="cards">
        <TabsList>
          <TabsTrigger value="cards">Cards</TabsTrigger>
          <TabsTrigger value="table">OKR Table</TabsTrigger>
        </TabsList>
        <TabsContent value="cards">
          {filtered.length === 0 ? (
            <EmptyState icon={Target} title="No goals found" description="Set your first goal or OKR to track progress" actionLabel={can('canManageGoals') ? 'New Goal' : undefined} onAction={() => can('canManageGoals') && openForm(null)} />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(g => (
                <Card key={g.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-rose-500/10 text-rose-600">
                          <Target className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm truncate">{g.goal_name}</h3>
                          {g.department && <p className="text-xs text-muted-foreground mt-0.5">{g.department}</p>}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"><MoreHorizontal className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {can('canManageGoals') && <DropdownMenuItem onClick={() => openForm(g)}><Pencil className="w-3.5 h-3.5 mr-2" /> Edit</DropdownMenuItem>}
                          {can('canManageGoals') && <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(g)}><Trash2 className="w-3.5 h-3.5 mr-2" /> Delete</DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <GoalStatusBadge status={g.status} />
                      <PriorityBadge priority={g.priority} />
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground">{g.quarter || 'Q1'}</span>
                    </div>
                    {g.owner && <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2"><Users className="w-3 h-3" />{userMap[g.owner] || '—'}</p>}
                    {g.key_results && g.key_results.length > 0 && (
                      <p className="text-xs text-muted-foreground mb-2">{g.key_results.length} key results</p>
                    )}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{g.progress_percentage || 0}%</span>
                      </div>
                      <Progress value={g.progress_percentage || 0} className="h-1.5" />
                    </div>
                    <Link to="/goals" className="flex items-center gap-1 text-sm text-primary hover:gap-2 transition-all mt-3">
                      View details <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="table">
          {filtered.length === 0 ? (
            <EmptyState icon={Target} title="No goals found" description="Set your first goal or OKR" />
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="text-left p-3 font-medium">Goal</th>
                      <th className="text-left p-3 font-medium">Owner</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Priority</th>
                      <th className="text-left p-3 font-medium">Quarter</th>
                      <th className="text-left p-3 font-medium">Target Date</th>
                      <th className="text-left p-3 font-medium">Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filtered.map(g => (
                      <tr key={g.id} className="hover:bg-muted/30">
                        <td className="p-3 font-medium">{g.goal_name}</td>
                        <td className="p-3 text-muted-foreground">{userMap[g.owner] || '—'}</td>
                        <td className="p-3"><GoalStatusBadge status={g.status} /></td>
                        <td className="p-3"><PriorityBadge priority={g.priority} /></td>
                        <td className="p-3 text-muted-foreground">{g.quarter || 'Q1'}</td>
                        <td className="p-3 text-muted-foreground">{g.target_date ? new Date(g.target_date).toLocaleDateString() : '—'}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Progress value={g.progress_percentage || 0} className="h-1.5 w-20" />
                            <span className="text-xs">{g.progress_percentage || 0}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editGoal ? 'Edit Goal' : 'New Goal'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Goal Name *</Label><Input value={form.goal_name} onChange={e => setForm(f => ({...f, goal_name: e.target.value}))} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={2} /></div>
            <div><Label>Department</Label><Input value={form.department} onChange={e => setForm(f => ({...f, department: e.target.value}))} placeholder="e.g. Engineering" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({...f, status: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['not_started','on_track','at_risk','achieved','missed','archived'].map(s => <SelectItem key={s} value={s}>{s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({...f, priority: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['low','medium','high','critical'].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quarter</Label>
                <Select value={form.quarter} onValueChange={v => setForm(f => ({...f, quarter: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Q1','Q2','Q3','Q4'].map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Related Portfolio</Label>
                <Select value={form.related_portfolio} onValueChange={v => setForm(f => ({...f, related_portfolio: v}))}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    {portfolios.map(p => <SelectItem key={p.id} value={p.id}>{p.portfolio_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({...f, start_date: e.target.value}))} /></div>
              <div><Label>Target Date</Label><Input type="date" value={form.target_date} onChange={e => setForm(f => ({...f, target_date: e.target.value}))} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.goal_name}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}