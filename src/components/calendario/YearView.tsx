import { format, startOfYear, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CalendarEventData } from './CalendarEvent';

interface YearViewProps {
  date: Date;
  events: CalendarEventData[];
  onMonthClick: (month: Date) => void;
}

export function YearView({ date, events, onMonthClick }: YearViewProps) {
  const yearStart = startOfYear(date);
  const months = Array.from({ length: 12 }, (_, i) => addMonths(yearStart, i));
  const today = new Date();

  const getEventCountForMonth = (month: Date) => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    return events.filter(e => {
      const eventDate = new Date(e.date);
      return eventDate >= monthStart && eventDate <= monthEnd;
    }).length;
  };

  return (
    <div className="overflow-y-auto h-full p-2 custom-scrollbar">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {months.map((month) => {
          const eventCount = getEventCountForMonth(month);
          const days = eachDayOfInterval({
            start: startOfMonth(month),
            end: endOfMonth(month),
          });

          return (
            <button
              key={month.toISOString()}
              onClick={() => onMonthClick(month)}
              className="bg-card rounded-xl border border-border/50 shadow-sm p-4 hover:border-primary/50 hover:shadow-md hover:bg-muted/10 transition-all text-left group"
            >
              <p className="font-medium text-sm capitalize mb-3 text-muted-foreground group-hover:text-foreground transition-colors">
                {format(month, 'MMMM', { locale: pt })}
              </p>
              <div className="grid grid-cols-7 gap-0.5 text-xs">
                {days.slice(0, 7).map((_, i) => (
                  <span key={i} className="text-muted-foreground text-center">
                    {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'][i]}
                  </span>
                ))}
                {/* First week padding */}
                {Array.from({ length: (startOfMonth(month).getDay() + 6) % 7 }).map((_, i) => (
                  <span key={`pad-${i}`} />
                ))}
                {days.map((day) => {
                  const hasEvent = events.some(e => e.date === format(day, 'yyyy-MM-dd'));
                  const isToday = isSameDay(day, today);
                  return (
                    <span
                      key={day.toISOString()}
                      className={cn(
                        "w-5 h-5 flex items-center justify-center rounded-full text-center mx-auto text-[11px]",
                        hasEvent && "bg-primary/10 text-primary font-medium",
                        isToday && "bg-primary text-primary-foreground font-bold shadow-sm"
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                  );
                })}
              </div>
              {eventCount > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {eventCount} consulta{eventCount !== 1 ? 's' : ''}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
