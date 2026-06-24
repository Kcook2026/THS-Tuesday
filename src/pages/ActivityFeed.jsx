import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, FolderKanban, CheckSquare, Users, Building2, FileText } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

const ICONS = {
  Project: FolderKanban,
  Task: CheckSquare,
  Team: Users,
  Client: Building2,
  Document: FileText,
};

export default function ActivityFeed() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Activity.list('-created_date', 50)
      .then(setActivities)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Activity Feed" subtitle="Recent actions across the workspace" />

      {activities.length === 0 ? (
        <EmptyState icon={Activity} title="No activity yet" description="Actions will appear here as your team works" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {activities.map(a => {
                const Icon = ICONS[a.record_type] || Activity;
                return (
                  <div key={a.id} className="flex items-start gap-4 px-5 py-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-semibold">{a.user_name || 'Unknown'}</span>{' '}
                        <span className="text-muted-foreground">{a.action}</span>{' '}
                        {a.record_name && <span className="font-medium">{a.record_name}</span>}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{a.record_type}</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{new Date(a.created_date).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}