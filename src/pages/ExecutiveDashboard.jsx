import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/lib/WorkspaceContext';
import usePermissions from '@/hooks/usePermissions';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard, Target, CheckCircle, BarChart3, Users, FolderKanban,
  Clock, TrendingUp, AlertTriangle, Zap, Activity, ArrowUpRight, ArrowDownRight, Minus,
  Briefcase, Building2, DollarSign, CalendarDays, CheckSquare, AlertCircle, Shield,
} from 'lucide-react';

export default function ExecutiveDashboard() {
  const { currentWorkspaceId } = useWorkspace();
  const { canViewExecutiveDashboard, loading: permLoading } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    workspaces: 0,
    workboards: 0,
    projects: 0,
    tasks: 0,
    teams: 0,
    members: 0,
    portfolios: 0,
    goals: 0,
    risks: 0,
    automations: 0,
    budgetTotal: 0,
    budgetSpent: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [healthMetrics, setHealthMetrics] = useState({
    workspace: 'on_track',
    projects: 'on_track',
    portfolios: 'on_track',
    goals: 'on_track',
  });

  useEffect(() => {
    if (!canViewExecutiveDashboard) return;
    
    const loadStats = async () => {
      try {
        const [workspaces, workboards, workboardItems, projects, teams, members, portfolios, goals, risks, activity] = await Promise.all([
          base44.entities.Workspace.list().catch(() => []),
          base44.entities.Workboard.list().catch(() => []),
          base44.entities.WorkboardItem.list().catch(() => []),
          base44.entities.Project.list().catch(() => []),
          base44.entities.Team.list().catch(() => []),
          base44.entities.WorkspaceMember.filter({ status: 'active' }).catch(() => []),
          base44.entities.Portfolio.list().catch(() => []),
          base44.entities.Goal.list().catch(() => []),
          base44.entities.Risk.filter({ status: 'open' }).catch(() => []),
          base44.entities.Activity.filter({}, '-created_date', 20).catch(() => []),
        ]);
        
        const tasks = workboardItems.filter(i => i.item_type === 'task');

        const budgetData = await base44.entities.FinancialRecord.list().catch(() => []);
        const budgetTotal = budgetData.filter(r => r.record_type === 'budget').reduce((sum, r) => sum + (r.amount || 0), 0);
        const budgetSpent = budgetData.filter(r => r.record_type === 'expense').reduce((sum, r) => sum + (r.amount || 0), 0);

        setStats({
          workspaces: workspaces.length,
          workboards: workboards.length,
          projects: projects.length,
          tasks: tasks.length,
          teams: teams.length,
          members: members.length,
          portfolios: portfolios.length,
          goals: goals.length,
          risks: risks.length,
          automations: 0,
          budgetTotal,
          budgetSpent,
        });

        setRecentActivity(activity);

        // Calculate health metrics
        const activeProjects = projects.filter(p => p.status === 'active');
        const onTrackProjects = activeProjects.filter(p => p.completion_percentage >= 50 || !p.due_date || new Date(p.due_date) > new Date());
        setHealthMetrics({
          workspace: workspaces.length > 0 ? 'on_track' : 'at_risk',
          projects: onTrackProjects.length / activeProjects.length > 0.7 ? 'on_track' : 'at_risk',
          portfolios: portfolios.length > 0 ? 'on_track' : 'neutral',
          goals: goals.filter(g => g.status === 'achieved' || g.status === 'on_track').length / goals.length > 0.5 ? 'on_track' : 'at_risk',
        });
      } catch (error) {
        console.error('Error loading executive dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [canViewExecutiveDashboard, currentWorkspaceId]);

  if (permLoading || loading) return <LoadingSpinner />;

  if (!canViewExecutiveDashboard) {
    return (
      <div className="py-16 text-center">
        <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h2 className="text-lg font-semibold mb-2">Access Restricted</h2>
        <p className="text-sm text-muted-foreground">Executive Dashboard is available to System Admins and Executives only.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Executive Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Organization-wide performance and strategic overview</p>
      </div>

      {/* Health Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <HealthCard title="Workspace Health" status={healthMetrics.workspace} icon={LayoutDashboard} description="Overall workspace status" />
        <HealthCard title="Project Health" status={healthMetrics.projects} icon={FolderKanban} description="Active projects status" />
        <HealthCard title="Portfolio Health" status={healthMetrics.portfolios} icon={Briefcase} description="Strategic programs" />
        <HealthCard title="Goal Progress" status={healthMetrics.goals} icon={Target} description="OKRs and KPIs" />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Active Members" value={stats.members} icon={Users} trend="neutral" />
        <MetricCard label="Active Projects" value={stats.projects} icon={FolderKanban} trend="neutral" />
        <MetricCard label="Open Tasks" value={stats.tasks} icon={CheckSquare} trend="neutral" />
        <MetricCard label="Workboards" value={stats.workboards} icon={LayoutDashboard} trend="neutral" />
      </div>

      {/* Strategic Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Portfolios */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Portfolios
            </CardTitle>
            <CardDescription>Strategic programs overview</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold mb-2">{stats.portfolios}</p>
            <p className="text-sm text-muted-foreground">Active portfolios managing strategic initiatives</p>
          </CardContent>
        </Card>

        {/* Goals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4" />
              Goals & OKRs
            </CardTitle>
            <CardDescription>Organizational objectives</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold mb-2">{stats.goals}</p>
            <p className="text-sm text-muted-foreground">Goals with progress tracking</p>
          </CardContent>
        </Card>

        {/* Budget */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Budget Overview
            </CardTitle>
            <CardDescription>Financial performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Total Budget</span>
                  <span className="font-medium">${(stats.budgetTotal / 1000).toFixed(1)}K</span>
                </div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Spent</span>
                  <span className="font-medium">${(stats.budgetSpent / 1000).toFixed(1)}K</span>
                </div>
              </div>
              <Progress 
                value={stats.budgetTotal > 0 ? (stats.budgetSpent / stats.budgetTotal) * 100 : 0} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk & Automation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Risk Summary
            </CardTitle>
            <CardDescription>Open risks requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
              <div>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{stats.risks}</p>
                <p className="text-sm text-amber-600 dark:text-amber-300">Open Risks</p>
              </div>
            </div>
            {stats.risks > 0 && (
              <p className="text-xs text-muted-foreground mt-3">
                Review and mitigate risks in the Risk Management section
              </p>
            )}
          </CardContent>
        </Card>

        {/* Automation Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Automation Activity
            </CardTitle>
            <CardDescription>Organization-wide automation status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Active Automations</p>
                    <p className="text-xs text-muted-foreground">Across all scopes</p>
                  </div>
                </div>
                <Badge>{stats.automations}</Badge>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Organization: System Admin + Executive</p>
                <p>• Workspace: Managers + Owners</p>
                <p>• Workboard: Board Owners + Editors</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Recent Organization Activity
          </CardTitle>
          <CardDescription>Latest actions across all workspaces</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
          ) : (
            <div className="space-y-2">
              {recentActivity.slice(0, 8).map((activity, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                  <span className="flex-1 truncate">{activity.description || 'Activity'}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(activity.created_date).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickLinkCard title="Workspaces" description="Manage all workspaces" icon={LayoutDashboard} href="/workspaces" />
        <QuickLinkCard title="Portfolios" description="Strategic programs" icon={Briefcase} href="/portfolios" />
        <QuickLinkCard title="Goals" description="OKRs and KPIs" icon={Target} href="/goals" />
        <QuickLinkCard title="Reports" description="Executive reporting" icon={BarChart3} href="/reports" />
      </div>
    </div>
  );
}

function HealthCard({ title, status, icon: Icon, description }) {
  const statusConfig = {
    on_track: { color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/40', label: 'On Track' },
    at_risk: { color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/40', label: 'At Risk' },
    blocked: { color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/40', label: 'Blocked' },
    neutral: { color: 'text-muted-foreground', bg: 'bg-muted dark:bg-muted/40', label: 'Neutral' },
  };

  const config = statusConfig[status] || statusConfig.on_track;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Icon className={`w-5 h-5 ${config.color}`} />
          <Badge className={`${config.bg} ${config.color} text-xs`}>{config.label}</Badge>
        </div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function MetricCard({ label, value, icon: Icon, trend }) {
  const trendConfig = {
    up: { icon: ArrowUpRight, color: 'text-green-600' },
    down: { icon: ArrowDownRight, color: 'text-red-600' },
    neutral: { icon: Minus, color: 'text-muted-foreground' },
  };

  const TrendIcon = trendConfig[trend]?.icon || trendConfig.neutral.icon;
  const trendColor = trendConfig[trend]?.color || trendConfig.neutral.color;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <TrendIcon className={`w-3 h-3 ${trendColor}`} />
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function QuickLinkCard({ title, description, icon: Icon, href }) {
  return (
    <Link to={href}>
      <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <Icon className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-semibold">{title}</h3>
          </div>
          <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}