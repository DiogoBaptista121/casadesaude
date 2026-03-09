import { CalendarEvent, CalendarEventData } from './CalendarEvent';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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

  const getEventsForDay = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return events
      .filter(e => e.date === dateStr)
      .sort((a, b) => a.time.localeCompare(b.time))
      .slice(0, 3);
  };

  const getEventCountForDay = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return events.filter(e => e.date === dateStr).length;
  };

  const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  return (
    <div className="flex flex-col h-full rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm bg-card overflow-hidden">
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-transparent shrink-0">
        {weekDays.map((d) => (
          <div
            key={d}
            className="pb-3 pt-3 text-center text-[11px] uppercase tracking-widest font-semibold text-slate-400 dark:text-slate-500"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div className="divide-y divide-slate-200 dark:divide-slate-700/50 flex flex-col flex-1">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 divide-x divide-slate-200 dark:divide-slate-700/50 flex-1">
            {week.map((dayItem) => {
              const dayEvents = getEventsForDay(dayItem);
              const totalCount = getEventCountForDay(dayItem);
              const isCurrentMonth = isSameMonth(dayItem, date);
              const isToday = isSameDay(dayItem, today);

              return (
                <div
                  key={dayItem.toISOString()}
                  className={cn(
                    "flex flex-col h-full overflow-hidden p-1.5 transition-colors",
                    isToday && "bg-slate-50/30 dark:bg-slate-800/20"
                  )}
                >
                  <div className="flex justify-end pb-1">
                    <div className={cn(
                      "flex items-center justify-center",
                      isToday
                        ? "w-7 h-7 rounded-full bg-teal-600 text-white font-bold shadow-sm"
                        : isCurrentMonth
                          ? "text-xs font-semibold text-slate-500 dark:text-slate-400"
                          : "text-xs font-semibold text-slate-300 dark:text-slate-600"
                    )}>
                      {format(dayItem, 'd')}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {dayEvents.map((event) => (
                      <CalendarEvent
                        key={event.id}
                        event={event}
                        onClick={onEventClick}
                        compact
                      />
                    ))}
                    {totalCount > 3 && (
                      <p className="text-[10px] text-muted-foreground text-center font-medium">
                        +{totalCount - 3} mais
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
