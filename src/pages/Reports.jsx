import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageHeader from '@/components/shared/PageHeader';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

const COLORS = ['hsl(252,60%,52%)', 'hsl(173,58%,39%)', 'hsl(43,74%,66%)', 'hsl(12,76%,61%)', 'hsl(197,37%,24%)'];

export default function Reports() {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Project.list(),
      base44.entities.Task.list(),
      base44.entities.Team.list(),
      base44.entities.User.list(),
    ]).then(([p, t, tm, u]) => {
      setProjects(p); setTasks(t); setTeams(tm); setUsers(u);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const userMap = Object.fromEntries(users.map(u => [u.id, u.full_name]));
  const projectMap = Object.fromEntries(projects.map(p => [p.id, p.project_name]));

  // Task distribution by priority
  const tasksByPriority = ['low', 'medium', 'high', 'critical'].map(p => ({
    name: p.charAt(0).toUpperCase() + p.slice(1),
    value: tasks.filter(t => t.priority === p).length,
  }));

  // Project health
  const projectHealth = projects.map(p => ({
    name: p.project_name.length > 15 ? p.project_name.slice(0, 15) + '...' : p.project_name,
    completion: p.completion_percentage || 0,
  })).slice(0, 8);

  // Team workload
  const workloadData = users.map(u => {
    const userTasks = tasks.filter(t => t.assignee === u.id);
    return {
      name: u.full_name.length > 12 ? u.full_name.slice(0, 12) + '...' : u.full_name,
      total: userTasks.length,
      done: userTasks.filter(t => t.status === 'done').length,
      inProgress: userTasks.filter(t => t.status === 'in_progress').length,
    };
  }).filter(d => d.total > 0).slice(0, 8);

  // Tasks per project
  const tasksPerProject = projects.map(p => ({
    name: p.project_name.length > 15 ? p.project_name.slice(0, 15) + '...' : p.project_name,
    tasks: tasks.filter(t => t.project === p.id).length,
  })).filter(d => d.tasks > 0).slice(0, 8);

  // Summary stats
  const totalEstimated = tasks.reduce((s, t) => s + (t.estimated_hours || 0), 0);
  const totalActual = tasks.reduce((s, t) => s + (t.actual_hours || 0), 0);
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length;

  return (
    <div>
      <PageHeader title="Reports" subtitle="Insights across your workspace" />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Tasks', value: tasks.length },
          { label: 'Completed', value: completedTasks },
          { label: 'Overdue', value: overdueTasks },
          { label: 'Hours Logged', value: `${totalActual}/${totalEstimated}h` },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Tasks by Priority</CardTitle></CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={tasksByPriority} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {tasksByPriority.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Project Completion</CardTitle></CardHeader>
          <CardContent>
            <div className="h-56">
              {projectHealth.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No project data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectHealth} layout="vertical">
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => `${v}%`} />
                    <Bar dataKey="completion" fill="hsl(252,60%,52%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Team Workload</CardTitle></CardHeader>
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
                    <Bar dataKey="done" fill="hsl(173,58%,39%)" name="Done" stackId="a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="inProgress" fill="hsl(252,60%,52%)" name="In Progress" stackId="a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Tasks per Project</CardTitle></CardHeader>
          <CardContent>
            <div className="h-56">
              {tasksPerProject.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No task data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tasksPerProject}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="tasks" fill="hsl(43,74%,66%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}