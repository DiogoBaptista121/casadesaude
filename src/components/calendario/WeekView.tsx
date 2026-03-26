import { CalendarEvent, CalendarEventData } from './CalendarEvent';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface WeekViewProps {
  date: Date;
  events: CalendarEventData[];
  onEventClick: (event: CalendarEventData) => void;
}

export function WeekView({ date, events, onEventClick }: WeekViewProps) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  const getEventsForDay = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return events
      .filter(e => e.date === dateStr)
      .sort((a, b) => a.time.localeCompare(b.time));
  };

  return (
    <div className="flex flex-col h-full rounded-xl border border-border/50 shadow-sm bg-card overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border/50 bg-transparent shrink-0">
        {days.map((day) => {
          const isToday = isSameDay(day, today);
          return (
            <div key={`header-${day.toISOString()}`} className={cn(
              "py-1.5 text-center transition-colors",
              isToday && "bg-primary/5"
            )}>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                {format(day, 'EEE', { locale: pt })}
              </p>
              <p className={cn(
                "text-[11px] font-medium w-6 h-6 mx-auto rounded-full flex items-center justify-center mt-0.5",
                isToday ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground"
              )}>
                {format(day, 'd')}
              </p>
            </div>
          );
        })}
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar min-h-0">
        <div className="grid grid-cols-7 divide-x divide-border/50 h-full min-h-[500px]">
          {days.map((day) => {
            const dayEvents = getEventsForDay(day);
            const isToday = isSameDay(day, today);
            
            return (
              <div key={day.toISOString()} className={cn("p-1 transition-colors", isToday && "bg-primary/5")}>
                <div className="space-y-[2px]">
                {dayEvents.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className="w-full text-left flex items-center gap-1.5 px-1.5 py-0.5 rounded-sm transition-opacity hover:opacity-80 text-[11px]"
                    title={event.time + ' - ' + event.title}
                    style={{
                      backgroundColor: `${event.color || '#94a3b8'}26`,
                      color: event.color || '#64748b'
                    }}
                  >
                    <span className="font-semibold opacity-90 shrink-0">{event.time}</span>
                    <span className="truncate font-medium">{event.title}</span>
                  </button>
                ))}
                {dayEvents.length === 0 && (
                  <p className="text-[10px] text-muted-foreground/30 text-center py-2">-</p>
                )}
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
