import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, addWeeks, addMonths, addYears, subDays, subWeeks, subMonths, subYears } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export type CalendarView = 'dia' | 'semana' | 'mes' | 'ano';

interface CalendarViewSelectorProps {
  view: CalendarView;
  setView: (view: CalendarView) => void;
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
}

const viewLabels: Record<CalendarView, string> = {
  dia: 'Dia',
  semana: 'Semana',
  mes: 'Mês',
  ano: 'Ano',
};

export function CalendarViewSelector({ view, setView, currentDate, setCurrentDate }: CalendarViewSelectorProps) {
  const handlePrev = () => {
    switch (view) {
      case 'dia': setCurrentDate(subDays(currentDate, 1)); break;
      case 'semana': setCurrentDate(subWeeks(currentDate, 1)); break;
      case 'mes': setCurrentDate(subMonths(currentDate, 1)); break;
      case 'ano': setCurrentDate(subYears(currentDate, 1)); break;
    }
  };

  const handleNext = () => {
    switch (view) {
      case 'dia': setCurrentDate(addDays(currentDate, 1)); break;
      case 'semana': setCurrentDate(addWeeks(currentDate, 1)); break;
      case 'mes': setCurrentDate(addMonths(currentDate, 1)); break;
      case 'ano': setCurrentDate(addYears(currentDate, 1)); break;
    }
  };

  const getTitle = () => {
    switch (view) {
      case 'dia': return format(currentDate, "EEEE, d 'de' MMMM yyyy", { locale: pt });
      case 'semana': return format(currentDate, "'Semana de' d 'de' MMMM yyyy", { locale: pt });
      case 'mes': return format(currentDate, "MMMM 'de' yyyy", { locale: pt });
      case 'ano': return format(currentDate, 'yyyy', { locale: pt });
    }
  };

  return (
    <div className="bg-card rounded-xl border border-slate-100 shadow-sm px-4 py-2.5 flex flex-col sm:flex-row gap-3 items-center justify-between">
      {/* Navigation */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={handlePrev} className="h-7 w-7 hover:bg-slate-100">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-sm font-semibold min-w-56 text-center capitalize text-foreground">
          {getTitle()}
        </h2>
        <Button variant="ghost" size="icon" onClick={handleNext} className="h-7 w-7 hover:bg-slate-100">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* View toggle pills */}
      <div className="flex gap-0.5 bg-slate-100 p-0.5 rounded-lg">
        {(['dia', 'semana', 'mes', 'ano'] as CalendarView[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-md transition-all capitalize',
              view === v
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {viewLabels[v]}
          </button>
        ))}
      </div>
    </div>
  );
}
