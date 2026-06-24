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
import { Plus, Search, MoreHorizontal, Pencil, Trash2, ShieldAlert, AlertTriangle, CheckCircle } from 'lucide-react';
import { SeverityBadge, RiskStatusBadge } from '@/components/shared/Phase3Badges';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { logActivity } from '@/hooks/useActivityLogger';
import usePermissions from '@/hooks/usePermissions';

export default function Risks() {
  const [risks, setRisks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRisk, setEditRisk] = useState(null);
  const [form, setForm] = useState({ risk_title: '', description: '', probability: 'medium', impact: 'medium', severity: 'moderate', status: 'open', mitigation_plan: '', due_date: '', related_project: '', related_portfolio: '', related_client: '' });
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const { can } = usePermissions();

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.Risk.list(),
      base44.entities.Project.list(),
      base44.entities.Portfolio.list(),
      base44.entities.Client.list(),
      base44.entities.User.list(),
      base44.auth.me(),
    ]).then(([r, p, po, c, u, me]) => { setRisks(r); setProjects(p); setPortfolios(po); setClients(c); setUsers(u); setUser(me); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const projectMap = Object.fromEntries(projects.map(p => [p.id, p.project_name]));
  const portfolioMap = Object.fromEntries(portfolios.map(p => [p.id, p.portfolio_name]));
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.company_name]));
  const userMap = Object.fromEntries(users.map(u => [u.id, u.full_name]));

  const filtered = risks.filter(r => {
    if (search && !r.risk_title.toLowerCase().includes(search.toLowerCase())) return false;
    if (severityFilter !== 'all' && r.severity !== severityFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    return true;
  });

  const openRisks = risks.filter(r => r.status === 'open').length;
  const criticalRisks = risks.filter(r => r.severity === 'critical').length;
  const mitigatedRisks = risks.filter(r => r.status === 'mitigated').length;
  const overdueRisks = risks.filter(r => r.due_date && new Date(r.due_date) < new Date() && r.status === 'open').length;

  const openForm = (risk) => {
    setEditRisk(risk);
    if (risk) {
      setForm({ risk_title: risk.risk_title || '', description: risk.description || '', probability: risk.probability || 'medium', impact: risk.impact || 'medium', severity: risk.severity || 'moderate', status: risk.status || 'open', mitigation_plan: risk.mitigation_plan || '', due_date: risk.due_date || '', related_project: risk.related_project || '', related_portfolio: risk.related_portfolio || '', related_client: risk.related_client || '' });
    } else {
      setForm({ risk_title: '', description: '', probability: 'medium', impact: 'medium', severity: 'moderate', status: 'open', mitigation_plan: '', due_date: '', related_project: '', related_portfolio: '', related_client: '' });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const data = { ...form, owner: user?.id };
    if (!data.related_project) delete data.related_project;
    if (!data.related_portfolio) delete data.related_portfolio;
    if (!data.related_client) delete data.related_client;
    if (editRisk) {
      await base44.entities.Risk.update(editRisk.id, data);
      logActivity(user, 'updated risk', 'Risk', editRisk.id, editRisk.risk_title);
    } else {
      await base44.entities.Risk.create(data);
      logActivity(user, 'created risk', 'Risk', '', form.risk_title);
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async (r) => {
    await base44.entities.Risk.delete(r.id);
    logActivity(user, 'deleted risk', 'Risk', r.id, r.risk_title);
    load();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Risk Register" subtitle={`${risks.length} risks · ${openRisks} open`}>
        {can('canManageRisks') && <Button onClick={() => openForm(null)}><Plus className="w-4 h-4 mr-1.5" /> New Risk</Button>}
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><ShieldAlert className="w-3.5 h-3.5" /> Total Risks</div>
          <p className="text-2xl font-bold">{risks.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><AlertTriangle className="w-3.5 h-3.5" /> Critical</div>
          <p className="text-2xl font-bold text-red-600">{criticalRisks}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><CheckCircle className="w-3.5 h-3.5" /> Mitigated</div>
          <p className="text-2xl font-bold text-emerald-600">{mitigatedRisks}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><AlertTriangle className="w-3.5 h-3.5" /> Overdue Actions</div>
          <p className="text-2xl font-bold text-amber-600">{overdueRisks}</p>
        </CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search risks..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            {['low','moderate','high','critical'].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {['open','monitoring','mitigated','closed'].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="No risks found" description="Add your first risk to start tracking mitigations" actionLabel={can('canManageRisks') ? 'New Risk' : undefined} onAction={() => can('canManageRisks') && openForm(null)} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-left p-3 font-medium">Risk</th>
                  <th className="text-left p-3 font-medium">Related To</th>
                  <th className="text-left p-3 font-medium">Owner</th>
                  <th className="text-left p-3 font-medium">Severity</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Due Date</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="p-3">
                      <p className="font-medium">{r.risk_title}</p>
                      {r.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{r.description}</p>}
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">{projectMap[r.related_project] || portfolioMap[r.related_portfolio] || clientMap[r.related_client] || '—'}</td>
                    <td className="p-3 text-muted-foreground text-xs">{userMap[r.owner] || '—'}</td>
                    <td className="p-3"><SeverityBadge severity={r.severity} /></td>
                    <td className="p-3"><RiskStatusBadge status={r.status} /></td>
                    <td className="p-3 text-muted-foreground text-xs">{r.due_date ? new Date(r.due_date).toLocaleDateString() : '—'}</td>
                    <td className="p-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {can('canManageRisks') && <DropdownMenuItem onClick={() => openForm(r)}><Pencil className="w-3.5 h-3.5 mr-2" /> Edit</DropdownMenuItem>}
                          {can('canManageRisks') && <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(r)}><Trash2 className="w-3.5 h-3.5 mr-2" /> Delete</DropdownMenuItem>}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editRisk ? 'Edit Risk' : 'New Risk'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Risk Title *</Label><Input value={form.risk_title} onChange={e => setForm(f => ({...f, risk_title: e.target.value}))} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={2} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Probability</Label>
                <Select value={form.probability} onValueChange={v => setForm(f => ({...f, probability: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['low','medium','high'].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Impact</Label>
                <Select value={form.impact} onValueChange={v => setForm(f => ({...f, impact: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['low','medium','high'].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Severity</Label>
                <Select value={form.severity} onValueChange={v => setForm(f => ({...f, severity: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['low','moderate','high','critical'].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({...f, status: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['open','monitoring','mitigated','closed'].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Related Project</Label>
              <Select value={form.related_project} onValueChange={v => setForm(f => ({...f, related_project: v}))}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Related Portfolio</Label>
                <Select value={form.related_portfolio} onValueChange={v => setForm(f => ({...f, related_portfolio: v}))}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    {portfolios.map(p => <SelectItem key={p.id} value={p.id}>{p.portfolio_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Related Client</Label>
                <Select value={form.related_client} onValueChange={v => setForm(f => ({...f, related_client: v}))}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Mitigation Plan</Label><Textarea value={form.mitigation_plan} onChange={e => setForm(f => ({...f, mitigation_plan: e.target.value}))} rows={3} /></div>
            <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm(f => ({...f, due_date: e.target.value}))} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.risk_title}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}