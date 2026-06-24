import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Mail, Phone, ArrowLeft, FileText, FolderKanban, CheckSquare, DollarSign } from 'lucide-react';
import { StatusBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import { ClientHealthBadge } from '@/components/shared/EnhancedBadges';
import { Progress } from '@/components/ui/progress';
import Breadcrumbs from '@/components/shared/Breadcrumbs';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import CommentSection from '@/components/shared/CommentSection';

export default function ClientDetail() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Client.get(id),
      base44.entities.Project.list(),
      base44.entities.Task.list(),
      base44.entities.Document.list(),
      base44.entities.Activity.filter({ record_id: id }, '-created_date', 20),
    ]).then(([c, p, t, d, a]) => {
      setClient(c);
      setProjects(p.filter(pr => pr.client === id));
      const projectIds = p.filter(pr => pr.client === id).map(pr => pr.id);
      setTasks(t.filter(tk => projectIds.includes(tk.project)));
      setDocuments(d.filter(dc => dc.related_client === id));
      setActivities(a);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!client) return <div className="py-16 text-center text-muted-foreground">Client not found</div>;

  const activeProjects = projects;
  const openTasks = tasks.filter(t => t.status !== 'done');
  const totalContractValue = activeProjects.reduce((s, p) => s + (p.budget || 0), 0);

  return (
    <div>
      <Breadcrumbs items={[
        { label: 'Clients', path: '/clients' },
        { label: client.company_name },
      ]} />

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-lg font-bold text-primary">{(client.company_name || '?')[0]}</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{client.company_name}</h1>
            {client.contact_name && <p className="text-sm text-muted-foreground mt-0.5">{client.contact_name}</p>}
            <div className="flex items-center gap-3 mt-2">
              <ClientHealthBadge health={client.client_health} />
              <StatusBadge status={client.status} />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4">
          <FolderKanban className="w-4 h-4 text-muted-foreground mb-2" />
          <div className="text-xl font-bold">{activeProjects.length}</div>
          <div className="text-xs text-muted-foreground">Active Projects</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <CheckSquare className="w-4 h-4 text-muted-foreground mb-2" />
          <div className="text-xl font-bold">{openTasks.length}</div>
          <div className="text-xs text-muted-foreground">Open Tasks</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <FileText className="w-4 h-4 text-muted-foreground mb-2" />
          <div className="text-xl font-bold">{documents.length}</div>
          <div className="text-xs text-muted-foreground">Documents</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <DollarSign className="w-4 h-4 text-muted-foreground mb-2" />
          <div className="text-xl font-bold">${(client.contract_value || totalContractValue || 0).toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Contract Value</div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold mb-3">Contact Information</h3>
                <div className="space-y-2 text-sm">
                  {client.email && <p className="flex items-center gap-2 text-muted-foreground"><Mail className="w-4 h-4" />{client.email}</p>}
                  {client.phone && <p className="flex items-center gap-2 text-muted-foreground"><Phone className="w-4 h-4" />{client.phone}</p>}
                  {client.last_contact_date && <p className="flex items-center gap-2 text-muted-foreground"><CheckSquare className="w-4 h-4" />Last contact: {new Date(client.last_contact_date).toLocaleDateString()}</p>}
                  {client.renewal_date && <p className="flex items-center gap-2 text-muted-foreground"><DollarSign className="w-4 h-4" />Renewal: {new Date(client.renewal_date).toLocaleDateString()}</p>}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold mb-3">Reporting Summary</h3>
                <div className="space-y-3">
                  {activeProjects.map(p => (
                    <div key={p.id}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="truncate">{p.project_name}</span>
                        <span className="text-xs text-muted-foreground">{p.completion_percentage || 0}%</span>
                      </div>
                      <Progress value={p.completion_percentage || 0} className="h-1.5" />
                    </div>
                  ))}
                  {activeProjects.length === 0 && <p className="text-sm text-muted-foreground">No projects yet</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Projects */}
        <TabsContent value="projects" className="mt-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeProjects.map(p => (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <Link to="/projects" className="text-sm font-semibold hover:text-primary">{p.project_name}</Link>
                  <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <StatusBadge status={p.status} />
                    <PriorityBadge priority={p.priority} />
                  </div>
                </CardContent>
              </Card>
            ))}
            {activeProjects.length === 0 && <p className="text-sm text-muted-foreground">No active projects</p>}
          </div>
        </TabsContent>

        {/* Tasks */}
        <TabsContent value="tasks" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {openTasks.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-3">
                    <div>
                      <p className="text-sm font-medium">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.due_date ? new Date(t.due_date).toLocaleDateString() : 'No due date'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <PriorityBadge priority={t.priority} />
                      <StatusBadge status={t.status} />
                    </div>
                  </div>
                ))}
                {openTasks.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No open tasks</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents" className="mt-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map(d => (
              <Card key={d.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{d.title}</p>
                      <p className="text-xs text-muted-foreground">v{d.version}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {documents.length === 0 && <p className="text-sm text-muted-foreground">No documents</p>}
          </div>
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes" className="mt-4">
          <Card>
            <CardContent className="p-5">
              {client.notes ? <p className="text-sm whitespace-pre-wrap">{client.notes}</p> : <p className="text-sm text-muted-foreground">No notes yet</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity */}
        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {activities.map(a => (
                  <div key={a.id} className="flex items-start gap-3 p-3">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-primary">{(a.user_name || '?')[0]}</span>
                    </div>
                    <div>
                      <p className="text-sm"><span className="font-medium">{a.user_name}</span> <span className="text-muted-foreground">{a.action}</span> {a.record_name && <span className="font-medium">{a.record_name}</span>}</p>
                      <p className="text-xs text-muted-foreground">{new Date(a.created_date).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
                {activities.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No activity</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comments */}
        <TabsContent value="comments" className="mt-4">
          <Card>
            <CardContent className="p-5">
              <CommentSection recordType="Client" recordId={client.id} recordName={client.company_name} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}