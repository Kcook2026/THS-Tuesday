import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/lib/WorkspaceContext';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckSquare, Clock, FolderKanban, TrendingUp, CalendarDays, Eye, RefreshCw,
} from 'lucide-react';

const STATUS_COLORS = {
  backlog: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  todo: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',
  in_progress: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300',
  review: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300',
  done: 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-300',
};

const PRIORITY_COLORS = {
  low: 'bg-gray-400', medium: 'bg-amber-500', high: 'bg-orange-500', critical: 'bg-red-500',
};

export default function MyWork() {
  const { user, currentWorkspaceId, loading: wsLoading } = useWorkspace();
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [watchingTasks, setWatchingTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentWorkspaceId || !user) return;
    const wsFilter = { workspace: currentWorkspaceId };
    Promise.all([
      base44.entities.Task.filter({ ...wsFilter, assignee: user.id }, '-updated_date', 100).catch(() => []),
      base44.entities.Task.filter(wsFilter, '-updated_date', 200).catch(() => []),
      base44.entities.Project.filter({ ...wsFilter, project_manager: user.id }, '-updated_date', 10).catch(() => []),
    ]).then(([assigned, allTasks, projs]) => {
      setAssignedTasks(assigned);
      setWatchingTasks(allTasks.filter(t => t.watchers?.includes(user.id) && t.assignee !== user.id));
      setProjects(projs);
    }).finally(() => setLoading(false));
  }, [currentWorkspaceId, user]);

  if (wsLoading || loading) return <LoadingSpinner />;

  const now = new Date();
  const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const week = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const openTasks = assignedTasks.filter(t => t.status !== 'done');
  const doneTasks = assignedTasks.filter(t => t.status === 'done');
  const overdue = openTasks.filter(t => t.due_date && new Date(t.due_date) < now);
  const dueSoon = openTasks.filter(t => t.due_date && new Date(t.due_date) >= now && new Date(t.due_date) <= threeDays);
  const recentlyUpdated = [...assignedTasks].sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date)).slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Work</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Everything assigned to you and on your radar</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard icon={CheckSquare} label="Open" value={openTasks.length} color="text-blue-600 dark:text-blue-400" />
        <StatCard icon={Clock} label="Overdue" value={overdue.length} color="text-red-600 dark:text-red-400" />
        <StatCard icon={CalendarDays} label="Due Soon" value={dueSoon.length} color="text-amber-600 dark:text-amber-400" />
        <StatCard icon={Eye} label="Watching" value={watchingTasks.length} color="text-purple-600 dark:text-purple-400" />
        <StatCard icon={TrendingUp} label="Completed" value={doneTasks.length} color="text-green-600 dark:text-green-400" />
      </div>

      <Tabs defaultValue="assigned">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="assigned">Assigned ({openTasks.length})</TabsTrigger>
          <TabsTrigger value="overdue">Overdue ({overdue.length})</TabsTrigger>
          <TabsTrigger value="dueSoon">Due Soon ({dueSoon.length})</TabsTrigger>
          <TabsTrigger value="watching">Watching ({watchingTasks.length})</TabsTrigger>
          <TabsTrigger value="recent">Recently Updated</TabsTrigger>
          <TabsTrigger value="projects">Projects ({projects.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="assigned">
          <Card><CardContent className="p-0">
            {openTasks.length === 0 ? <EmptyRow message="No open tasks assigned to you" /> :
              <div className="divide-y">{openTasks.map(task => <TaskRow key={task.id} task={task} />)}</div>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="overdue">
          <Card><CardContent className="p-0">
            {overdue.length === 0 ? <EmptyRow message="No overdue tasks. Great job!" /> :
              <div className="divide-y">{overdue.map(task => <TaskRow key={task.id} task={task} showDate />)}</div>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="dueSoon">
          <Card><CardContent className="p-0">
            {dueSoon.length === 0 ? <EmptyRow message="Nothing due in the next 3 days" /> :
              <div className="divide-y">{dueSoon.map(task => <TaskRow key={task.id} task={task} showDate />)}</div>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="watching">
          <Card><CardContent className="p-0">
            {watchingTasks.length === 0 ? <EmptyRow message="You're not watching any tasks" /> :
              <div className="divide-y">{watchingTasks.map(task => <TaskRow key={task.id} task={task} />)}</div>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="recent">
          <Card><CardContent className="p-0">
            {recentlyUpdated.length === 0 ? <EmptyRow message="No recently updated tasks" /> :
              <div className="divide-y">{recentlyUpdated.map(task => <TaskRow key={task.id} task={task} showDate />)}</div>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="projects">
          <Card><CardContent className="p-0">
            {projects.length === 0 ? <EmptyRow message="No projects assigned to you" /> :
              <div className="divide-y">
                {projects.map(proj => (
                  <Link key={proj.id} to="/projects" className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors">
                    <FolderKanban className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{proj.project_name}</p>
                      {proj.description && <p className="text-xs text-muted-foreground truncate">{proj.description}</p>}
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">{proj.status}</span>
                  </Link>
                ))}
              </div>}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TaskRow({ task, showDate }) {
  const now = new Date();
  return (
    <Link to="/tasks/table" className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors">
      <div className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_COLORS[task.priority] || 'bg-gray-400'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{task.title}</p>
        {task.tags && task.tags.length > 0 && (
          <div className="flex items-center gap-1 mt-0.5">
            {task.tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{tag}</span>
            ))}
          </div>
        )}
      </div>
      {(showDate || true) && task.due_date && (
        <span className={`text-[11px] flex items-center gap-1 ${new Date(task.due_date) < now ? 'text-red-500' : 'text-muted-foreground'}`}>
          <CalendarDays className="w-3 h-3" />
          {new Date(task.due_date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
        </span>
      )}
      <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${STATUS_COLORS[task.status] || STATUS_COLORS.todo}`}>
        {task.status.replace('_', ' ')}
      </span>
    </Link>
  );
}

function EmptyRow({ message }) {
  return <div className="py-10 text-center text-sm text-muted-foreground">{message}</div>;
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