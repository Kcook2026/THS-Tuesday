import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Search, MoreHorizontal, Pencil, Trash2, CheckSquare } from 'lucide-react';
import { PriorityBadge } from '@/components/shared/StatusBadge';
import PageHeader from '@/components/shared/PageHeader';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import TaskFormDialog from '@/components/tasks/TaskFormDialog';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { logActivity } from '@/hooks/useActivityLogger';

const COLUMNS = [
  { id: 'backlog', label: 'Backlog', color: 'bg-slate-400' },
  { id: 'todo', label: 'To Do', color: 'bg-blue-400' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-violet-500' },
  { id: 'review', label: 'Review', color: 'bg-amber-400' },
  { id: 'done', label: 'Done', color: 'bg-emerald-500' },
];

export default function TaskBoard() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [user, setUser] = useState(null);
  const { currentWorkspaceId } = useWorkspace();

  const load = () => {
    if (!currentWorkspaceId) return;
    setLoading(true);
    const wsFilter = { workspace: currentWorkspaceId };
    Promise.all([
      base44.entities.Task.filter(wsFilter),
      base44.entities.Project.filter(wsFilter),
      base44.entities.User.list(),
      base44.auth.me(),
    ]).then(([t, p, u, me]) => {
      setTasks(t); setProjects(p); setUsers(u); setUser(me);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [currentWorkspaceId]);

  const projectMap = Object.fromEntries(projects.map(p => [p.id, p.project_name]));
  const userMap = Object.fromEntries(users.map(u => [u.id, u.full_name]));

  const filtered = tasks.filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()));

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const taskId = result.draggableId;
    const newStatus = result.destination.droppableId;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    await base44.entities.Task.update(taskId, { status: newStatus });
    const task = tasks.find(t => t.id === taskId);
    logActivity(user, `moved task to ${newStatus.replace('_', ' ')}`, 'Task', taskId, task?.title);
  };

  const handleDelete = async (t) => {
    await base44.entities.Task.delete(t.id);
    logActivity(user, 'deleted task', 'Task', t.id, t.title);
    load();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Task Board" subtitle={`${tasks.length} tasks`}>
        <Button onClick={() => { setEditTask(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-1.5" /> New Task
        </Button>
      </PageHeader>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map(col => {
            const colTasks = filtered.filter(t => t.status === col.id);
            return (
              <div key={col.id} className="flex-shrink-0 w-64">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                  <span className="text-sm font-semibold">{col.label}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{colTasks.length}</span>
                </div>
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[200px] space-y-2 rounded-xl p-2 transition-colors ${snapshot.isDraggingOver ? 'bg-accent' : 'bg-muted/40'}`}
                    >
                      {colTasks.map((task, idx) => (
                        <Draggable key={task.id} draggableId={task.id} index={idx}>
                          {(provided) => (
                            <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                              <Card className="shadow-sm hover:shadow-md transition-shadow">
                                <CardContent className="p-3">
                                  <div className="flex items-start justify-between mb-1.5">
                                    <h4 className="text-sm font-medium leading-snug line-clamp-2">{task.title}</h4>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 -mr-1 -mt-0.5">
                                          <MoreHorizontal className="w-3.5 h-3.5" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => { setEditTask(task); setDialogOpen(true); }}>
                                          <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(task)}>
                                          <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                  {task.project && (
                                    <p className="text-[11px] text-muted-foreground mb-2">{projectMap[task.project] || ''}</p>
                                  )}
                                  <div className="flex items-center justify-between">
                                    <PriorityBadge priority={task.priority} />
                                    {task.assignee && (
                                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center" title={userMap[task.assignee]}>
                                        <span className="text-[10px] font-semibold text-primary">{(userMap[task.assignee] || '?')[0]}</span>
                                      </div>
                                    )}
                                  </div>
                                  {task.due_date && (
                                    <p className="text-[11px] text-muted-foreground mt-2">{new Date(task.due_date).toLocaleDateString()}</p>
                                  )}
                                </CardContent>
                              </Card>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      <TaskFormDialog open={dialogOpen} onClose={() => setDialogOpen(false)} task={editTask} onSaved={() => {
        logActivity(user, editTask ? 'updated task' : 'created task', 'Task', editTask?.id, editTask?.title || 'New Task');
        load();
      }} />
    </div>
  );
}