import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, MoreHorizontal, Pencil, Trash2, Users } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { logActivity } from '@/hooks/useActivityLogger';

export default function Teams() {
  const [teams, setTeams] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTeam, setEditTeam] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', manager: '', members: [] });
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([base44.entities.Team.list(), base44.entities.User.list(), base44.auth.me()])
      .then(([t, u, me]) => { setTeams(t); setAllUsers(u); setCurrentUser(me); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const userMap = Object.fromEntries(allUsers.map(u => [u.id, u.full_name]));

  const openForm = (team) => {
    setEditTeam(team);
    if (team) {
      setForm({ name: team.name || '', description: team.description || '', manager: team.manager || '', members: team.members || [] });
    } else {
      setForm({ name: '', description: '', manager: '', members: [] });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const data = { ...form };
    if (!data.manager) delete data.manager;
    if (editTeam) {
      await base44.entities.Team.update(editTeam.id, data);
      logActivity(currentUser, 'updated team', 'Team', editTeam.id, editTeam.name);
    } else {
      await base44.entities.Team.create(data);
      logActivity(currentUser, 'created team', 'Team', '', form.name);
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async (t) => {
    await base44.entities.Team.delete(t.id);
    logActivity(currentUser, 'deleted team', 'Team', t.id, t.name);
    load();
  };

  const toggleMember = (userId) => {
    setForm(f => ({
      ...f,
      members: f.members.includes(userId) ? f.members.filter(id => id !== userId) : [...f.members, userId]
    }));
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Teams" subtitle={`${teams.length} teams`}>
        <Button onClick={() => openForm(null)}><Plus className="w-4 h-4 mr-1.5" /> New Team</Button>
      </PageHeader>

      {teams.length === 0 ? (
        <EmptyState icon={Users} title="No teams yet" description="Create your first team to organize your people" actionLabel="New Team" onAction={() => openForm(null)} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map(team => (
            <Card key={team.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-sm">{team.name}</h3>
                    {team.description && <p className="text-xs text-muted-foreground mt-0.5">{team.description}</p>}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="w-4 h-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openForm(team)}><Pencil className="w-3.5 h-3.5 mr-2" /> Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(team)}><Trash2 className="w-3.5 h-3.5 mr-2" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {team.manager && (
                  <p className="text-xs text-muted-foreground mb-2">Manager: <span className="font-medium text-foreground">{userMap[team.manager] || '—'}</span></p>
                )}
                <div className="flex items-center gap-1 mt-2">
                  <div className="flex -space-x-2">
                    {(team.members || []).slice(0, 5).map((mid, i) => (
                      <div key={mid} className="w-7 h-7 rounded-full bg-primary/10 border-2 border-card flex items-center justify-center" title={userMap[mid]}>
                        <span className="text-[10px] font-semibold text-primary">{(userMap[mid] || '?')[0]}</span>
                      </div>
                    ))}
                  </div>
                  {(team.members || []).length > 5 && (
                    <span className="text-xs text-muted-foreground ml-1">+{team.members.length - 5}</span>
                  )}
                  {(!team.members || team.members.length === 0) && (
                    <span className="text-xs text-muted-foreground">No members</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editTeam ? 'Edit Team' : 'New Team'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Team Name *</Label><Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={2} /></div>
            <div>
              <Label>Manager</Label>
              <Select value={form.manager} onValueChange={v => setForm(f => ({...f, manager: v}))}>
                <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
                <SelectContent>{allUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Members</Label>
              <div className="border rounded-lg p-2 max-h-40 overflow-y-auto space-y-1 mt-1">
                {allUsers.map(u => (
                  <label key={u.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer">
                    <Checkbox checked={form.members.includes(u.id)} onCheckedChange={() => toggleMember(u.id)} />
                    <span className="text-sm">{u.full_name}</span>
                  </label>
                ))}
                {allUsers.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No users available</p>}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.name}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}