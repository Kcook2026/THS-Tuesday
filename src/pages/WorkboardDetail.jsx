import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Table2, KanbanSquare } from 'lucide-react';
import { StatusBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import { TaskHealthBadge } from '@/components/shared/EnhancedBadges';
import Breadcrumbs from '@/components/shared/Breadcrumbs';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import TaskFormDialog from '@/components/tasks/TaskFormDialog';
import TaskDetailDrawer from '@/components/tasks/TaskDetailDrawer';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { logActivity } from '@/hooks/useActivityLogger';
import { useToast } from '@/components/ui/use-toast';

const COLUMNS = [
  { id: 'backlog', label: 'Backlog', color: 'bg-slate-400' },
  { id: 'todo', label: 'To Do', color: 'bg-blue-400' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-violet-500' },
  { id: 'review', label: 'Review', color: 'bg-amber-400' },
  { id: 'done', label: 'Done', color: 'bg-emerald-500' },
];

const VIEWS = [
  { id: 'table', label: 'Table', icon: Table2 },
  { id: 'kanban', label: 'Kanban', icon: KanbanSquare },
];

export default function WorkboardDetail() {
  const { id } = useParams();
  const [board, setBoard] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('table');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [drawerTask, setDrawerTask] = useState(null);
  const [user, setUser] = useState(null);
  const { toast } = useToast();

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.Workboard.get(id),
      base44.entities.Task.filter({ board: id }),
      base44.entities.User.list(),
      base44.auth.me(),
    ]).then(([b, t, u, me]) => {
      setBoard(b);
      setTasks(t);
      setUsers(u);
      setUser(me);
      setView(b.default_view || 'table');
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const userMap = Object.fromEntries(users.map(u => [u.id, u.full_name]));

  const filtered = tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    return true;
  });

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const taskId = result.draggableId;
    const newStatus = result.destination.droppableId;
    const prevStatus = tasks.find(t => t.id === taskId)?.status;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    try {
      await base44.entities.Task.update(taskId, { status: newStatus });
      logActivity(user, `moved task to ${newStatus.replace('_', ' ')}`, 'Task', taskId, tasks.find(t => t.id === taskId)?.title);
    } catch (error) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: prevStatus } : t));
      toast({ title: 'Error moving task', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (t) => {
    try {
      await base44.entities.Task.delete(t.id);
      logActivity(user, 'deleted task', 'Task', t.id, t.title);
      toast({ title: 'Task deleted' });
      load();
    } catch (error) {
      toast({ title: 'Error deleting task', description: error.message, variant: 'destructive' });
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!board) return <div className="py-16 text-center text-muted-foreground">Board not found</div>;

  return (
    <div>
      <Breadcrumbs items={[
        { label: 'Workboards', path: '/workboards' },
        { label: board.name },
      ]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{board.name}</h1>
          {board.description && <p className="text-sm text-muted-foreground mt-0.5">{board.description}</p>}
        </div>
        <Button onClick={() => { setEditTask(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Item
        </Button>
      </div>

      {/* View Switcher */}
      <div className="flex items-center justify-between mb-4">
        <Tabs value={view} onValueChange={setView}>
          <TabsList>
            {VIEWS.map(v => (
              <TabsTrigger key={v.id} value={v.id} className="gap-1.5">
                <v.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{v.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {view !== 'kanban' && (
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {COLUMNS.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* TABLE VIEW */}
      {view === 'table' && (
        <div className="border rounded-xl overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(t => (
                  <TableRow key={t.id} className="cursor-pointer" onClick={() => setDrawerTask(t)}>
                    <TableCell className="font-medium">{t.title}</TableCell>
                    <TableCell className="text-sm">{userMap[t.assignee] || '—'}</TableCell>
                    <TableCell><StatusBadge status={t.status} /></TableCell>
                    <TableCell><PriorityBadge priority={t.priority} /></TableCell>
                    <TableCell><TaskHealthBadge health={t.health} /></TableCell>
                    <TableCell className="text-sm">{t.due_date ? new Date(t.due_date).toLocaleDateString() : '—'}</TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditTask(t); setDialogOpen(true); }}><Pencil className="w-3.5 h-3.5 mr-2" /> Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(t)}><Trash2 className="w-3.5 h-3.5 mr-2" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* KANBAN VIEW */}
      {view === 'kanban' && (
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
                      <div ref={provided.innerRef} {...provided.droppableProps} className={`min-h-[200px] space-y-2 rounded-xl p-2 transition-colors ${snapshot.isDraggingOver ? 'bg-accent' : 'bg-muted/40'}`}>
                        {colTasks.map((task, idx) => (
                          <Draggable key={task.id} draggableId={task.id} index={idx}>
                            {(provided) => (
                              <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} onClick={() => setDrawerTask(task)}>
                                <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                                  <CardContent className="p-3">
                                    <h4 className="text-sm font-medium leading-snug line-clamp-2 mb-2">{task.title}</h4>
                                    <div className="flex items-center justify-between">
                                      <PriorityBadge priority={task.priority} />
                                      {task.assignee && (
                                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center" title={userMap[task.assignee]}>
                                          <span className="text-[10px] font-semibold text-primary">{(userMap[task.assignee] || '?')[0]}</span>
                                        </div>
                                      )}
                                    </div>
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
      )}

      {/* TIMELINE VIEW */}
      {view === 'timeline' && (
        <Card>
          <CardContent className="p-4">
            {filtered.filter(t => t.due_date).length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">No tasks with due dates to display</div>
            ) : (
              <div className="space-y-2">
                {filtered.filter(t => t.due_date).sort((a, b) => new Date(a.due_date) - new Date(b.due_date)).map(t => (
                  <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => setDrawerTask(t)}>
                    <div className="w-32 shrink-0">
                      <p className="text-xs font-medium truncate">{t.title}</p>
                    </div>
                    <div className="flex-1 relative h-6 bg-muted rounded">
                      <div
                        className={`absolute top-0 bottom-0 rounded ${t.status === 'done' ? 'bg-emerald-500/30' : 'bg-primary/30'}`}
                        style={{ left: '0%', width: t.status === 'done' ? '100%' : '60%' }}
                      />
                      <span className="absolute inset-0 flex items-center px-2 text-[11px] font-medium">{new Date(t.due_date).toLocaleDateString()}</span>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* CALENDAR VIEW */}
      {view === 'calendar' && <BoardCalendarView tasks={filtered} onTaskClick={setDrawerTask} />}

      {/* DASHBOARD VIEW */}
      {view === 'dashboard' && <BoardDashboardView tasks={filtered} userMap={userMap} />}

      <TaskFormDialog open={dialogOpen} onClose={() => setDialogOpen(false)} task={editTask} onSaved={() => { load(); }} />
      <TaskDetailDrawer task={drawerTask} onClose={() => setDrawerTask(null)} onUpdated={load} />
    </div>
  );
}

function BoardCalendarView({ tasks, onTaskClick }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}><Plus className="w-4 h-4 rotate-45" /></Button>
          <h2 className="text-lg font-semibold">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}><Plus className="w-4 h-4 -rotate-45" /></Button>
        </div>
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>)}
          {days.map((day, i) => {
            if (!day) return <div key={`e-${i}`} className="bg-card p-2 min-h-[80px]" />;
            const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const dayTasks = tasks.filter(t => t.due_date === dateStr);
            const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
            return (
              <div key={day} className={`bg-card p-1.5 min-h-[80px] ${isToday ? 'ring-2 ring-primary ring-inset' : ''}`}>
                <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-primary-foreground' : ''}`}>{day}</div>
                <div className="space-y-0.5">
                  {dayTasks.slice(0, 3).map(t => (
                    <div key={t.id} onClick={() => onTaskClick(t)} className="text-[10px] px-1 py-0.5 rounded bg-violet-500/10 text-violet-700 dark:text-violet-300 truncate cursor-pointer hover:bg-violet-500/20">{t.title}</div>
                  ))}
                  {dayTasks.length > 3 && <div className="text-[10px] text-muted-foreground px-1">+{dayTasks.length - 3} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function BoardDashboardView({ tasks, userMap }) {
  const byStatus = COLUMNS.map(c => ({ label: c.label, count: tasks.filter(t => t.status === c.id).length }));
  const byPriority = ['low','medium','high','critical'].map(p => ({ label: p, count: tasks.filter(t => t.priority === p).length }));
  const completed = tasks.filter(t => t.status === 'done').length;
  const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length;
  const maxStatus = Math.max(...byStatus.map(s => s.count), 1);

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-4">Task Status Distribution</h3>
          <div className="space-y-2">
            {byStatus.map(s => (
              <div key={s.label} className="flex items-center gap-3">
                <span className="text-xs w-20 shrink-0">{s.label}</span>
                <div className="flex-1 h-5 bg-muted rounded">
                  <div className="h-full bg-primary rounded transition-all" style={{ width: `${(s.count / maxStatus) * 100}%` }} />
                </div>
                <span className="text-xs font-medium w-6 text-right">{s.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-4">Summary</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">{tasks.length}</div>
              <div className="text-xs text-muted-foreground">Total Tasks</div>
            </div>
            <div className="p-3 rounded-lg bg-emerald-500/10">
              <div className="text-2xl font-bold text-emerald-600">{completed}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div className="p-3 rounded-lg bg-red-500/10">
              <div className="text-2xl font-bold text-red-600">{overdue}</div>
              <div className="text-xs text-muted-foreground">Overdue</div>
            </div>
            <div className="p-3 rounded-lg bg-blue-500/10">
              <div className="text-2xl font-bold text-blue-600">{tasks.filter(t => t.status === 'in_progress').length}</div>
              <div className="text-xs text-muted-foreground">In Progress</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}