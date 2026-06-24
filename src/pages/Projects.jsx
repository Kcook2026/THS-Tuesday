import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Search, MoreHorizontal, Pencil, Trash2, FolderKanban } from 'lucide-react';
import { StatusBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ProjectFormDialog from '@/components/projects/ProjectFormDialog';
import { logActivity } from '@/hooks/useActivityLogger';
import usePermissions from '@/hooks/usePermissions';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [user, setUser] = useState(null);
  const { can } = usePermissions();

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.Project.list(),
      base44.entities.Team.list(),
      base44.entities.Client.list(),
      base44.auth.me(),
    ]).then(([p, t, c, u]) => {
      setProjects(p); setTeams(t); setClients(c); setUser(u);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const teamMap = Object.fromEntries(teams.map(t => [t.id, t.name]));
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.company_name]));

  const filtered = projects.filter(p => {
    if (search && !p.project_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    return true;
  });

  const handleDelete = async (p) => {
    await base44.entities.Project.delete(p.id);
    logActivity(user, 'deleted project', 'Project', p.id, p.project_name);
    load();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Projects" subtitle={`${projects.length} projects`}>
        {can('canCreate') && (
          <Button onClick={() => { setEditProject(null); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-1.5" /> New Project
          </Button>
        )}
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {['planning','active','on_hold','completed','cancelled'].map(s => (
              <SelectItem key={s} value={s}>{s.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FolderKanban} title="No projects found" description={search || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first project to get started'} actionLabel={!search && statusFilter === 'all' ? 'New Project' : undefined} onAction={() => { setEditProject(null); setDialogOpen(true); }} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm truncate">{p.project_name}</h3>
                    {p.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{p.description}</p>}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {can('canEdit') && <DropdownMenuItem onClick={() => { setEditProject(p); setDialogOpen(true); }}>
                        <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                      </DropdownMenuItem>}
                      {can('canDelete') && <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(p)}>
                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                      </DropdownMenuItem>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <StatusBadge status={p.status} />
                  <PriorityBadge priority={p.priority} />
                </div>
                <div className="space-y-2 text-xs text-muted-foreground">
                  {p.team && <p>Team: {teamMap[p.team] || '—'}</p>}
                  {p.client && <p>Client: {clientMap[p.client] || '—'}</p>}
                  {p.due_date && <p>Due: {new Date(p.due_date).toLocaleDateString()}</p>}
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{p.completion_percentage || 0}%</span>
                  </div>
                  <Progress value={p.completion_percentage || 0} className="h-1.5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProjectFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        project={editProject}
        onSaved={() => {
          logActivity(user, editProject ? 'updated project' : 'created project', 'Project', editProject?.id, editProject?.project_name || 'New Project');
          load();
        }}
      />
    </div>
  );
}