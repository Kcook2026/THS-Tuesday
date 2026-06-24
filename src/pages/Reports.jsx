import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, CheckCircle2, Clock, DollarSign, TrendingUp, Users, Ban } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

const COLORS = ['hsl(252,60%,52%)', 'hsl(173,58%,39%)', 'hsl(43,74%,66%)', 'hsl(12,76%,61%)', 'hsl(197,37%,24%)'];

export default function Reports() {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', team: 'all', project: 'all', client: 'all', assignee: 'all', priority: 'all', status: 'all' });

  useEffect(() => {
    Promise.all([
      base44.entities.Project.list(),
      base44.entities.Task.list(),
      base44.entities.Team.list(),
      base44.entities.User.list(),
      base44.entities.Client.list(),
      base44.entities.Process.list(),
    ]).then(([p, t, tm, u, c, pr]) => {
      setProjects(p); setTasks(t); setTeams(tm); setUsers(u); setClients(c); setProcesses(pr);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const userMap = Object.fromEntries(users.map(u => [u.id, u.full_name]));
  const projectMap = Object.fromEntries(projects.map(p => [p.id, p.project_name]));
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.company_name]));
  const teamMap = Object.fromEntries(teams.map(t => [t.id, t.name]));

  const filterTasks = (taskList) => taskList.filter(t => {
    if (filters.status !== 'all' && t.status !== filters.status) return false;
    if (filters.priority !== 'all' && t.priority !== filters.priority) return false;
    if (filters.assignee !== 'all' && t.assignee !== filters.assignee) return false;
    if (filters.project !== 'all' && t.project !== filters.project) return false;
    if (filters.dateFrom && t.due_date && new Date(t.due_date) < new Date(filters.dateFrom)) return false;
    if (filters.dateTo && t.due_date && new Date(t.due_date) > new Date(filters.dateTo)) return false;
    return true;
  });

  const filteredTasks = filterTasks(tasks);
  const filteredProjects = filters.project !== 'all' ? projects.filter(p => p.id === filters.project) : projects.filter(p => {
    if (filters.client !== 'all' && p.client !== filters.client) return false;
    if (filters.team !== 'all' && p.team !== filters.team) return false;
    return true;
  });

  // Workload by team member
  const workloadData = users.map(u => ({
    name: u.full_name.length > 12 ? u.full_name.slice(0, 12) + '...' : u.full_name,
    total: filteredTasks.filter(t => t.assignee === u.id).length,
    done: filteredTasks.filter(t => t.assignee === u.id && t.status === 'done').length,
    overdue: filteredTasks.filter(t => t.assignee === u.id && t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length,
  })).filter(d => d.total > 0);

  // Overdue tasks by project
  const overdueByProject = filteredProjects.map(p => ({
    name: p.project_name.length > 15 ? p.project_name.slice(0, 15) + '...' : p.project_name,
    overdue: filteredTasks.filter(t => t.project === p.id && t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length,
  })).filter(d => d.overdue > 0);

  // Project budget vs actual hours
  const budgetVsActual = filteredProjects.map(p => {
    const projectTasks = filteredTasks.filter(t => t.project === p.id);
    const estHours = projectTasks.reduce((s, t) => s + (t.estimated_hours || 0), 0);
    const actHours = projectTasks.reduce((s, t) => s + (t.actual_hours || 0), 0);
    return { name: p.project_name.length > 15 ? p.project_name.slice(0, 15) + '...' : p.project_name, budget: p.budget || 0, actual: actHours, estimated: estHours };
  }).filter(d => d.budget > 0 || d.actual > 0);

  // Client health summary
  const clientHealthData = ['excellent', 'good', 'at_risk', 'critical', 'inactive'].map(h => ({
    name: h.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
    value: clients.filter(c => (c.client_health || 'good') === h).length,
  })).filter(d => d.value > 0);

  // Process completion rate
  const processCompletion = processes.map(pr => {
    const steps = pr.steps || [];
    const completed = steps.filter(s => s.status === 'completed').length;
    return {
      name: pr.process_name.length > 15 ? pr.process_name.slice(0, 15) + '...' : pr.process_name,
      completion: steps.length > 0 ? Math.round((completed / steps.length) * 100) : 0,
    };
  });

  // Tasks completed this week
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const completedThisWeek = filteredTasks.filter(t => t.status === 'done').length;

  // Upcoming deadlines (next 7 days)
  const upcomingDeadlines = filteredTasks.filter(t => {
    if (!t.due_date || t.status === 'done') return false;
    const due = new Date(t.due_date);
    const diff = (due - now) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  }).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  // Blocked work items
  const blockedItems = filteredTasks.filter(t => t.health === 'blocked' || (t.blockers && t.blockers.length > 0));

  // Summary stats
  const totalEst = filteredTasks.reduce((s, t) => s + (t.estimated_hours || 0), 0);
  const totalActual = filteredTasks.reduce((s, t) => s + (t.actual_hours || 0), 0);
  const completedTasks = filteredTasks.filter(t => t.status === 'done').length;
  const overdueTasks = filteredTasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length;

  const summaryCards = [
    { label: 'Total Tasks', value: filteredTasks.length, icon: CheckCircle2, color: 'text-blue-600' },
    { label: 'Completed', value: completedTasks, icon: CheckCircle2, color: 'text-emerald-600' },
    { label: 'Overdue', value: overdueTasks, icon: AlertTriangle, color: 'text-red-600' },
    { label: 'Blocked', value: blockedItems.length, icon: Ban, color: 'text-orange-600' },
    { label: 'Done This Week', value: completedThisWeek, icon: TrendingUp, color: 'text-violet-600' },
    { label: 'Hours Logged', value: `${totalActual}/${totalEst}h`, icon: Clock, color: 'text-amber-600' },
  ];

  return (
    <div>
      <PageHeader title="Reports" subtitle="Advanced insights across your workspace" />

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div><Label className="text-xs">From Date</Label><Input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({...f, dateFrom: e.target.value}))} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">To Date</Label><Input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({...f, dateTo: e.target.value}))} className="h-8 text-sm" /></div>
            <div>
              <Label className="text-xs">Team</Label>
              <Select value={filters.team} onValueChange={v => setFilters(f => ({...f, team: v}))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Project</Label>
              <Select value={filters.project} onValueChange={v => setFilters(f => ({...f, project: v}))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Client</Label>
              <Select value={filters.client} onValueChange={v => setFilters(f => ({...f, client: v}))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Assignee</Label>
              <Select value={filters.assignee} onValueChange={v => setFilters(f => ({...f, assignee: v}))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignees</SelectItem>
                  {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Priority</Label>
              <Select value={filters.priority} onValueChange={v => setFilters(f => ({...f, priority: v}))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  {['low','medium','high','critical'].map(p => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={filters.status} onValueChange={v => setFilters(f => ({...f, status: v}))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {['backlog','todo','in_progress','review','done'].map(s => <SelectItem key={s} value={s}>{s.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
        {summaryCards.map(s => (
          <Card key={s.label}>
            <CardContent className="p-3">
              <s.icon className={`w-4 h-4 ${s.color} mb-1.5`} />
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Workload by Team Member</CardTitle></CardHeader>
          <CardContent>
            <div className="h-56">
              {workloadData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No workload data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workloadData}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="done" fill="hsl(173,58%,39%)" name="Done" stackId="a" />
                    <Bar dataKey="overdue" fill="hsl(12,76%,61%)" name="Overdue" stackId="a" />
                    <Bar dataKey="total" fill="hsl(252,60%,52%)" name="Total" stackId="a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Overdue Tasks by Project</CardTitle></CardHeader>
          <CardContent>
            <div className="h-56">
              {overdueByProject.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No overdue tasks 🎉</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overdueByProject} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="overdue" fill="hsl(12,76%,61%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Project Budget ($)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-56">
              {budgetVsActual.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No budget data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={budgetVsActual}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={v => `$${v.toLocaleString()}`} />
                    <Bar dataKey="budget" fill="hsl(252,60%,52%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Client Health Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="h-56">
              {clientHealthData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No client data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={clientHealthData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {clientHealthData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 3 */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Process Completion Rate</CardTitle></CardHeader>
          <CardContent>
            <div className="h-56">
              {processCompletion.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No process data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={processCompletion} layout="vertical">
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={v => `${v}%`} />
                    <Bar dataKey="completion" fill="hsl(43,74%,66%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Upcoming Deadlines (7 days)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-56 overflow-y-auto">
              {upcomingDeadlines.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No upcoming deadlines</div>
              ) : (
                <div className="space-y-2">
                  {upcomingDeadlines.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div>
                        <p className="text-sm font-medium">{t.title}</p>
                        <p className="text-xs text-muted-foreground">{projectMap[t.project] || ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium">{new Date(t.due_date).toLocaleDateString()}</p>
                        <p className="text-[10px] text-muted-foreground">{userMap[t.assignee] || ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Blocked Items */}
      {blockedItems.length > 0 && (
        <Card className="mt-4">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Ban className="w-4 h-4 text-orange-500" /> Blocked Work Items ({blockedItems.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {blockedItems.map(t => (
                <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-orange-500/5 border border-orange-500/20">
                  <div>
                    <p className="text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{projectMap[t.project] || ''} · {t.blockers?.length || 0} blocker(s)</p>
                  </div>
                  <p className="text-xs text-orange-600 font-medium">{t.health === 'blocked' ? 'Blocked' : 'Has Blockers'}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}