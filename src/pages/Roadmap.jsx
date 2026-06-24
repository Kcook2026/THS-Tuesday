import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Map, Flag, AlertCircle, Calendar, ArrowRight } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import PageHeader from '@/components/shared/PageHeader';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Roadmap() {
  const [milestones, setMilestones] = useState([]);
  const [projects, setProjects] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('milestones');

  useEffect(() => {
    Promise.all([
      base44.entities.Milestone.list(),
      base44.entities.Project.list(),
      base44.entities.Portfolio.list(),
    ]).then(([m, p, po]) => { setMilestones(m); setProjects(p); setPortfolios(po); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const now = new Date();
  const currentMonth = now.getMonth();
  const months = Array.from({ length: 6 }, (_, i) => (currentMonth + i) % 12);

  const projectMap = Object.fromEntries(projects.map(p => [p.id, p.project_name]));
  const portfolioMap = Object.fromEntries(portfolios.map(p => [p.id, p.portfolio_name]));

  const overdue = milestones.filter(m => m.due_date && new Date(m.due_date) < now && m.status !== 'completed');
  const upcoming = milestones.filter(m => m.due_date && new Date(m.due_date) >= now && m.status !== 'completed')
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 10);

  const getMonthMilestones = (monthIdx) => {
    return milestones.filter(m => {
      if (!m.due_date) return false;
      const d = new Date(m.due_date);
      return d.getMonth() === monthIdx;
    });
  };

  const getMonthProjects = (monthIdx) => {
    return projects.filter(p => {
      if (!p.due_date) return false;
      const d = new Date(p.due_date);
      return d.getMonth() === monthIdx;
    });
  };

  return (
    <div>
      <PageHeader title="Roadmap" subtitle="Milestones and timelines across all projects" />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Flag className="w-3.5 h-3.5" /> Total Milestones</div>
          <p className="text-2xl font-bold">{milestones.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><AlertCircle className="w-3.5 h-3.5" /> Overdue</div>
          <p className="text-2xl font-bold text-red-600">{overdue.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Calendar className="w-3.5 h-3.5" /> Upcoming</div>
          <p className="text-2xl font-bold text-blue-600">{upcoming.length}</p>
        </CardContent></Card>
      </div>

      {view === 'milestones' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {months.map((monthIdx, i) => {
            const monthMilestones = getMonthMilestones(monthIdx);
            return (
              <Card key={i}>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    {MONTH_NAMES[monthIdx]}
                  </h3>
                  {monthMilestones.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">No milestones</p>
                  ) : (
                    <div className="space-y-2">
                      {monthMilestones.map(m => (
                        <div key={m.id} className="p-2 rounded-md bg-muted/50">
                          <p className="text-sm font-medium truncate">{m.milestone_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <StatusBadge status={m.status} />
                          </div>
                          {m.project && <p className="text-xs text-muted-foreground mt-1">{projectMap[m.project] || '—'}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {view === 'projects' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {months.map((monthIdx, i) => {
            const monthProjects = getMonthProjects(monthIdx);
            return (
              <Card key={i}>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-3">{MONTH_NAMES[monthIdx]}</h3>
                  {monthProjects.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">No projects due</p>
                  ) : (
                    <div className="space-y-2">
                      {monthProjects.map(p => (
                        <div key={p.id} className="p-2 rounded-md bg-muted/50">
                          <Link to="/projects" className="text-sm font-medium hover:text-primary">{p.project_name}</Link>
                          <div className="flex items-center gap-2 mt-1">
                            <StatusBadge status={p.status} />
                          </div>
                          <div className="mt-2">
                            <Progress value={p.completion_percentage || 0} className="h-1" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-8">
        <h3 className="font-semibold text-sm mb-3">Overdue Milestones</h3>
        {overdue.length === 0 ? (
          <Card><CardContent className="p-4 text-center text-sm text-muted-foreground">No overdue milestones 🎉</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {overdue.map(m => (
              <Card key={m.id}><CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{m.milestone_name}</p>
                  <p className="text-xs text-muted-foreground">{projectMap[m.project] || 'No project'} · Due {m.due_date ? new Date(m.due_date).toLocaleDateString() : '—'}</p>
                </div>
                <Badge variant="outline" className="text-red-700 bg-red-500/10">Overdue</Badge>
              </CardContent></Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}