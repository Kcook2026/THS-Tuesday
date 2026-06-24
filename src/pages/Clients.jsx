import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Building2, Mail, Phone, ArrowRight } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ClientHealthBadge } from '@/components/shared/EnhancedBadges';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { logActivity } from '@/hooks/useActivityLogger';
import { Link } from 'react-router-dom';

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [form, setForm] = useState({ company_name: '', contact_name: '', email: '', phone: '', status: 'active', notes: '' });
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([base44.entities.Client.list(), base44.auth.me()])
      .then(([c, u]) => { setClients(c); setUser(u); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openForm = (client) => {
    setEditClient(client);
    if (client) {
      setForm({ company_name: client.company_name || '', contact_name: client.contact_name || '', email: client.email || '', phone: client.phone || '', status: client.status || 'active', notes: client.notes || '' });
    } else {
      setForm({ company_name: '', contact_name: '', email: '', phone: '', status: 'active', notes: '' });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    if (editClient) {
      await base44.entities.Client.update(editClient.id, form);
      logActivity(user, 'updated client', 'Client', editClient.id, editClient.company_name);
    } else {
      await base44.entities.Client.create(form);
      logActivity(user, 'created client', 'Client', '', form.company_name);
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async (c) => {
    await base44.entities.Client.delete(c.id);
    logActivity(user, 'deleted client', 'Client', c.id, c.company_name);
    load();
  };

  const filtered = clients.filter(c => !search || c.company_name.toLowerCase().includes(search.toLowerCase()) || (c.contact_name || '').toLowerCase().includes(search.toLowerCase()));

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Clients" subtitle={`${clients.length} clients`}>
        <Button onClick={() => openForm(null)}><Plus className="w-4 h-4 mr-1.5" /> New Client</Button>
      </PageHeader>

      <div className="mb-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Building2} title="No clients found" description="Add your first client" actionLabel="New Client" onAction={() => openForm(null)} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <Link to={`/clients/${c.id}`} className="font-semibold text-sm hover:text-primary">{c.company_name}</Link>
                    {c.contact_name && <p className="text-xs text-muted-foreground mt-0.5">{c.contact_name}</p>}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="w-4 h-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openForm(c)}><Pencil className="w-3.5 h-3.5 mr-2" /> Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(c)}><Trash2 className="w-3.5 h-3.5 mr-2" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={c.status} />
                  <ClientHealthBadge health={c.client_health} />
                </div>
                <div className="mt-3 space-y-1">
                  {c.email && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Mail className="w-3 h-3" />{c.email}</p>}
                  {c.phone && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Phone className="w-3 h-3" />{c.phone}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editClient ? 'Edit Client' : 'New Client'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Company Name *</Label><Input value={form.company_name} onChange={e => setForm(f => ({...f, company_name: e.target.value}))} /></div>
            <div><Label>Contact Name</Label><Input value={form.contact_name} onChange={e => setForm(f => ({...f, contact_name: e.target.value}))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} /></div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({...f, status: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['active','inactive','prospect'].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={3} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.company_name}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}