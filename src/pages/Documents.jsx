import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Search, MoreHorizontal, Pencil, Trash2, FileText, Download, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { logActivity } from '@/hooks/useActivityLogger';

const CATEGORIES = ['contract', 'proposal', 'report', 'design', 'specification', 'other'];

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDoc, setEditDoc] = useState(null);
  const [form, setForm] = useState({ title: '', category: 'other', project: '', version: '1.0' });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const { currentWorkspaceId } = useWorkspace();

  const load = () => {
    if (!currentWorkspaceId) return;
    setLoading(true);
    const wsFilter = { workspace: currentWorkspaceId };
    Promise.all([base44.entities.Document.filter(wsFilter), base44.entities.Project.filter(wsFilter), base44.entities.User.list(), base44.auth.me()])
      .then(([d, p, u, me]) => { setDocuments(d); setProjects(p); setUsers(u); setCurrentUser(me); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [currentWorkspaceId]);

  const projectMap = Object.fromEntries(projects.map(p => [p.id, p.project_name]));
  const userMap = Object.fromEntries(users.map(u => [u.id, u.full_name]));

  const openForm = (doc) => {
    setEditDoc(doc);
    setFile(null);
    if (doc) {
      setForm({ title: doc.title || '', category: doc.category || 'other', project: doc.project || '', version: doc.version || '1.0' });
    } else {
      setForm({ title: '', category: 'other', project: '', version: '1.0' });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    let fileUrl = editDoc?.file_url;
    if (file) {
      const res = await base44.integrations.Core.UploadFile({ file });
      fileUrl = res.file_url;
    }
    const data = { ...form, file_url: fileUrl || '', owner: currentUser?.id, workspace: currentWorkspaceId };
    if (!data.project) delete data.project;
    if (editDoc) {
      await base44.entities.Document.update(editDoc.id, data);
      logActivity(currentUser, 'updated document', 'Document', editDoc.id, editDoc.title);
    } else {
      await base44.entities.Document.create(data);
      logActivity(currentUser, 'uploaded document', 'Document', '', form.title);
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async (d) => {
    await base44.entities.Document.delete(d.id);
    logActivity(currentUser, 'deleted document', 'Document', d.id, d.title);
    load();
  };

  const filtered = documents.filter(d => !search || d.title.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Documents" subtitle={`${documents.length} documents`}>
        <Button onClick={() => openForm(null)}><Plus className="w-4 h-4 mr-1.5" /> Upload Document</Button>
      </PageHeader>

      <div className="mb-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FileText} title="No documents found" description="Upload your first document" actionLabel="Upload Document" onAction={() => openForm(null)} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(d => (
            <Card key={d.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm truncate">{d.title}</h3>
                      <p className="text-xs text-muted-foreground">v{d.version}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="w-4 h-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {d.file_url && <DropdownMenuItem onClick={() => window.open(d.file_url, '_blank')}><Download className="w-3.5 h-3.5 mr-2" /> Download</DropdownMenuItem>}
                      <DropdownMenuItem onClick={() => openForm(d)}><Pencil className="w-3.5 h-3.5 mr-2" /> Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(d)}><Trash2 className="w-3.5 h-3.5 mr-2" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="secondary" className="text-[11px]">{d.category}</Badge>
                  {d.project && <span className="text-[11px] text-muted-foreground">{projectMap[d.project]}</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  By {userMap[d.owner] || 'Unknown'} · {new Date(d.created_date).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editDoc ? 'Edit Document' : 'Upload Document'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} /></div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({...f, category: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Project</Label>
              <Select value={form.project} onValueChange={v => setForm(f => ({...f, project: v}))}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Version</Label><Input value={form.version} onChange={e => setForm(f => ({...f, version: e.target.value}))} /></div>
            <div>
              <Label>File</Label>
              <div className="mt-1">
                <label className="flex items-center gap-2 px-3 py-2 border border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{file ? file.name : 'Choose a file...'}</span>
                  <input type="file" className="hidden" onChange={e => setFile(e.target.files[0])} />
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.title}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}