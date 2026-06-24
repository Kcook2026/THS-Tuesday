import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/lib/WorkspaceContext';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CheckSquare, FolderKanban, LayoutGrid, Activity as ActivityIcon,
  CalendarDays, ArrowRight, Clock, AlertCircle, Plus, Users,
  TrendingUp,
} from 'lucide-react';

export default function Home() {
  const { user, currentWorkspace, currentWorkspaceId, loading: wsLoading } = useWorkspace();
  const [tasks, setTasks] = useState([]);
  const [workboards, setWorkboards] = useState([]);
  const [activity, setActivity] = useState([]);
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentWorkspaceId || !user) return;
    const wsFilter = { workspace: currentWorkspaceId };
    Promise.all([
      base44.entities.Task.filter({ ...wsFilter, assignee: user.id }, '-updated_date', 10).catch(() => []),
      base44.entities.Workboard.filter(wsFilter, '-updated_date', 6).catch(() => []),
      base44.entities.Activity.filter(wsFilter, '-created_date', 6).catch(() => []),
      base44.entities.Project.filter(wsFilter, '-updated_date', 4).catch(() => []),
      base44.entities.Team.filter(wsFilter, '-updated_date', 5).catch(() => []),
    ]).then(([t, w, a, p, tm]) => {
      setTasks(t.filter(x => x.status !== 'done'));
      setWorkboards(w);
      setActivity(a);
      setProjects(p);
      setTeams(tm);
    }).finally(() => setLoading(false));
  }, [currentWorkspaceId, user]);

  if (wsLoading || loading) return <LoadingSpinner />;

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
    { label: 'Add Client', icon: Users, path: '/clients' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back, {firstName}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {currentWorkspace ? `${currentWorkspace.workspace_name} workspace` : 'Tuesday Workspace'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/my-work"><Button variant="outline" size="sm">My Work</Button></Link>
          <Link to="/workboards"><Button size="sm">View Workboards</Button></Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={CheckSquare} label="Open Tasks" value={openTaskCount} color="text-blue-600 dark:text-blue-400" />
        <StatCard icon={FolderKanban} label="Active Projects" value={activeProjects} color="text-violet-600 dark:text-violet-400" />
        <StatCard icon={Clock} label="Due This Week" value={upcomingDeadlines} color="text-amber-600 dark:text-amber-400" />
        <StatCard icon={AlertCircle} label="Overdue" value={overdueTasks} color="text-red-600 dark:text-red-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Open Tasks */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">My Open Tasks</CardTitle>
            <Link to="/my-work" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {tasks.length === 0 ? (
              <EmptyBlock message="No open tasks. You're all caught up!" />
            ) : (
              <div className="space-y-1">
                {tasks.slice(0, 5).map(task => (
                  <Link key={task.id} to="/tasks/table" className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-accent transition-colors">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      task.priority === 'critical' ? 'bg-red-500' :
                      task.priority === 'high' ? 'bg-orange-500' :
                      task.priority === 'medium' ? 'bg-amber-500' : 'bg-gray-400'
                    }`} />
                    <span className="text-sm flex-1 truncate">{task.title}</span>
                    {task.due_date && (
                      <span className={`text-[11px] flex items-center gap-1 ${new Date(task.due_date) < now ? 'text-red-500' : 'text-muted-foreground'}`}>
                        <CalendarDays className="w-3 h-3" />
                        {new Date(task.due_date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">{task.status.replace('_', ' ')}</span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map(action => (
                <Link key={action.label} to={action.path}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors text-center">
                  <action.icon className="w-5 h-5 text-primary" />
                  <span className="text-xs font-medium">{action.label}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Deadlines */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="w-4 h-4" /> Upcoming Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {tasks.filter(t => t.due_date && new Date(t.due_date) >= now).length === 0 ? (
              <EmptyBlock message="No upcoming deadlines" />
            ) : (
              <div className="space-y-1">
                {tasks.filter(t => t.due_date && new Date(t.due_date) >= now)
                  .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
                  .slice(0, 5)
                  .map(task => (
                    <Link key={task.id} to="/tasks/table" className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-accent transition-colors">
                      <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm flex-1 truncate">{task.title}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(task.due_date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                      </span>
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
          </CardHeader>
          <CardContent className="pt-0">
            {activity.length === 0 ? (
              <EmptyBlock message="No recent activity" />
            ) : (
              <div className="space-y-3">
                {activity.slice(0, 5).map(act => (
                  <div key={act.id} className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <ActivityIcon className="w-3 h-3 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-foreground">
                        <span className="font-medium">{act.user_name || 'Someone'}</span> {act.action}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">{act.record_name || act.record_type}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Workboards */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Workboards</CardTitle>
            <Link to="/workboards" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {workboards.length === 0 ? (
              <EmptyBlock message="No workboards yet" />
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {workboards.slice(0, 4).map(wb => (
                  <Link key={wb.id} to={`/workboards/${wb.id}`} className="flex items-center gap-2.5 p-3 rounded-lg border hover:bg-accent transition-colors">
                    <LayoutGrid className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium truncate">{wb.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Active Projects</CardTitle>
            <Link to="/projects" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {projects.length === 0 ? (
              <EmptyBlock message="No projects yet" />
            ) : (
              <div className="space-y-1">
                {projects.slice(0, 4).map(proj => (
                  <Link key={proj.id} to="/projects" className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-accent transition-colors">
                    <FolderKanban className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm flex-1 truncate">{proj.project_name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">{proj.status}</span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Team Updates */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Team Updates
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {teams.length === 0 ? (
            <EmptyBlock message="No teams in this workspace yet" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {teams.slice(0, 6).map(team => {
                const teamActivity = activity.filter(a => a.record_type === 'Team' || a.action?.includes('team'));
                return (
                  <div key={team.id} className="p-3 rounded-lg border">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-3 h-3 text-primary" />
                      </div>
                      <p className="text-sm font-medium truncate">{team.name}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {team.members?.length || 0} members · {team.department || 'No department'}
                    </p>
                    {teamActivity.length > 0 && (
                      <p className="text-[10px] text-muted-foreground/60 mt-1 truncate">
                        Last: {teamActivity[0].action}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyBlock({ message }) {
  return <div className="py-8 text-center text-sm text-muted-foreground">{message}</div>;
}