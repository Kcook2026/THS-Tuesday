import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Trash2, Eye, EyeOff, AlertCircle, Link2, CheckCircle2, Circle, Repeat, Clock } from 'lucide-react';
import { StatusBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import { TaskHealthBadge } from '@/components/shared/EnhancedBadges';
import CommentSection from '@/components/shared/CommentSection';
import { logActivity } from '@/hooks/useActivityLogger';

const HEALTH_OPTIONS = [
  { value: 'on_track', label: 'On Track' },
  { value: 'at_risk', label: 'At Risk' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'complete', label: 'Complete' },
];

export default function TaskDetailDrawer({ task, onClose, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [checklistText, setChecklistText] = useState('');
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [blockerText, setBlockerText] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (task) {
      setOpen(true);
      Promise.all([base44.entities.User.list(), base44.entities.Task.list(), base44.auth.me()])
        .then(([u, t, me]) => { setUsers(u); setAllTasks(t); setUser(me); });
    } else {
      setOpen(false);
    }
  }, [task]);

  const userMap = Object.fromEntries(users.map(u => [u.id, u.full_name]));
  const subtasks = task ? allTasks.filter(t => t.parent_task === task.id) : [];

  const update = async (data) => {
    await base44.entities.Task.update(task.id, data);
    if (onUpdated) onUpdated();
  };

  const toggleChecklist = async (idx) => {
    const newChecklist = [...(task.checklist || [])];
    newChecklist[idx] = { ...newChecklist[idx], completed: !newChecklist[idx].completed };
    await update({ checklist: newChecklist });
    logActivity(user, 'updated checklist on', 'Task', task.id, task.title);
  };

  const addChecklistItem = async () => {
    if (!checklistText.trim()) return;
    await update({ checklist: [...(task.checklist || []), { text: checklistText.trim(), completed: false }] });
    setChecklistText('');
  };

  const removeChecklistItem = async (idx) => {
    const newChecklist = (task.checklist || []).filter((_, i) => i !== idx);
    await update({ checklist: newChecklist });
  };

  const addSubtask = async () => {
    if (!subtaskTitle.trim()) return;
    await base44.entities.Task.create({ title: subtaskTitle.trim(), parent_task: task.id, project: task.project, board: task.board, status: 'todo', priority: 'low' });
    logActivity(user, 'created subtask for', 'Task', task.id, task.title);
    setSubtaskTitle('');
    if (onUpdated) onUpdated();
  };

  const addBlocker = async () => {
    if (!blockerText.trim()) return;
    await update({ blockers: [...(task.blockers || []), blockerText.trim()] });
    setBlockerText('');
  };

  const removeBlocker = async (idx) => {
    const newBlockers = (task.blockers || []).filter((_, i) => i !== idx);
    await update({ blockers: newBlockers });
  };

  const toggleWatcher = async (userId) => {
    const watchers = task.watchers || [];
    const newWatchers = watchers.includes(userId) ? watchers.filter(w => w !== userId) : [...watchers, userId];
    await update({ watchers: newWatchers });
  };

  const toggleDependency = async (depId) => {
    const deps = task.dependencies || [];
    const newDeps = deps.includes(depId) ? deps.filter(d => d !== depId) : [...deps, depId];
    await update({ dependencies: newDeps });
  };

  if (!task) return null;

  const checklistDone = (task.checklist || []).filter(c => c.completed).length;
  const checklistTotal = (task.checklist || []).length;

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg">{task.title}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
          <TaskHealthBadge health={task.health} />
          {task.recurring && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-700 dark:text-violet-300">
              <Repeat className="w-3 h-3" /> {task.recurring_interval || 'recurring'}
            </span>
          )}
        </div>

        {task.description && <p className="text-sm text-muted-foreground mb-4 whitespace-pre-wrap">{task.description}</p>}

        {/* Quick properties */}
        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
          <div>
            <label className="text-xs text-muted-foreground">Status</label>
            <Select value={task.status} onValueChange={v => { update({ status: v }); logActivity(user, 'changed status of', 'Task', task.id, task.title); }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['backlog','todo','in_progress','review','done'].map(s => <SelectItem key={s} value={s}>{s.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Priority</label>
            <Select value={task.priority} onValueChange={v => { update({ priority: v }); logActivity(user, 'changed priority of', 'Task', task.id, task.title); }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['low','medium','high','critical'].map(p => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Health</label>
            <Select value={task.health || 'on_track'} onValueChange={v => update({ health: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {HEALTH_OPTIONS.map(h => <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Assignee</label>
            <Select value={task.assignee || ''} onValueChange={v => { update({ assignee: v }); logActivity(user, 'changed assignee of', 'Task', task.id, task.title); }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {task.due_date && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
            <Clock className="w-3.5 h-3.5" /> Due {new Date(task.due_date).toLocaleDateString()}
          </div>
        )}

        <Tabs defaultValue="details">
          <TabsList className="w-full">
            <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
            <TabsTrigger value="subtasks" className="flex-1">Subtasks ({subtasks.length})</TabsTrigger>
            <TabsTrigger value="comments" className="flex-1">Comments</TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4 mt-4">
            {/* Checklist */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold">Checklist</h4>
                {checklistTotal > 0 && <span className="text-xs text-muted-foreground">{checklistDone}/{checklistTotal}</span>}
              </div>
              <div className="space-y-1">
                {(task.checklist || []).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 group">
                    {item.completed ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-muted-foreground shrink-0" />}
                    <button onClick={() => toggleChecklist(idx)} className={`text-sm flex-1 text-left ${item.completed ? 'line-through text-muted-foreground' : ''}`}>{item.text}</button>
                    <button onClick={() => removeChecklistItem(idx)} className="opacity-0 group-hover:opacity-100 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <Input value={checklistText} onChange={e => setChecklistText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addChecklistItem()} placeholder="Add checklist item..." className="h-8 text-sm" />
                <Button variant="outline" size="sm" onClick={addChecklistItem}><Plus className="w-3.5 h-3.5" /></Button>
              </div>
            </div>

            {/* Blockers */}
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><AlertCircle className="w-4 h-4 text-amber-500" /> Blockers</h4>
              <div className="space-y-1">
                {(task.blockers || []).map((b, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm bg-amber-500/5 border border-amber-500/20 rounded-lg px-2 py-1.5">
                    <span className="flex-1">{b}</span>
                    <button onClick={() => removeBlocker(idx)} className="text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <Input value={blockerText} onChange={e => setBlockerText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addBlocker()} placeholder="Add a blocker..." className="h-8 text-sm" />
                <Button variant="outline" size="sm" onClick={addBlocker}><Plus className="w-3.5 h-3.5" /></Button>
              </div>
            </div>

            {/* Dependencies */}
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Link2 className="w-4 h-4 text-muted-foreground" /> Dependencies</h4>
              <div className="border rounded-lg p-2 max-h-32 overflow-y-auto space-y-1">
                {allTasks.filter(t => t.id !== task.id && !t.parent_task).map(t => (
                  <label key={t.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted cursor-pointer">
                    <Checkbox checked={(task.dependencies || []).includes(t.id)} onCheckedChange={() => toggleDependency(t.id)} />
                    <span className="text-xs truncate">{t.title}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Watchers */}
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Eye className="w-4 h-4 text-muted-foreground" /> Watchers</h4>
              <div className="flex flex-wrap gap-1">
                {users.map(u => {
                  const watching = (task.watchers || []).includes(u.id);
                  return (
                    <button
                      key={u.id}
                      onClick={() => toggleWatcher(u.id)}
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors ${watching ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}
                    >
                      {watching ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      {u.full_name}
                    </button>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* Subtasks Tab */}
          <TabsContent value="subtasks" className="mt-4">
            <div className="flex gap-2 mb-3">
              <Input value={subtaskTitle} onChange={e => setSubtaskTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSubtask()} placeholder="Add subtask..." className="h-8 text-sm" />
              <Button variant="outline" size="sm" onClick={addSubtask}><Plus className="w-3.5 h-3.5" /></Button>
            </div>
            {subtasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No subtasks yet</p>
            ) : (
              <div className="space-y-1.5">
                {subtasks.map(st => (
                  <div key={st.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                    <StatusBadge status={st.status} />
                    <span className="text-sm flex-1 truncate">{st.title}</span>
                    <PriorityBadge priority={st.priority} />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Comments Tab */}
          <TabsContent value="comments" className="mt-4">
            <CommentSection recordType="Task" recordId={task.id} recordName={task.title} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}