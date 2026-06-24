import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  FolderKanban, CheckSquare, Users, Building2, ArrowUpRight, Clock,
  Briefcase, Target, DollarSign, ShieldAlert, Zap, TrendingUp, AlertTriangle,
  Flag, Activity
} from 'lucide-react';
import { StatusBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import { HealthBadge } from '@/components/shared/Phase3Badges';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['hsl(252,60%,52%)', 'hsl(173,58%,39%)', 'hsl(43,74%,66%)', 'hsl(12,76%,61%)', 'hsl(197,37%,24%)'];

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [clients, setClients] = useState([]);
  const [activities, setActivities] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [goals, setGoals] = useState([]);
  const [risks, setRisks] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Project.list(),
      base44.entities.Task.list(),
      base44.entities.Team.list(),
      base44.entities.Client.list(),
      base44.entities.Activity.list('-created_date', 10),
      base44.entities.Portfolio.list(),
      base44.entities.Goal.list(),
      base44.entities.Risk.list(),
      base44.entities.Milestone.list(),
      base44.entities.TimeEntry.list(),
      base44.entities.ResourceAllocation.list(),
    ]).then(([p, t, tm, c, a, po, g, r, m, te, ra]) => {
      setProjects(p); setTasks(t); setTeams(tm); setClients(c); setActivities(a);
      setPortfolios(po); setGoals(g); setRisks(r); setMilestones(m); setTimeEntries(te); setAllocations(ra);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const now = new Date();
  const totalBudget = portfolios.reduce((s, p) => s + (p.budget || 0), 0);
  const totalSpend = portfolios.reduce((s, p) => s + (p.actual_spend || 0), 0);
  const billableHours = timeEntries.filter(e => e.billable).reduce((s, e) => s + (e.hours || 0), 0);
  const overdueMilestones = milestones.filter(m => m.due_date && new Date(m.due_date) < now && m.status !== 'completed');
  const activeRisks = risks.filter(r => r.status === 'open' || r.status === 'monitoring');
  const criticalRisks = risks.filter(r => r.severity === 'critical' || r.severity === 'high');
  const atRiskPortfolios = portfolios.filter(p => p.health === 'at_risk' || p.health === 'critical');
  const atRiskClients = clients.filter(c => c.client_health === 'at_risk' || c.client_health === 'critical');
  const atRiskProjects = projects.filter(p => p.status === 'active' && (p.completion_percentage || 0) < 50);
  const overallocated = allocations.filter(a => a.status === 'overallocated');
  const avgGoalProgress = goals.length ? Math.round(goals.reduce((s, g) => s + (g.progress_percentage || 0), 0) / goals.length) : 0;

  const stats = [
    { label: 'Projects', value: projects.length, icon: FolderKanban, path: '/projects', color: 'text-violet-600' },
    { label: 'Tasks', value: tasks.length, icon: CheckSquare, path: '/tasks/board', color: 'text-blue-600' },
    { label: 'Portfolios', value: portfolios.length, icon: Briefcase, path: '/portfolios', color: 'text-indigo-600' },
    { label: 'Goals', value: goals.length, icon: Target, path: '/goals', color: 'text-rose-600' },
    { label: 'Teams', value: teams.length, icon: Users, path: '/teams', color: 'text-emerald-600' },
    { label: 'Clients', value: clients.length, icon: Building2, path: '/clients', color: 'text-orange-600' },
    { label: 'Risks', value: risks.length, icon: ShieldAlert, path: '/risks', color: 'text-red-600' },
    { label: 'Billable Hrs', value: billableHours, icon: Clock, path: '/timesheets', color: 'text-amber-600' },
  ];

  const tasksByStatus = ['backlog', 'todo', 'in_progress', 'review', 'done'].map(s => ({
    name: s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
    value: tasks.filter(t => t.status === s).length,
  }));

  const portfolioHealthData = ['excellent', 'on_track', 'at_risk', 'critical'].map(h => ({
    name: h.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
    value: portfolios.filter(p => p.health === h).length,
  })).filter(d => d.value > 0);

  const upcomingTasks = tasks
    .filter(t => t.due_date && t.status !== 'done')
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 5);

  const upcomingMilestones = milestones
    .filter(m => m.due_date && new Date(m.due_date) >= now && m.status !== 'completed')
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 5);

  // Command center widgets
  const commandWidgets = [
    { label: 'Portfolio Health', value: `${portfolios.filter(p => p.health === 'on_track' || p.health === 'excellent').length}/${portfolios.length}`, sub: `${atRiskPortfolios.length} at risk`, icon: Briefcase, path: '/portfolios', color: 'text-indigo-600', bgColor: 'bg-indigo-500/10' },
    { label: 'Active Risks', value: activeRisks.length, sub: `${criticalRisks.length} critical`, icon: ShieldAlert, path: '/risks', color: 'text-red-600', bgColor: 'bg-red-500/10' },
    { label: 'Budget Utilization', value: totalBudget ? `${Math.round((totalSpend / totalBudget) * 100)}%` : '0%', sub: `$${totalSpend.toLocaleString()} / $${totalBudget.toLocaleString()}`, icon: DollarSign, path: '/finance', color: 'text-emerald-600', bgColor: 'bg-emerald-500/10' },
    { label: 'Goal Progress', value: `${avgGoalProgress}%`, sub: `${goals.filter(g => g.status === 'achieved').length} achieved`, icon: Target, path: '/goals', color: 'text-rose-600', bgColor: 'bg-rose-500/10' },
    { label: 'Overdue Milestones', value: overdueMilestones.length, sub: `${upcomingMilestones.length} upcoming`, icon: Flag, path: '/roadmap', color: 'text-amber-600', bgColor: 'bg-amber-500/10' },
    { label: 'Overallocated', value: overallocated.length, sub: `${allocations.length} allocations`, icon: Users, path: '/resources', color: 'text-purple-600', bgColor: 'bg-purple-500/10' },
    { label: 'Clients At Risk', value: atRiskClients.length, sub: `${clients.length} total`, icon: Building2, path: '/clients', color: 'text-orange-600', bgColor: 'bg-orange-500/10' },
    { label: 'Projects At Risk', value: atRiskProjects.length, sub: `${projects.filter(p => p.status === 'active').length} active`, icon: FolderKanban, path: '/projects', color: 'text-violet-600', bgColor: 'bg-violet-500/10' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Command Center</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Executive overview of your entire workspace</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <Link key={s.label} to={s.path}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                  <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Command Center Widgets */}
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Executive Insights</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {commandWidgets.map(w => (
          <Link key={w.label} to={w.path}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${w.bgColor}`}>
                    <w.icon className={`w-4 h-4 ${w.color}`} />
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
                </div>
                <div className="text-2xl font-bold">{w.value}</div>
                <div className="text-xs font-medium">{w.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{w.sub}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tasks by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tasksByStatus}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(252,60%,52%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-center justify-center">
              {portfolioHealthData.length === 0 ? (
                <p className="text-sm text-muted-foreground">No portfolios yet</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={portfolioHealthData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
                      {portfolioHealthData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Upcoming Tasks */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" /> Upcoming Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No upcoming tasks</p>
            ) : (
              <div className="space-y-2">
                {upcomingTasks.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{new Date(t.due_date).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <PriorityBadge priority={t.priority} />
                      <StatusBadge status={t.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Milestones */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Flag className="w-4 h-4" /> Upcoming Milestones
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingMilestones.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No upcoming milestones</p>
            ) : (
              <div className="space-y-2">
                {upcomingMilestones.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{m.milestone_name}</p>
                      <p className="text-xs text-muted-foreground">{m.due_date ? new Date(m.due_date).toLocaleDateString() : '—'}</p>
                    </div>
                    <StatusBadge status={m.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity / Pulse Log */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4" /> Pulse Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No recent activity</p>
            ) : (
              <div className="space-y-2">
                {activities.slice(0, 5).map(a => (
                  <div key={a.id} className="flex items-start gap-3 p-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-semibold text-primary">{(a.user_name || '?')[0]}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{a.user_name}</span>{' '}
                        <span className="text-muted-foreground">{a.action}</span>{' '}
                        {a.record_name && <span className="font-medium">{a.record_name}</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">{new Date(a.created_date).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Drill-down Links */}
      <div className="mt-6 flex flex-wrap gap-2">
        {[
          { label: 'Portfolios', path: '/portfolios' },
          { label: 'Goals', path: '/goals' },
          { label: 'Resources', path: '/resources' },
          { label: 'Timesheets', path: '/timesheets' },
          { label: 'Finance', path: '/finance' },
          { label: 'Risks', path: '/risks' },
          { label: 'Reports', path: '/reports' },
          { label: 'Roadmap', path: '/roadmap' },
          { label: 'Automations', path: '/automations' },
          { label: 'Templates', path: '/templates' },
        ].map(link => (
          <Link key={link.path} to={link.path} className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary transition-colors">
            {link.label} <ArrowUpRight className="w-3 h-3" />
          </Link>
        ))}
      </div>
    </div>
  );
}