import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Search, MoreHorizontal, Pencil, Trash2, LayoutTemplate, FileText, FolderKanban, CheckSquare, GitBranch, Briefcase, FileCheck, Eye } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { logActivity } from '@/hooks/useActivityLogger';
import usePermissions from '@/hooks/usePermissions';

const TEMPLATE_TYPES = {
  project_template: { label: 'Project Template', icon: FolderKanban, color: 'bg-violet-500/10 text-violet-600' },
  task_template: { label: 'Task Template', icon: CheckSquare, color: 'bg-blue-500/10 text-blue-600' },
  process_template: { label: 'Process Template', icon: GitBranch, color: 'bg-amber-500/10 text-amber-600' },
  workboard_template: { label: 'Workboard Template', icon: LayoutTemplate, color: 'bg-indigo-500/10 text-indigo-600' },
  client_onboarding_template: { label: 'Client Onboarding', icon: Briefcase, color: 'bg-emerald-500/10 text-emerald-600' },
  document_template: { label: 'Document Template', icon: FileText, color: 'bg-rose-500/10 text-rose-600' },
};

const STARTER_TEMPLATES = [
  { template_name: 'Client Onboarding', template_type: 'client_onboarding_template', description: 'Complete onboarding workflow for new clients including welcome sequence, account setup, and training', category: 'Onboarding', configuration: '{"steps":["welcome_call","account_setup","data_migration","training","go_live"]}' },
  { template_name: 'Website Project', template_type: 'project_template', description: 'Full lifecycle website development project with phases from discovery to launch', category: 'Projects', configuration: '{"phases":["discovery","design","development","testing","launch"]}' },
  { template_name: 'Internal Operations Process', template_type: 'process_template', description: 'Standardize recurring internal operations with clear step ownership', category: 'Operations', configuration: '{"steps":["planning","execution","review","improvement"]}' },
  { template_name: 'Weekly Team Planning', template_type: 'workboard_template', description: 'Weekly sprint planning board with backlog, in-progress, and done columns', category: 'Planning', configuration: '{"columns":["backlog","todo","in_progress","review","done"]}' },
  { template_name: 'Quarterly OKR Planning', template_type: 'project_template', description: 'Quarterly OKR framework with goals, key results, and progress tracking', category: 'Planning', configuration: '{"sections":["objectives","key_results","check_ins","retro"]}' },
  { template_name: 'Document Approval Workflow', template_type: 'process_template', description: 'Multi-step document review and approval process with sign-off chain', category: 'Workflow', configuration: '{"steps":["draft","review","revise","approve","publish"]}' },
];

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [editTemplate, setEditTemplate] = useState(null);
  const [form, setForm] = useState({ template_name: '', description: '', template_type: 'project_template', category: '', configuration: '' });
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const { can } = usePermissions();

  const load = () => {
    setLoading(true);
    Promise.all([base44.entities.Template.list(), base44.entities.Process.list(), base44.entities.User.list(), base44.auth.me()])
      .then(([t, p, u, me]) => { setTemplates(t); setProcesses(p); setUsers(u); setUser(me); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = templates.filter(t => {
    if (search && !t.template_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== 'all' && t.template_type !== typeFilter) return false;
    return true;
  });

  const openForm = (template) => {
    setEditTemplate(template);
    if (template) {
      setForm({ template_name: template.template_name || '', description: template.description || '', template_type: template.template_type || 'project_template', category: template.category || '', configuration: template.configuration || '' });
    } else {
      setForm({ template_name: '', description: '', template_type: 'project_template', category: '', configuration: '' });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const data = { ...form, owner: user?.id };
    if (editTemplate) {
      await base44.entities.Template.update(editTemplate.id, data);
      logActivity(user, 'updated template', 'Template', editTemplate.id, editTemplate.template_name);
    } else {
      await base44.entities.Template.create(data);
      logActivity(user, 'created template', 'Template', '', form.template_name);
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async (t) => {
    await base44.entities.Template.delete(t.id);
    logActivity(user, 'deleted template', 'Template', t.id, t.template_name);
    load();
  };

  const handleUseTemplate = async (t) => {
    logActivity(user, 'used template', 'Template', t.id, t.template_name);
    setPreviewTemplate(null);
  };

  const handleLoadStarters = async () => {
    for (const starter of STARTER_TEMPLATES) {
      await base44.entities.Template.create({ ...starter, owner: user?.id });
    }
    logActivity(user, 'loaded starter templates', 'Template', '', `${STARTER_TEMPLATES.length} templates`);
    load();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Templates Library" subtitle={`${templates.length} templates`}>
        {can('canManageTemplates') && <Button onClick={() => openForm(null)}><Plus className="w-4 h-4 mr-1.5" /> New Template</Button>}
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(TEMPLATE_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={LayoutTemplate} title="No templates found" description="Load starter templates or create your own" actionLabel={can('canManageTemplates') ? 'Load Starter Templates' : undefined} onAction={() => can('canManageTemplates') && handleLoadStarters()} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => {
            const typeConfig = TEMPLATE_TYPES[t.template_type] || TEMPLATE_TYPES.project_template;
            const Icon = typeConfig.icon;
            return (
              <Card key={t.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${typeConfig.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm truncate">{t.template_name}</h3>
                        {t.category && <Badge variant="secondary" className="text-[11px] mt-1">{t.category}</Badge>}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"><MoreHorizontal className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setPreviewTemplate(t)}><Eye className="w-3.5 h-3.5 mr-2" /> Preview</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUseTemplate(t)}><FileCheck className="w-3.5 h-3.5 mr-2" /> Use Template</DropdownMenuItem>
                        {can('canManageTemplates') && <DropdownMenuItem onClick={() => openForm(t)}><Pencil className="w-3.5 h-3.5 mr-2" /> Edit</DropdownMenuItem>}
                        {can('canManageTemplates') && <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(t)}><Trash2 className="w-3.5 h-3.5 mr-2" /> Delete</DropdownMenuItem>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {t.description && <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>}
                  <div className="mt-3 flex items-center gap-2">
                    <Button size="sm" variant="outline" className="w-full" onClick={() => setPreviewTemplate(t)}>
                      <Eye className="w-3 h-3 mr-1.5" /> Preview
                    </Button>
                    <Button size="sm" className="w-full" onClick={() => handleUseTemplate(t)}>
                      <FileCheck className="w-3 h-3 mr-1.5" /> Use
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editTemplate ? 'Edit Template' : 'New Template'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Template Name *</Label><Input value={form.template_name} onChange={e => setForm(f => ({...f, template_name: e.target.value}))} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={2} /></div>
            <div>
              <Label>Template Type</Label>
              <Select value={form.template_type} onValueChange={v => setForm(f => ({...f, template_type: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TEMPLATE_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Category</Label><Input value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} placeholder="e.g. Onboarding, Planning" /></div>
            <div><Label>Configuration (JSON)</Label><Textarea value={form.configuration} onChange={e => setForm(f => ({...f, configuration: e.target.value}))} rows={4} className="font-mono text-xs" placeholder='{"key":"value"}' /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.template_name}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{previewTemplate?.template_name}</DialogTitle></DialogHeader>
          {previewTemplate && (
            <div className="space-y-3">
              <Badge variant="secondary">{TEMPLATE_TYPES[previewTemplate.template_type]?.label || previewTemplate.template_type}</Badge>
              {previewTemplate.description && <p className="text-sm text-muted-foreground">{previewTemplate.description}</p>}
              {previewTemplate.category && <p className="text-xs"><span className="text-muted-foreground">Category:</span> {previewTemplate.category}</p>}
              {previewTemplate.configuration && (
                <div>
                  <Label className="mb-1.5 block">Configuration</Label>
                  <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto whitespace-pre-wrap">{(() => {
                    try { return JSON.stringify(JSON.parse(previewTemplate.configuration), null, 2); }
                    catch { return previewTemplate.configuration; }
                  })()}</pre>
                </div>
              )}
              <Button className="w-full" onClick={() => handleUseTemplate(previewTemplate)}>
                <FileCheck className="w-4 h-4 mr-1.5" /> Use This Template
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}