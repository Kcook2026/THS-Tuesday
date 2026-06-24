import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';

export default function TaskFormDialog({ open, onClose, task, onSaved }) {
  const [form, setForm] = useState({
    title: '', description: '', project: '', assignee: '', status: 'todo',
    priority: 'medium', due_date: '', estimated_hours: '', actual_hours: '', tags: [], board: '',
  });
  const [projects, setProjects] = useState([]);
  const [boards, setBoards] = useState([]);
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (open) {
      Promise.all([base44.entities.Project.list(), base44.entities.User.list(), base44.entities.Workboard.list()])
        .then(([p, u, b]) => { setProjects(p); setUsers(u); setBoards(b); });
      if (task) {
        setForm({
          title: task.title || '',
          description: task.description || '',
          project: task.project || '',
          assignee: task.assignee || '',
          status: task.status || 'todo',
          priority: task.priority || 'medium',
          due_date: task.due_date || '',
          estimated_hours: task.estimated_hours || '',
          actual_hours: task.actual_hours || '',
          tags: task.tags || [],
          board: task.board || '',
        });
      } else {
        setForm({ title: '', description: '', project: '', assignee: '', status: 'todo', priority: 'medium', due_date: '', estimated_hours: '', actual_hours: '', tags: [], board: '' });
      }
    }
  }, [open, task]);

  const addTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm(f => ({ ...f, tags: [...f.tags, tagInput.trim()] }));
      setTagInput('');
    }
  };

  const removeTag = (tag) => {
    setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }));
  };

  const handleSave = async () => {
    setSaving(true);
    const data = {
      ...form,
      estimated_hours: form.estimated_hours ? Number(form.estimated_hours) : undefined,
      actual_hours: form.actual_hours ? Number(form.actual_hours) : undefined,
    };
    if (!data.project) delete data.project;
    if (!data.assignee) delete data.assignee;
    if (!data.board) delete data.board;
    if (task) {
      await base44.entities.Task.update(task.id, data);
    } else {
      await base44.entities.Task.create(data);
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit Task' : 'New Task'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={3} /></div>
          <div className="grid grid-cols-2 gap-3">
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
              <Label>Assignee</Label>
              <Select value={form.assignee} onValueChange={v => setForm(f => ({...f, assignee: v}))}>
                <SelectTrigger><SelectValue placeholder="Select assignee" /></SelectTrigger>
                <SelectContent>
                  {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({...f, status: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['backlog','todo','in_progress','review','done'].map(s => (
                    <SelectItem key={s} value={s}>{s.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({...f, priority: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['low','medium','high','critical'].map(p => (
                    <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Board</Label>
            <Select value={form.board} onValueChange={v => setForm(f => ({...f, board: v}))}>
              <SelectTrigger><SelectValue placeholder="Select board" /></SelectTrigger>
              <SelectContent>
                {boards.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm(f => ({...f, due_date: e.target.value}))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Estimated Hours</Label><Input type="number" value={form.estimated_hours} onChange={e => setForm(f => ({...f, estimated_hours: e.target.value}))} /></div>
            <div><Label>Actual Hours</Label><Input type="number" value={form.actual_hours} onChange={e => setForm(f => ({...f, actual_hours: e.target.value}))} /></div>
          </div>
          <div>
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder="Add a tag..." />
              <Button variant="outline" type="button" onClick={addTag} size="sm">Add</Button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.tags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-md">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="text-muted-foreground hover:text-foreground">&times;</button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.title}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}