import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, MoreHorizontal, Pencil, Trash2, DollarSign, TrendingUp, TrendingDown, Receipt, CheckCircle, Clock } from 'lucide-react';
import { FinanceStatusBadge } from '@/components/shared/Phase3Badges';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { logActivity } from '@/hooks/useActivityLogger';
import usePermissions from '@/hooks/usePermissions';

const RECORD_TYPES = ['budget', 'expense', 'revenue', 'invoice', 'forecast'];
const RECORD_STATUSES = ['planned', 'submitted', 'approved', 'paid', 'rejected'];

export default function Finance() {
  const [records, setRecords] = useState([]);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [form, setForm] = useState({ record_type: 'expense', project: '', client: '', portfolio: '', category: '', amount: '', date: '', description: '', status: 'planned' });
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const { can } = usePermissions();

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.FinancialRecord.list(),
      base44.entities.Project.list(),
      base44.entities.Client.list(),
      base44.entities.Portfolio.list(),
      base44.entities.User.list(),
      base44.auth.me(),
    ]).then(([r, p, c, po, u, me]) => { setRecords(r); setProjects(p); setClients(c); setPortfolios(po); setUsers(u); setUser(me); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const projectMap = Object.fromEntries(projects.map(p => [p.id, p.project_name]));
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.company_name]));
  const portfolioMap = Object.fromEntries(portfolios.map(p => [p.id, p.portfolio_name]));

  const filtered = records.filter(r => {
    if (typeFilter !== 'all' && r.record_type !== typeFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    return true;
  });

  const totalBudget = records.filter(r => r.record_type === 'budget').reduce((s, r) => s + (r.amount || 0), 0);
  const totalExpense = records.filter(r => r.record_type === 'expense').reduce((s, r) => s + (r.amount || 0), 0);
  const totalRevenue = records.filter(r => r.record_type === 'revenue').reduce((s, r) => s + (r.amount || 0), 0);
  const pendingRecords = records.filter(r => r.status === 'submitted').length;
  const profit = totalRevenue - totalExpense;

  // Budget vs actual by project
  const projectFinances = {};
  projects.forEach(p => {
    const budgets = records.filter(r => r.project === p.id && r.record_type === 'budget').reduce((s, r) => s + (r.amount || 0), 0);
    const expenses = records.filter(r => r.project === p.id && r.record_type === 'expense').reduce((s, r) => s + (r.amount || 0), 0);
    const revenue = records.filter(r => r.project === p.id && r.record_type === 'revenue').reduce((s, r) => s + (r.amount || 0), 0);
    projectFinances[p.id] = { budget: budgets, expenses, revenue, profit: revenue - expenses };
  });

  const openForm = (record) => {
    setEditRecord(record);
    if (record) {
      setForm({ record_type: record.record_type || 'expense', project: record.project || '', client: record.client || '', portfolio: record.portfolio || '', category: record.category || '', amount: record.amount || '', date: record.date || '', description: record.description || '', status: record.status || 'planned' });
    } else {
      setForm({ record_type: 'expense', project: '', client: '', portfolio: '', category: '', amount: '', date: '', description: '', status: 'planned' });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const data = { ...form, amount: Number(form.amount), owner: user?.id };
    if (!data.project) delete data.project;
    if (!data.client) delete data.client;
    if (!data.portfolio) delete data.portfolio;
    if (editRecord) {
      await base44.entities.FinancialRecord.update(editRecord.id, data);
      logActivity(user, 'updated financial record', 'FinancialRecord', editRecord.id, `${data.record_type} ${data.amount}`);
    } else {
      await base44.entities.FinancialRecord.create(data);
      logActivity(user, 'created financial record', 'FinancialRecord', '', `${data.record_type} ${data.amount}`);
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async (r) => {
    await base44.entities.FinancialRecord.delete(r.id);
    logActivity(user, 'deleted financial record', 'FinancialRecord', r.id, `${r.record_type} ${r.amount}`);
    load();
  };

  const handleApprove = async (r) => {
    await base44.entities.FinancialRecord.update(r.id, { status: 'approved' });
    logActivity(user, 'approved financial record', 'FinancialRecord', r.id, `${r.record_type} ${r.amount}`);
    load();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Financial Operations" subtitle={`${records.length} records`}>
        {can('canManageFinance') && <Button onClick={() => openForm(null)}><Plus className="w-4 h-4 mr-1.5" /> New Record</Button>}
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><DollarSign className="w-3.5 h-3.5" /> Total Budget</div>
          <p className="text-2xl font-bold">${totalBudget.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><TrendingDown className="w-3.5 h-3.5" /> Total Expenses</div>
          <p className="text-2xl font-bold text-red-600">${totalExpense.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><TrendingUp className="w-3.5 h-3.5" /> Total Revenue</div>
          <p className="text-2xl font-bold text-emerald-600">${totalRevenue.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Receipt className="w-3.5 h-3.5" /> Pending Approval</div>
          <p className="text-2xl font-bold text-amber-600">{pendingRecords}</p>
        </CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {RECORD_TYPES.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {RECORD_STATUSES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="records">
        <TabsList>
          <TabsTrigger value="records">Records</TabsTrigger>
          <TabsTrigger value="projects">By Project</TabsTrigger>
        </TabsList>

        <TabsContent value="records">
          {filtered.length === 0 ? (
            <EmptyState icon={DollarSign} title="No financial records" description="Add your first financial record to track budgets, expenses, and revenue" actionLabel={can('canManageFinance') ? 'New Record' : undefined} onAction={() => can('canManageFinance') && openForm(null)} />
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="text-left p-3 font-medium">Type</th>
                      <th className="text-left p-3 font-medium">Description</th>
                      <th className="text-left p-3 font-medium">Project / Client</th>
                      <th className="text-left p-3 font-medium">Amount</th>
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filtered.map(r => (
                      <tr key={r.id} className="hover:bg-muted/30">
                        <td className="p-3"><span className="text-xs font-medium px-2 py-0.5 rounded-md bg-muted">{r.record_type}</span></td>
                        <td className="p-3">{r.description || r.category || '—'}</td>
                        <td className="p-3 text-muted-foreground">{projectMap[r.project] || clientMap[r.client] || portfolioMap[r.portfolio] || '—'}</td>
                        <td className="p-3 font-medium">${(r.amount || 0).toLocaleString()}</td>
                        <td className="p-3 text-muted-foreground">{r.date ? new Date(r.date).toLocaleDateString() : '—'}</td>
                        <td className="p-3"><FinanceStatusBadge status={r.status} /></td>
                        <td className="p-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {can('canApproveFinance') && r.status === 'submitted' && <DropdownMenuItem onClick={() => handleApprove(r)}><CheckCircle className="w-3.5 h-3.5 mr-2" /> Approve</DropdownMenuItem>}
                              {can('canManageFinance') && <DropdownMenuItem onClick={() => openForm(r)}><Pencil className="w-3.5 h-3.5 mr-2" /> Edit</DropdownMenuItem>}
                              {can('canManageFinance') && <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(r)}><Trash2 className="w-3.5 h-3.5 mr-2" /> Delete</DropdownMenuItem>}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="projects">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(p => {
              const fin = projectFinances[p.id] || { budget: 0, expenses: 0, revenue: 0, profit: 0 };
              const utilization = fin.budget ? Math.round((fin.expenses / fin.budget) * 100) : 0;
              return (
                <Card key={p.id}><CardContent className="p-4">
                  <h4 className="font-medium text-sm mb-3">{p.project_name}</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">Budget</span><span className="font-medium">${fin.budget.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Expenses</span><span className="font-medium text-red-600">${fin.expenses.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Revenue</span><span className="font-medium text-emerald-600">${fin.revenue.toLocaleString()}</span></div>
                    <div className="flex justify-between pt-1 border-t"><span className="text-muted-foreground">Profit</span><span className={`font-medium ${fin.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>${fin.profit.toLocaleString()}</span></div>
                  </div>
                  {fin.budget > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Budget Used</span>
                        <span className={utilization > 90 ? 'text-red-600 font-medium' : ''}>{utilization}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full ${utilization > 90 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(utilization, 100)}%` }} />
                      </div>
                    </div>
                  )}
                </CardContent></Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editRecord ? 'Edit Record' : 'New Financial Record'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Record Type</Label>
              <Select value={form.record_type} onValueChange={v => setForm(f => ({...f, record_type: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RECORD_TYPES.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Amount *</Label><Input type="number" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))} /></div>
            <div><Label>Category</Label><Input value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} placeholder="e.g. Software, Travel" /></div>
            <div>
              <Label>Project</Label>
              <Select value={form.project} onValueChange={v => setForm(f => ({...f, project: v}))}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Client</Label>
              <Select value={form.client} onValueChange={v => setForm(f => ({...f, client: v}))}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Portfolio</Label>
              <Select value={form.portfolio} onValueChange={v => setForm(f => ({...f, portfolio: v}))}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  {portfolios.map(p => <SelectItem key={p.id} value={p.id}>{p.portfolio_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} /></div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({...f, status: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RECORD_STATUSES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={2} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.amount}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}