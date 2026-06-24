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
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Briefcase, ArrowRight, DollarSign, Calendar } from 'lucide-react';
import { HealthBadge } from '@/components/shared/Phase3Badges';
import { StatusBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { logActivity } from '@/hooks/useActivityLogger';
import usePermissions from '@/hooks/usePermissions';

export default function Portfolios() {
  const [portfolios, setPortfolios] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [healthFilter, setHealthFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPortfolio, setEditPortfolio] = useState(null);
  const [form, setForm] = useState({ portfolio_name: '', description: '', status: 'planning', priority: 'medium', strategic_goal: '', budget: '', actual_spend: '', health: 'on_track', start_date: '', target_date: '' });
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const { can } = usePermissions();

  const load = () => {
    setLoading(true);
    Promise.all([base44.entities.Portfolio.list(), base44.entities.Project.list(), base44.entities.User.list(), base44.auth.me()])
      .then(([p, pr, u, me]) => { setPortfolios(p); setProjects(pr); setUsers(u); setUser(me); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const userMap = Object.fromEntries(users.map(u => [u.id, u.full_name]));
  const projectMap = Object.fromEntries(projects.map(p => [p.id, p.project_name]));

  const openForm = (portfolio) => {
    setEditPortfolio(portfolio);
    if (portfolio) {
      setForm({ portfolio_name: portfolio.portfolio_name || '', description: portfolio.description || '', status: portfolio.status || 'planning', priority: portfolio.priority || 'medium', strategic_goal: portfolio.strategic_goal || '', budget: portfolio.budget || '', actual_spend: portfolio.actual_spend || '', health: portfolio.health || 'on_track', start_date: portfolio.start_date || '', target_date: portfolio.target_date || '' });
    } else {
      setForm({ portfolio_name: '', description: '', status: 'planning', priority: 'medium', strategic_goal: '', budget: '', actual_spend: '', health: 'on_track', start_date: '', target_date: '' });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const data = { ...form, budget: form.budget ? Number(form.budget) : undefined, actual_spend: form.actual_spend ? Number(form.actual_spend) : 0, owner: user?.id };
    if (editPortfolio) {
      await base44.entities.Portfolio.update(editPortfolio.id, data);
      logActivity(user, 'updated portfolio', 'Portfolio', editPortfolio.id, editPortfolio.portfolio_name);
    } else {
      await base44.entities.Portfolio.create(data);
      logActivity(user, 'created portfolio', 'Portfolio', '', form.portfolio_name);
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async (p) => {
    await base44.entities.Portfolio.delete(p.id);
    logActivity(user, 'deleted portfolio', 'Portfolio', p.id, p.portfolio_name);
    load();
  };

  const filtered = portfolios.filter(p => {
    if (search && !p.portfolio_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (healthFilter !== 'all' && p.health !== healthFilter) return false;
    return true;
  });

  const totalBudget = portfolios.reduce((sum, p) => sum + (p.budget || 0), 0);
  const totalSpend = portfolios.reduce((sum, p) => sum + (p.actual_spend || 0), 0);
  const avgCompletion = portfolios.length ? Math.round(portfolios.reduce((sum, p) => sum + (p.completion_percentage || 0), 0) / portfolios.length) : 0;

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Portfolios" subtitle={`${portfolios.length} portfolios`}>
        {can('canManagePortfolios') && <Button onClick={() => openForm(null)}><Plus className="w-4 h-4 mr-1.5" /> New Portfolio</Button>}
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Briefcase className="w-3.5 h-3.5" /> Total Portfolios</div>
          <p className="text-2xl font-bold">{portfolios.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><DollarSign className="w-3.5 h-3.5" /> Total Budget</div>
          <p className="text-2xl font-bold">${totalBudget.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><DollarSign className="w-3.5 h-3.5" /> Total Spend</div>
          <p className="text-2xl font-bold text-amber-600">${totalSpend.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Calendar className="w-3.5 h-3.5" /> Avg Completion</div>
          <p className="text-2xl font-bold text-blue-600">{avgCompletion}%</p>
        </CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search portfolios..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {['planning','active','paused','completed','archived'].map(s => <SelectItem key={s} value={s}>{s.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={healthFilter} onValueChange={setHealthFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Health</SelectItem>
            {['excellent','on_track','at_risk','critical'].map(s => <SelectItem key={s} value={s}>{s.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Briefcase} title="No portfolios found" description="Create your first portfolio to group strategic initiatives" actionLabel={can('canManagePortfolios') ? 'New Portfolio' : undefined} onAction={() => can('canManagePortfolios') && openForm(null)} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-indigo-500/10 text-indigo-600">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <Link to={`/portfolios/${p.id}`} className="font-semibold text-sm hover:text-primary">{p.portfolio_name}</Link>
                      {p.strategic_goal && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{p.strategic_goal}</p>}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"><MoreHorizontal className="w-4 h-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {can('canManagePortfolios') && <DropdownMenuItem onClick={() => openForm(p)}><Pencil className="w-3.5 h-3.5 mr-2" /> Edit</DropdownMenuItem>}
                      {can('canManagePortfolios') && <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(p)}><Trash2 className="w-3.5 h-3.5 mr-2" /> Delete</DropdownMenuItem>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <StatusBadge status={p.status} />
                  <PriorityBadge priority={p.priority} />
                  <HealthBadge health={p.health} />
                </div>
                <div className="space-y-2 text-xs text-muted-foreground">
                  {p.owner && <p>Owner: {userMap[p.owner] || '—'}</p>}
                  {p.budget != null && <p>Budget: ${p.budget.toLocaleString()} · Spend: ${(p.actual_spend || 0).toLocaleString()}</p>}
                  {p.target_date && <p>Target: {new Date(p.target_date).toLocaleDateString()}</p>}
                  <p>Projects: {(p.projects || []).length}</p>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{p.completion_percentage || 0}%</span>
                  </div>
                  <Progress value={p.completion_percentage || 0} className="h-1.5" />
                </div>
                <Link to={`/portfolios/${p.id}`} className="flex items-center gap-1 text-sm text-primary hover:gap-2 transition-all mt-3">
                  Open portfolio <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editPortfolio ? 'Edit Portfolio' : 'New Portfolio'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Portfolio Name *</Label><Input value={form.portfolio_name} onChange={e => setForm(f => ({...f, portfolio_name: e.target.value}))} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={2} /></div>
            <div><Label>Strategic Goal</Label><Input value={form.strategic_goal} onChange={e => setForm(f => ({...f, strategic_goal: e.target.value}))} placeholder="e.g. Expand into EMEA market" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({...f, status: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['planning','active','paused','completed','archived'].map(s => <SelectItem key={s} value={s}>{s.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}</SelectItem>)}
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
            <div>
              <Label>Health</Label>
              <Select value={form.health} onValueChange={v => setForm(f => ({...f, health: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['excellent','on_track','at_risk','critical'].map(s => <SelectItem key={s} value={s}>{s.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Budget</Label><Input type="number" value={form.budget} onChange={e => setForm(f => ({...f, budget: e.target.value}))} /></div>
              <div><Label>Actual Spend</Label><Input type="number" value={form.actual_spend} onChange={e => setForm(f => ({...f, actual_spend: e.target.value}))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({...f, start_date: e.target.value}))} /></div>
              <div><Label>Target Date</Label><Input type="date" value={form.target_date} onChange={e => setForm(f => ({...f, target_date: e.target.value}))} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.portfolio_name}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}