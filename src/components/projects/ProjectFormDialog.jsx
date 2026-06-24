import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';

export default function ProjectFormDialog({ open, onClose, project, onSaved }) {
  const [form, setForm] = useState({
    project_name: '', description: '', status: 'planning', priority: 'medium',
    start_date: '', due_date: '', budget: '', completion_percentage: 0, team: '', client: '',
  });
  const [teams, setTeams] = useState([]);
  const [clients, setClients] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      Promise.all([base44.entities.Team.list(), base44.entities.Client.list()])
        .then(([t, c]) => { setTeams(t); setClients(c); });
      if (project) {
        setForm({
          project_name: project.project_name || '',
          description: project.description || '',
          status: project.status || 'planning',
          priority: project.priority || 'medium',
          start_date: project.start_date || '',
          due_date: project.due_date || '',
          budget: project.budget || '',
          completion_percentage: project.completion_percentage || 0,
          team: project.team || '',
          client: project.client || '',
        });
      } else {
        setForm({ project_name: '', description: '', status: 'planning', priority: 'medium', start_date: '', due_date: '', budget: '', completion_percentage: 0, team: '', client: '' });
      }
    }
  }, [open, project]);

  const handleSave = async () => {
    setSaving(true);
    const data = { ...form, budget: form.budget ? Number(form.budget) : undefined, completion_percentage: Number(form.completion_percentage) };
    if (!data.team) delete data.team;
    if (!data.client) delete data.client;
    if (project) {
      await base44.entities.Project.update(project.id, data);
    } else {
      await base44.entities.Project.create(data);
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project ? 'Edit Project' : 'New Project'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Project Name *</Label>
            <Input value={form.project_name} onChange={e => setForm(f => ({...f, project_name: e.target.value}))} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({...f, status: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['planning','active','on_hold','completed','cancelled'].map(s => (
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
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({...f, start_date: e.target.value}))} /></div>
            <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm(f => ({...f, due_date: e.target.value}))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Team</Label>
              <Select value={form.team} onValueChange={v => setForm(f => ({...f, team: v}))}>
                <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                <SelectContent>
                  {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Client</Label>
              <Select value={form.client} onValueChange={v => setForm(f => ({...f, client: v}))}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Budget</Label><Input type="number" value={form.budget} onChange={e => setForm(f => ({...f, budget: e.target.value}))} /></div>
            <div><Label>Completion %</Label><Input type="number" min={0} max={100} value={form.completion_percentage} onChange={e => setForm(f => ({...f, completion_percentage: e.target.value}))} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.project_name}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}