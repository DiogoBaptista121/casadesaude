import { CalendarEvent, CalendarEventData } from './CalendarEvent';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { CalendarDays } from 'lucide-react';

interface DayViewProps {
  date: Date;
  events: CalendarEventData[];
  onEventClick: (event: CalendarEventData) => void;
}

const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8:00 to 19:00

export function DayView({ date, events, onEventClick }: DayViewProps) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const dayEvents = events.filter(e => e.date === dateStr);

  const getEventsForHour = (hour: number) => {
    return dayEvents.filter(e => {
      const eventHour = parseInt(e.time.split(':')[0], 10);
      return eventHour === hour;
    });
  };

  if (dayEvents.length === 0) {
    return (
      <Card className="p-8">
        <EmptyState
          icon={CalendarDays}
          title="Sem consultas"
          description="Não existem consultas marcadas para este dia."
        />
      </Card>
    );
  }

  return (
    <div className="flex flex-col h-full rounded-xl border border-border/50 shadow-sm bg-card overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="divide-y divide-border/50">
          {hours.map((hour) => {
            const hourEvents = getEventsForHour(hour);
            return (
              <div key={hour} className="flex min-h-[80px]">
                <div className="w-16 p-2 text-[11px] font-medium text-muted-foreground flex-shrink-0 border-r border-border/50 text-center tracking-wider bg-muted/10">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                <div className="flex-1 p-2 space-y-[2px]">
                  {hourEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => onEventClick(event)}
                      className="w-full text-left flex items-center gap-2 px-2 py-1 rounded-sm transition-opacity hover:opacity-80 text-xs"
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
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
