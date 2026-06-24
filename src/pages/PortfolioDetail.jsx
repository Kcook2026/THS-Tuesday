import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Briefcase, DollarSign, Calendar, Users, TrendingUp, FolderKanban } from 'lucide-react';
import { HealthBadge } from '@/components/shared/Phase3Badges';
import { StatusBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import CommentSection from '@/components/shared/CommentSection';

export default function PortfolioDetail() {
  const { id } = useParams();
  const [portfolio, setPortfolio] = useState(null);
  const [projects, setProjects] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [risks, setRisks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Portfolio.get(id),
      base44.entities.Project.list(),
      base44.entities.Milestone.filter({ portfolio: id }),
      base44.entities.Risk.filter({ related_portfolio: id }),
      base44.entities.Activity.filter({ record_type: 'Portfolio', record_id: id }, '-created_date', 10),
      base44.entities.User.list(),
    ]).then(([p, pr, m, r, a, u]) => {
      setPortfolio(p); setProjects(pr); setMilestones(m); setRisks(r); setActivities(a); setUsers(u);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!portfolio) return <div className="py-16 text-center text-muted-foreground">Portfolio not found</div>;

  const userMap = Object.fromEntries(users.map(u => [u.id, u.full_name]));
  const portfolioProjects = (portfolio.projects || []).map(pid => projects.find(p => p.id === pid)).filter(Boolean);
  const budgetUtilization = portfolio.budget ? Math.round(((portfolio.actual_spend || 0) / portfolio.budget) * 100) : 0;

  return (
    <div>
      <Link to="/portfolios" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Portfolios
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-indigo-500/10 text-indigo-600">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{portfolio.portfolio_name}</h1>
            {portfolio.strategic_goal && <p className="text-sm text-muted-foreground mt-0.5">{portfolio.strategic_goal}</p>}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <StatusBadge status={portfolio.status} />
              <PriorityBadge priority={portfolio.priority} />
              <HealthBadge health={portfolio.health} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><DollarSign className="w-3.5 h-3.5" /> Budget</div>
          <p className="text-xl font-bold">${(portfolio.budget || 0).toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><DollarSign className="w-3.5 h-3.5" /> Spend</div>
          <p className="text-xl font-bold text-amber-600">${(portfolio.actual_spend || 0).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">{budgetUtilization}% utilized</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><FolderKanban className="w-3.5 h-3.5" /> Projects</div>
          <p className="text-xl font-bold">{portfolioProjects.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><TrendingUp className="w-3.5 h-3.5" /> Completion</div>
          <p className="text-xl font-bold text-blue-600">{portfolio.completion_percentage || 0}%</p>
        </CardContent></Card>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between text-sm mb-1.5">
          <span className="font-medium">Overall Progress</span>
          <span className="text-muted-foreground">{portfolio.completion_percentage || 0}%</span>
        </div>
        <Progress value={portfolio.completion_percentage || 0} className="h-2" />
      </div>

      <Tabs defaultValue="projects">
        <TabsList>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="risks">Risks</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
        </TabsList>

        <TabsContent value="projects">
          {portfolioProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No projects linked to this portfolio</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {portfolioProjects.map(p => (
                <Card key={p.id}><CardContent className="p-4">
                  <Link to="/projects" className="font-medium text-sm hover:text-primary">{p.project_name}</Link>
                  <div className="flex items-center gap-2 mt-2">
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Progress</span>
                      <span>{p.completion_percentage || 0}%</span>
                    </div>
                    <Progress value={p.completion_percentage || 0} className="h-1.5" />
                  </div>
                </CardContent></Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="milestones">
          {milestones.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No milestones for this portfolio</p>
          ) : (
            <div className="space-y-2">
              {milestones.map(m => (
                <Card key={m.id}><CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{m.milestone_name}</p>
                    {m.due_date && <p className="text-xs text-muted-foreground">{new Date(m.due_date).toLocaleDateString()}</p>}
                  </div>
                  <StatusBadge status={m.status} />
                </CardContent></Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="risks">
          {risks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No risks for this portfolio</p>
          ) : (
            <div className="space-y-2">
              {risks.map(r => (
                <Card key={r.id}><CardContent className="p-4">
                  <p className="font-medium text-sm">{r.risk_title}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <StatusBadge status={r.status} />
                    <span className="text-xs text-muted-foreground">Severity: {r.severity}</span>
                  </div>
                </CardContent></Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="activity">
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No recent activity</p>
          ) : (
            <div className="space-y-2">
              {activities.map(a => (
                <div key={a.id} className="flex items-center gap-2 text-sm py-2 border-b">
                  <span className="font-medium">{a.user_name || 'System'}</span>
                  <span className="text-muted-foreground">{a.action}</span>
                  <span className="text-muted-foreground">{a.record_name || ''}</span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="comments">
          <CommentSection recordType="Portfolio" recordId={id} recordName={portfolio.portfolio_name} />
        </TabsContent>
      </Tabs>
    </div>
  );
}