import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/lib/WorkspaceContext';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  LayoutGrid, Activity as ActivityIcon, CalendarDays, Clock, AlertCircle,
  Plus, Users, TrendingUp, Building2, FolderKanban, CheckSquare,
  ArrowRight, Star, Workflow, Target,
} from 'lucide-react';
import WorkspaceFormDialog from '@/components/shared/WorkspaceFormDialog';

export default function Home() {
  const { user, currentWorkspace, currentWorkspaceId, loading: wsLoading } = useWorkspace();
  const [tasks, setTasks] = useState([]);
  const [workboards, setWorkboards] = useState([]);
  const [activity, setActivity] = useState([]);
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wsDialogOpen, setWsDialogOpen] = useState(false);

  useEffect(() => {
    if (!currentWorkspaceId || !user) return;
    const wsFilter = { workspace: currentWorkspaceId };
    Promise.all([
      base44.entities.WorkboardItem.filter({ ...wsFilter, assignee: user.id, archived: false }, '-updated_date', 10).catch(() => []),
      base44.entities.Workboard.filter(wsFilter, '-updated_date', 6).catch(() => []),
      base44.entities.Activity.filter(wsFilter, '-created_date', 6).catch(() => []),
      base44.entities.Project.filter(wsFilter, '-updated_date', 4).catch(() => []),
      base44.entities.Team.filter(wsFilter, '-updated_date', 5).catch(() => []),
    ]).then(([items, w, a, p, tm]) => {
      const tasks = items.filter(i => i.item_type === 'task' && i.status !== 'done');
      setTasks(tasks);
      setWorkboards(w);
      setActivity(a);
      setProjects(p);
      setTeams(tm);
    }).finally(() => setLoading(false));
  }, [currentWorkspaceId, user]);

  if (wsLoading) return <LoadingSpinner />;

  if (!currentWorkspace) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="max-w-md text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Welcome to Tuesday Workspace</h1>
            <p className="text-sm text-muted-foreground">
              You don't have a workspace yet. Create your first workspace to begin organizing your projects, tasks, and teams.
            </p>
          </div>
          <Button onClick={() => setWsDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Create your first workspace
          </Button>
        </div>
        <WorkspaceFormDialog open={wsDialogOpen} onClose={() => setWsDialogOpen(false)} />
      </div>
    );
  }

  if (loading) return <LoadingSpinner />;

  const openTaskCount = tasks.length;
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const now = new Date();
  const week = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingDeadlines = tasks.filter(t => t.due_date && new Date(t.due_date) >= now && new Date(t.due_date) <= week).length;
  const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < now).length;
  const firstName = user?.full_name?.split(' ')[0] || 'there';

  const quickActions = [
    { label: 'New Task', icon: CheckSquare, path: '/tasks/table' },
    { label: 'New Project', icon: FolderKanban, path: '/projects' },
    { label: 'New Workboard', icon: LayoutGrid, path: '/workboards' },
    { label: 'New Team', icon: Users, path: '/teams' },
  ];

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Good morning, {firstName}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {currentWorkspace?.workspace_name || 'Tuesday Workspace'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/my-work">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Target className="w-4 h-4" /> My Work
            </Button>
          </Link>
          <Link to="/workboards">
            <Button size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" /> New
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={CheckSquare} label="My Open Tasks" value={openTaskCount} trend="+2 this week" color="text-blue-600" />
        <StatCard icon={FolderKanban} label="Active Projects" value={activeProjects} trend="On track" color="text-violet-600" />
        <StatCard icon={Clock} label="Due This Week" value={upcomingDeadlines} trend={`${overdueTasks} overdue`} color="text-amber-600" />
        <StatCard icon={ActivityIcon} label="Activity Today" value={activity.filter(a => new Date(a.created_date).toDateString() === now.toDateString()).length} trend="Last 24h" color="text-emerald-600" />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Work */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">My Work</CardTitle>
              <CardDescription className="text-xs">Tasks assigned to you</CardDescription>
            </div>
            <Link to="/my-work" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {tasks.length === 0 ? (
              <EmptyState message="No open tasks" subtitle="You're all caught up!" />
            ) : (
              <div className="space-y-1">
                {tasks.slice(0, 6).map(task => (
                  <Link key={task.id} to={`/workboards/${task.workboard || 'tasks'}`} className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    task.priority_color === 'red' ? 'bg-red-500' :
                    task.priority_color === 'orange' ? 'bg-orange-500' :
                    task.priority_color === 'yellow' ? 'bg-amber-500' : 'bg-gray-400'
                  }`} />
                  <span className="text-sm flex-1 truncate group-hover:text-foreground transition-colors">{task.title}</span>
                  {task.due_date && (
                    <span className={`text-[11px] flex items-center gap-1 shrink-0 ${new Date(task.due_date) < now ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                      <CalendarDays className="w-3 h-3" />
                      {new Date(task.due_date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Start */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Start</CardTitle>
            <CardDescription className="text-xs">Jump into your work</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            <QuickLink icon={LayoutGrid} label="Workboards" path="/workboards" description="View all boards" />
            <QuickLink icon={ActivityIcon} label="Activity Feed" path="/activity" description="Recent updates" />
            <QuickLink icon={Users} label="Teams" path="/teams" description="Your teams" />
            <QuickLink icon={CalendarDays} label="Calendar" path="/calendar" description="Schedule & deadlines" />
          </CardContent>
        </Card>
      </div>

      {/* Workboards & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Workboards */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Active Workboards</CardTitle>
              <CardDescription className="text-xs">Your workspace boards</CardDescription>
            </div>
            <Link to="/workboards" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {workboards.length === 0 ? (
              <EmptyState message="No workboards yet" subtitle="Create your first board to get started" actionLabel="Create Board" actionPath="/workboards" />
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {workboards.slice(0, 4).map(wb => (
                  <Link key={wb.id} to={`/workboards/${wb.id}`} className="group p-3 rounded-lg border hover:border-primary/50 hover:bg-accent/50 transition-all">
                    <div className="flex items-center gap-2 mb-1">
                      <BoardTypeIcon type={wb.board_type} />
                      <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">{wb.name}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {wb.board_type?.replace('_', ' ') || 'Board'}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <CardDescription className="text-xs">What's happening in your workspace</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {activity.length === 0 ? (
              <EmptyState message="No activity yet" subtitle="Activity will appear here" />
            ) : (
              <div className="space-y-3">
                {activity.slice(0, 5).map(act => (
                  <div key={act.id} className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <ActivityIcon className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-foreground">
                        <span className="font-medium">{act.user_name || 'Someone'}</span>{' '}
                        <span className="text-muted-foreground">{act.action}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {act.record_name || act.record_type}
                      </p>
                      <p className="text-[9px] text-muted-foreground/50 mt-0.5">
                        {new Date(act.created_date).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Teams */}
      {teams.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Your Teams</CardTitle>
            <CardDescription className="text-xs">Collaborate with your team members</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {teams.slice(0, 6).map(team => (
                <Link key={team.id} to="/teams" className="group p-3 rounded-lg border hover:border-primary/50 hover:bg-accent/50 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{team.name}</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {team.members?.length || 0} members · {team.department || 'No department'}
                  </p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, trend, color }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Icon className={`w-5 h-5 ${color}`} />
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
          </div>
          <p className="text-2xl font-bold">{value}</p>
          {trend && <p className="text-[10px] text-muted-foreground mt-1">{trend}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function QuickLink({ icon: Icon, label, path, description }) {
  return (
    <Link to={path} className="group flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-colors">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium group-hover:text-primary transition-colors truncate">{label}</p>
        <p className="text-[10px] text-muted-foreground truncate">{description}</p>
      </div>
    </Link>
  );
}

function BoardTypeIcon({ type }) {
  const icons = {
    project_board: FolderKanban,
    task_board: LayoutGrid,
    client_board: Building2,
    process_board: Workflow,
    operations_board: Target,
  };
  const Icon = icons[type] || LayoutGrid;
  return <Icon className="w-4 h-4 text-muted-foreground" />;
}

function EmptyState({ message, subtitle, actionLabel, actionPath }) {
  return (
    <div className="py-8 text-center">
      <p className="text-sm font-medium text-foreground">{message}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      {actionLabel && actionPath && (
        <Link to={actionPath}>
          <Button size="sm" variant="outline" className="mt-3">
            {actionLabel}
          </Button>
        </Link>
      )}
    </div>
  );
}