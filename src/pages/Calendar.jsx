import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import PageHeader from '@/components/shared/PageHeader';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

export default function Calendar() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    Promise.all([
      base44.entities.Task.list(),
      base44.entities.Project.list(),
    ]).then(([t, p]) => {
      setTasks(t); setProjects(p);
    }).finally(() => setLoading(false));
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getItemsForDay = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayTasks = tasks.filter(t => t.due_date === dateStr);
    const dayProjects = projects.filter(p => p.due_date === dateStr);
    return { tasks: dayTasks, projects: dayProjects };
  };

  if (loading) return <LoadingSpinner />;

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div>
      <PageHeader title="Calendar" subtitle="Tasks and project deadlines" />

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
            <h2 className="text-lg font-semibold">{monthName}</h2>
            <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
          </div>

          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
            ))}
            {days.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} className="bg-card p-2 min-h-[80px]" />;
              const { tasks: dayTasks, projects: dayProjects } = getItemsForDay(day);
              const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
              return (
                <div key={day} className={`bg-card p-1.5 min-h-[80px] ${isToday ? 'ring-2 ring-primary ring-inset' : ''}`}>
                  <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {dayTasks.slice(0, 2).map(t => (
                      <div key={t.id} className="text-[10px] px-1 py-0.5 rounded bg-violet-500/10 text-violet-700 dark:text-violet-300 truncate">{t.title}</div>
                    ))}
                    {dayProjects.slice(0, 1).map(p => (
                      <div key={p.id} className="text-[10px] px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 truncate">{p.project_name}</div>
                    ))}
                    {(dayTasks.length > 2 || dayProjects.length > 1) && (
                      <div className="text-[10px] text-muted-foreground px-1">+{dayTasks.length + dayProjects.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}