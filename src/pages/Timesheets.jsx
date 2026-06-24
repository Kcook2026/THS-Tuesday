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
import { Plus, MoreHorizontal, Pencil, Trash2, Clock, CheckCircle, DollarSign, Calendar } from 'lucide-react';
import { TimesheetStatusBadge } from '@/components/shared/Phase3Badges';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { logActivity } from '@/hooks/useActivityLogger';
import usePermissions from '@/hooks/usePermissions';
import { addDays, startOfWeek, format } from 'date-fns';

export default function Timesheets() {
  const [entries, setEntries] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [form, setForm] = useState({ project: '', client: '', date: format(new Date(), 'yyyy-MM-dd'), hours: '', billable: true, description: '', status: 'draft' });
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const { can } = usePermissions();

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.TimeEntry.list(),
      base44.entities.User.list(),
      base44.entities.Project.list(),
      base44.entities.Client.list(),
      base44.auth.me(),
    ]).then(([e, u, p, c, me]) => { setEntries(e); setUsers(u); setProjects(p); setClients(c); setUser(me); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const projectMap = Object.fromEntries(projects.map(p => [p.id, p.project_name]));
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.company_name]));
  const userMap = Object.fromEntries(users.map(u => [u.id, u.full_name]));

  const weekStart = startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const myEntries = entries.filter(e => e.user === user?.id);
  const weekEntries = myEntries.filter(e => {
    if (!e.date) return false;
    const d = new Date(e.date);
    return d >= weekStart && d < addDays(weekStart, 7);
  });

  const totalHours = weekEntries.reduce((s, e) => s + (e.hours || 0), 0);
  const billableHours = weekEntries.filter(e => e.billable).reduce((s, e) => s + (e.hours || 0), 0);
  const nonBillableHours = totalHours - billableHours;

  const pendingApprovals = entries.filter(e => e.status === 'submitted');

  // Project time summary
  const projectSummary = {};
  entries.forEach(e => {
    if (!e.project) return;
    projectSummary[e.project] = (projectSummary[e.project] || 0) + (e.hours || 0);
  });

  // Client time summary
  const clientSummary = {};
  entries.forEach(e => {
    if (!e.client) return;
    clientSummary[e.client] = (clientSummary[e.client] || 0) + (e.hours || 0);
  });

  const openForm = (entry) => {
    setEditEntry(entry);
    if (entry) {
      setForm({ project: entry.project || '', client: entry.client || '', date: entry.date || format(new Date(), 'yyyy-MM-dd'), hours: entry.hours || '', billable: entry.billable !== false, description: entry.description || '', status: entry.status || 'draft' });
    } else {
      setForm({ project: '', client: '', date: format(new Date(), 'yyyy-MM-dd'), hours: '', billable: true, description: '', status: 'draft' });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const data = { ...form, hours: Number(form.hours), user: user?.id, user_name: user?.full_name };
    if (!data.project) delete data.project;
    if (!data.client) delete data.client;
    if (editEntry) {
      await base44.entities.TimeEntry.update(editEntry.id, data);
      logActivity(user, 'updated time entry', 'TimeEntry', editEntry.id, `${data.hours}h`);
    } else {
      await base44.entities.TimeEntry.create(data);
      logActivity(user, 'created time entry', 'TimeEntry', '', `${data.hours}h`);
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async (e) => {
    await base44.entities.TimeEntry.delete(e.id);
    logActivity(user, 'deleted time entry', 'TimeEntry', e.id, `${e.hours}h`);
    load();
  };

  const handleSubmit = async () => {
    const draftEntries = myEntries.filter(e => e.status === 'draft');
    for (const e of draftEntries) {
      await base44.entities.TimeEntry.update(e.id, { status: 'submitted' });
    }
    logActivity(user, 'submitted timesheet', 'TimeEntry', '', `${draftEntries.length} entries`);
    load();
  };

  const handleApprove = async (entry) => {
    await base44.entities.TimeEntry.update(entry.id, { status: 'approved', approved_by: user?.id, approved_date: format(new Date(), 'yyyy-MM-dd') });
    logActivity(user, 'approved time entry', 'TimeEntry', entry.id, `${entry.hours}h`);
    load();
  };

  const handleReject = async (entry) => {
    await base44.entities.TimeEntry.update(entry.id, { status: 'rejected' });
    logActivity(user, 'rejected time entry', 'TimeEntry', entry.id, `${entry.hours}h`);
    load();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Timesheets" subtitle={`${totalHours}h this week · ${billableHours}h billable`}>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekOffset(w => w - 1)}><Calendar className="w-4 h-4 rotate-180" /></Button>
          <span className="text-sm font-medium whitespace-nowrap">{format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d')}</span>
          <Button variant="outline" size="icon" onClick={() => setWeekOffset(w => w + 1)}><Calendar className="w-4 h-4" /></Button>
          {can('canApproveTimesheets') ? null : (
            <Button onClick={handleSubmit} disabled={myEntries.filter(e => e.status === 'draft').length === 0}>Submit Timesheet</Button>
          )}
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Clock className="w-3.5 h-3.5" /> Total Hours</div>
          <p className="text-2xl font-bold">{totalHours}h</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><DollarSign className="w-3.5 h-3.5" /> Billable</div>
          <p className="text-2xl font-bold text-emerald-600">{billableHours}h</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Clock className="w-3.5 h-3.5" /> Non-Billable</div>
          <p className="text-2xl font-bold text-muted-foreground">{nonBillableHours}h</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><CheckCircle className="w-3.5 h-3.5" /> Pending Approvals</div>
          <p className="text-2xl font-bold text-amber-600">{pendingApprovals.length}</p>
        </CardContent></Card>
      </div>

      <div className="mb-4">
        <Button onClick={() => openForm(null)}><Plus className="w-4 h-4 mr-1.5" /> Add Time Entry</Button>
      </div>

      <Tabs defaultValue="weekly">
        <TabsList>
          <TabsTrigger value="weekly">Weekly View</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    {weekDays.map(d => (
                      <th key={d.toISOString()} className="text-left p-3 font-medium min-w-[120px]">
                        <div>{format(d, 'EEE')}</div>
                        <div className="text-xs font-normal">{format(d, 'MMM d')}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    {weekDays.map(d => {
                      const dayEntries = weekEntries.filter(e => e.date && new Date(e.date).toDateString() === d.toDateString());
                      const dayTotal = dayEntries.reduce((s, e) => s + (e.hours || 0), 0);
                      return (
                        <td key={d.toISOString()} className="p-3 align-top">
                          {dayEntries.length === 0 ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            <div className="space-y-1.5">
                              {dayEntries.map(e => (
                                <div key={e.id} className="p-2 rounded-md bg-muted/50">
                                  <p className="text-xs font-medium truncate">{projectMap[e.project] || 'No project'}</p>
                                  <p className="text-xs text-muted-foreground">{e.hours}h</p>
                                  <TimesheetStatusBadge status={e.status} />
                                </div>
                              ))}
                              <p className="text-xs font-medium pt-1">{dayTotal}h total</p>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="approvals">
          {pendingApprovals.length === 0 ? (
            <EmptyState icon={CheckCircle} title="No pending approvals" description="Submitted timesheets will appear here for approval" />
          ) : (
            <div className="space-y-2">
              {pendingApprovals.map(e => (
                <Card key={e.id}><CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold">{(e.user_name || '?')[0]}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{e.user_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{projectMap[e.project] || 'No project'} · {e.hours}h · {e.date ? new Date(e.date).toLocaleDateString() : '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <TimesheetStatusBadge status={e.status} />
                    {can('canApproveTimesheets') && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleApprove(e)}>Approve</Button>
                        <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleReject(e)}>Reject</Button>
                      </>
                    )}
                  </div>
                </CardContent></Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="summary">
          <div className="grid sm:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold text-sm mb-3">Project Time Summary</h4>
                {Object.keys(projectSummary).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(projectSummary).sort((a, b) => b[1] - a[1]).map(([pid, hours]) => (
                      <div key={pid} className="flex items-center justify-between text-sm">
                        <span className="truncate">{projectMap[pid] || 'Unknown'}</span>
                        <span className="font-medium">{hours}h</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold text-sm mb-3">Client Time Summary</h4>
                {Object.keys(clientSummary).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(clientSummary).sort((a, b) => b[1] - a[1]).map(([cid, hours]) => (
                      <div key={cid} className="flex items-center justify-between text-sm">
                        <span className="truncate">{clientMap[cid] || 'Unknown'}</span>
                        <span className="font-medium">{hours}h</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editEntry ? 'Edit Time Entry' : 'New Time Entry'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Project</Label>
              <Select value={form.project} onValueChange={v => setForm(f => ({...f, project: v}))}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Client</Label>
              <Select value={form.client} onValueChange={v => setForm(f => ({...f, client: v}))}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} /></div>
              <div><Label>Hours</Label><Input type="number" step="0.25" value={form.hours} onChange={e => setForm(f => ({...f, hours: e.target.value}))} /></div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="billable" checked={form.billable} onChange={e => setForm(f => ({...f, billable: e.target.checked}))} className="rounded" />
              <Label htmlFor="billable" className="cursor-pointer">Billable</Label>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={2} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.hours}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}