import React, { useState } from 'react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Clock, AlertCircle } from 'lucide-react';
import { STATUS_COLORS, PRIORITY_COLORS } from './WorkboardConstants';

export default function CalendarView({ items, users, onItemClick }) {
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Group items by date
  const itemsByDate = items.reduce((acc, item) => {
    if (!item.due_date) return acc;
    const date = item.due_date.split('T')[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {});

  const getItemsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return itemsByDate[dateStr] || [];
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isOverdue = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {/* Calendar */}
      <div className="lg:col-span-1">
        <Card>
          <CardContent className="p-4">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
              modifiers={{
                hasItems: (date) => getItemsForDate(date).length > 0,
              }}
              modifiersClassNames={{
                hasItems: 'bg-primary/10 font-bold',
                today: 'bg-primary/20 font-bold',
              }}
            />
          </CardContent>
        </Card>

        {/* Selected Date Items */}
        <Card className="mt-4">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
              })}
            </h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {getItemsForDate(selectedDate).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No items due</p>
              ) : (
                getItemsForDate(selectedDate).map(item => (
                  <Card key={item.id} className="cursor-pointer hover:bg-accent" onClick={() => onItemClick?.(item)}>
                    <CardContent className="p-3 space-y-2">
                      <div className="font-medium text-sm line-clamp-1">{item.title}</div>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${STATUS_COLORS[item.status_color]}`}>
                          {item.status}
                        </Badge>
                        {isOverdue(new Date(item.due_date)) && item.status !== 'Done' && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Overdue
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Items */}
      <div className="lg:col-span-3">
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Upcoming This Week
            </h3>
            <div className="space-y-4">
              {Array.from({ length: 7 }).map((_, i) => {
                const date = new Date();
                date.setDate(date.getDate() + i);
                const dateStr = date.toISOString().split('T')[0];
                const dayItems = itemsByDate[dateStr] || [];
                
                if (dayItems.length === 0) return null;

                return (
                  <div key={dateStr} className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <div className={`w-2 h-2 rounded-full ${isToday(date) ? 'bg-primary' : 'bg-muted'}`} />
                      <span className="font-medium">
                        {date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                      </span>
                      {isOverdue(date) && <span className="text-destructive text-xs">(Overdue)</span>}
                      <Badge variant="secondary" className="text-xs">{dayItems.length}</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {dayItems.map(item => (
                        <Card key={item.id} className="cursor-pointer hover:shadow-sm" onClick={() => onItemClick?.(item)}>
                          <CardContent className="p-3 space-y-2">
                            <div className="font-medium text-sm line-clamp-1">{item.title}</div>
                            <div className="flex items-center justify-between">
                              <Badge className={`text-xs ${STATUS_COLORS[item.status_color]}`}>
                                {item.status}
                              </Badge>
                              <Badge variant="outline" className={`text-xs ${PRIORITY_COLORS[item.priority_color]}`}>
                                {item.priority}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}