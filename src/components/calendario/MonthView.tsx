import { CalendarEventData } from './CalendarEvent';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isWeekend } from 'date-fns';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { pt } from 'date-fns/locale';

interface MonthViewProps {
  date: Date;
  events: CalendarEventData[];
  onEventClick: (event: CalendarEventData) => void;
}

export function MonthView({ date, events, onEventClick }: MonthViewProps) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const today = new Date();
  const days: Date[] = [];
  let day = calendarStart;

  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  return (
    <div className="flex flex-col h-full rounded-xl border border-border/50 shadow-sm bg-card overflow-hidden">
      {/* Day-of-week header — extremely compact */}
      <div className="grid grid-cols-7 border-b border-border/50 bg-transparent shrink-0">
        {weekDays.map((d, idx) => (
          <div
            key={d}
            className={cn(
              'py-1.5 text-center text-[10px] uppercase tracking-wider font-medium',
              idx >= 5 ? 'text-muted-foreground/50' : 'text-muted-foreground'
            )}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Scrollable Weeks grid container */}
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar min-h-0">
        <div 
          className="grid divide-y divide-border/50"
          style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(120px, 1fr))` }}
        >
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 divide-x divide-border/50">
            {week.map((dayItem) => {
              const dateStr = format(dayItem, 'yyyy-MM-dd');
              const allDayEvents = events.filter(e => e.date === dateStr).sort((a, b) => a.time.localeCompare(b.time));
              const dayEvents = allDayEvents.slice(0, 3);
              const totalCount = allDayEvents.length;
              const isCurrentMonth = isSameMonth(dayItem, date);
              const isToday = isSameDay(dayItem, today);
              const isWeekendDay = isWeekend(dayItem);

              return (
                <div
                  key={dayItem.toISOString()}
                  className={cn(
                    'flex flex-col min-w-0 min-h-[120px] overflow-hidden p-1 transition-colors group',
                    isWeekendDay && 'bg-muted/10',
                    isToday && 'bg-primary/5'
                  )}
                >
                  <div className="flex justify-center mb-1">
                    <div className={cn(
                      'flex items-center justify-center text-[11px] font-medium w-6 h-6 rounded-full',
                      isToday
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : isCurrentMonth
                          ? isWeekendDay
                            ? 'text-muted-foreground/70'
                            : 'text-foreground hover:bg-muted/50 cursor-pointer'
                          : 'text-muted-foreground/30'
                    )}>
                      {format(dayItem, 'd')}
                    </div>
                  </div>
                  
                  {/* Events list container */}
                  <div className="flex-1 overflow-y-auto space-y-[2px] pr-0.5 custom-scrollbar">
                    {dayEvents.map((event) => (
                      <button
                        key={event.id}
                        onClick={() => onEventClick(event)}
                        className="w-full text-left flex items-center gap-1.5 px-1.5 py-0.5 rounded-sm transition-opacity hover:opacity-80 text-xs"
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
                    
                    {totalCount > 3 && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            className="text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded px-1 w-full text-left transition-colors cursor-pointer mt-0.5"
                          >
                            +{totalCount - 3} mais
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-2 z-50 shadow-xl" align="start">
                          <h4 className="text-sm font-medium mb-2 px-1 pb-1 border-b capitalize">
                            {format(dayItem, "d 'de' MMMM", { locale: pt })}
                          </h4>
                          <div className="max-h-[300px] overflow-y-auto space-y-1 custom-scrollbar">
                            {allDayEvents.map((event) => (
                              <button
                                key={event.id}
                                onClick={() => onEventClick(event)}
                                className="w-full text-left flex items-center gap-1.5 px-1.5 py-1 rounded-sm transition-opacity hover:opacity-80 text-xs"
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
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}
