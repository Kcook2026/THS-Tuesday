import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
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
import { Plus, MoreHorizontal, Pencil, Trash2, Users, Briefcase, AlertTriangle, CheckCircle } from 'lucide-react';
import { AllocationStatusBadge } from '@/components/shared/Phase3Badges';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { logActivity } from '@/hooks/useActivityLogger';
import usePermissions from '@/hooks/usePermissions';

export default function Resources() {
  const [allocations, setAllocations] = useState([]);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAlloc, setEditAlloc] = useState(null);
  const [form, setForm] = useState({ user: '', team: '', project: '', task: '', allocation_percentage: 100, allocated_hours: '', start_date: '', end_date: '', role_on_project: '', status: 'planned', notes: '' });
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const { can } = usePermissions();

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.ResourceAllocation.list(),
      base44.entities.User.list(),
      base44.entities.Team.list(),
      base44.entities.Project.list(),
      base44.entities.Task.list(),
      base44.auth.me(),
    ]).then(([a, u, t, p, tk, me]) => { setAllocations(a); setUsers(u); setTeams(t); setProjects(p); setTasks(tk); setUser(me); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const userMap = Object.fromEntries(users.map(u => [u.id, u.full_name]));
  const teamMap = Object.fromEntries(teams.map(t => [t.id, t.name]));
  const projectMap = Object.fromEntries(projects.map(p => [p.id, p.project_name]));

  // Calculate workload per user
  const userWorkloads = {};
  users.forEach(u => {
    const userAllocs = allocations.filter(a => a.user === u.id);
    const totalPct = userAllocs.reduce((sum, a) => sum + (a.allocation_percentage || 0), 0);
    const totalHours = userAllocs.reduce((sum, a) => sum + (a.allocated_hours || 0), 0);
    userWorkloads[u.id] = { pct: totalPct, hours: totalHours, count: userAllocs.length };
  });

  const teamWorkloads = {};
  teams.forEach(t => {
    const teamMembers = t.members || [];
    const teamAllocs = allocations.filter(a => a.team === t.id || teamMembers.includes(a.user));
    const totalPct = teamAllocs.reduce((sum, a) => sum + (a.allocation_percentage || 0), 0);
    teamWorkloads[t.id] = { pct: totalPct, count: teamAllocs.length };
  });

  const overallocated = users.filter(u => (userWorkloads[u.id]?.pct || 0) > 100);
  const underCapacity = users.filter(u => (userWorkloads[u.id]?.pct || 0) === 0);

  const openForm = (alloc) => {
    setEditAlloc(alloc);
    if (alloc) {
      setForm({ user: alloc.user || '', team: alloc.team || '', project: alloc.project || '', task: alloc.task || '', allocation_percentage: alloc.allocation_percentage || 100, allocated_hours: alloc.allocated_hours || '', start_date: alloc.start_date || '', end_date: alloc.end_date || '', role_on_project: alloc.role_on_project || '', status: alloc.status || 'planned', notes: alloc.notes || '' });
    } else {
      setForm({ user: '', team: '', project: '', task: '', allocation_percentage: 100, allocated_hours: '', start_date: '', end_date: '', role_on_project: '', status: 'planned', notes: '' });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const data = { ...form, allocation_percentage: Number(form.allocation_percentage), allocated_hours: form.allocated_hours ? Number(form.allocated_hours) : undefined };
    if (!data.team) delete data.team;
    if (!data.project) delete data.project;
    if (!data.task) delete data.task;
    if (editAlloc) {
      await base44.entities.ResourceAllocation.update(editAlloc.id, data);
      logActivity(user, 'updated resource allocation', 'ResourceAllocation', editAlloc.id, userMap[editAlloc.user] || 'Resource');
    } else {
      await base44.entities.ResourceAllocation.create(data);
      logActivity(user, 'created resource allocation', 'ResourceAllocation', '', userMap[form.user] || 'Resource');
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async (a) => {
    await base44.entities.ResourceAllocation.delete(a.id);
    logActivity(user, 'deleted resource allocation', 'ResourceAllocation', a.id, userMap[a.user] || 'Resource');
    load();
  };

  const getCapacityColor = (pct) => {
    if (pct > 100) return 'text-red-600';
    if (pct >= 80) return 'text-amber-600';
    if (pct > 0) return 'text-emerald-600';
    return 'text-muted-foreground';
  };

  const getCapacityBarColor = (pct) => {
    if (pct > 100) return 'bg-red-500';
    if (pct >= 80) return 'bg-amber-500';
    if (pct > 0) return 'bg-emerald-500';
    return 'bg-muted';
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Resource Planning" subtitle={`${allocations.length} allocations · ${overallocated.length} overallocated`}>
        {can('canManageResources') && <Button onClick={() => openForm(null)}><Plus className="w-4 h-4 mr-1.5" /> New Allocation</Button>}
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Users className="w-3.5 h-3.5" /> Total People</div>
          <p className="text-2xl font-bold">{users.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><AlertTriangle className="w-3.5 h-3.5" /> Overallocated</div>
          <p className="text-2xl font-bold text-red-600">{overallocated.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><CheckCircle className="w-3.5 h-3.5" /> Available</div>
          <p className="text-2xl font-bold text-emerald-600">{underCapacity.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Briefcase className="w-3.5 h-3.5" /> Active Allocations</div>
          <p className="text-2xl font-bold">{allocations.filter(a => a.status === 'active').length}</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="people">
        <TabsList>
          <TabsTrigger value="people">By Person</TabsTrigger>
          <TabsTrigger value="teams">By Team</TabsTrigger>
          <TabsTrigger value="allocations">All Allocations</TabsTrigger>
        </TabsList>

        <TabsContent value="people">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map(u => {
              const wl = userWorkloads[u.id] || { pct: 0, hours: 0, count: 0 };
              const cappedPct = Math.min(wl.pct, 100);
              return (
                <Card key={u.id}><CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">{(u.full_name || '?')[0]}</div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{u.full_name}</p>
                      <p className="text-xs text-muted-foreground">{wl.count} allocation{wl.count !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Capacity</span>
                    <span className={`font-medium ${getCapacityColor(wl.pct)}`}>{wl.pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full transition-all ${getCapacityBarColor(wl.pct)}`} style={{ width: `${cappedPct}%` }} />
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                    <span>{wl.hours}h allocated</span>
                    {wl.pct > 100 && <span className="text-red-600 font-medium">Overallocated</span>}
                    {wl.pct >= 80 && wl.pct <= 100 && <span className="text-amber-600 font-medium">Near capacity</span>}
                    {wl.pct > 0 && wl.pct < 80 && <span className="text-emerald-600 font-medium">Available</span>}
                  </div>
                </CardContent></Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="teams">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map(t => {
              const wl = teamWorkloads[t.id] || { pct: 0, count: 0 };
              return (
                <Card key={t.id}><CardContent className="p-4">
                  <p className="font-medium text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{(t.members || []).length} members · {wl.count} allocations</p>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Total Allocation</span>
                      <span className={`font-medium ${getCapacityColor(wl.pct)}`}>{wl.pct}%</span>
                    </div>
                    <Progress value={Math.min(wl.pct, 100)} className="h-2" />
                  </div>
                </CardContent></Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="allocations">
          {allocations.length === 0 ? (
            <EmptyState icon={Users} title="No allocations" description="Create resource allocations to plan your team's workload" actionLabel={can('canManageResources') ? 'New Allocation' : undefined} onAction={() => can('canManageResources') && openForm(null)} />
          ) : (
            <div className="space-y-2">
              {allocations.map(a => (
                <Card key={a.id}><CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold">{(userMap[a.user] || '?')[0]}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{userMap[a.user] || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{projectMap[a.project] || 'No project'} · {a.role_on_project || 'No role'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-medium">{a.allocation_percentage || 0}%</p>
                      <p className="text-xs text-muted-foreground">{a.allocated_hours || 0}h</p>
                    </div>
                    <AllocationStatusBadge status={a.status} />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {can('canManageResources') && <DropdownMenuItem onClick={() => openForm(a)}><Pencil className="w-3.5 h-3.5 mr-2" /> Edit</DropdownMenuItem>}
                        {can('canManageResources') && <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(a)}><Trash2 className="w-3.5 h-3.5 mr-2" /> Delete</DropdownMenuItem>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent></Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editAlloc ? 'Edit Allocation' : 'New Allocation'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>User *</Label>
              <Select value={form.user} onValueChange={v => setForm(f => ({...f, user: v}))}>
                <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent>
                  {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Team</Label>
                <Select value={form.team} onValueChange={v => setForm(f => ({...f, team: v}))}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Project</Label>
                <Select value={form.project} onValueChange={v => setForm(f => ({...f, project: v}))}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Role on Project</Label><Input value={form.role_on_project} onChange={e => setForm(f => ({...f, role_on_project: e.target.value}))} placeholder="e.g. Lead Developer" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Allocation %</Label><Input type="number" min={0} max={200} value={form.allocation_percentage} onChange={e => setForm(f => ({...f, allocation_percentage: e.target.value}))} /></div>
              <div><Label>Allocated Hours</Label><Input type="number" value={form.allocated_hours} onChange={e => setForm(f => ({...f, allocated_hours: e.target.value}))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({...f, start_date: e.target.value}))} /></div>
              <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({...f, end_date: e.target.value}))} /></div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({...f, status: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['planned','active','overallocated','completed'].map(s => <SelectItem key={s} value={s}>{s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={2} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.user}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}