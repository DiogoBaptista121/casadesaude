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

export function CalendarNavigation({ view, setCurrentDate, currentDate }: CalendarViewSelectorProps) {
  const handlePrev = () => {
    switch (view) { case 'dia': setCurrentDate(subDays(currentDate, 1)); break; case 'semana': setCurrentDate(subWeeks(currentDate, 1)); break; case 'mes': setCurrentDate(subMonths(currentDate, 1)); break; case 'ano': setCurrentDate(subYears(currentDate, 1)); break; }
  };
  const handleNext = () => {
    switch (view) { case 'dia': setCurrentDate(addDays(currentDate, 1)); break; case 'semana': setCurrentDate(addWeeks(currentDate, 1)); break; case 'mes': setCurrentDate(addMonths(currentDate, 1)); break; case 'ano': setCurrentDate(addYears(currentDate, 1)); break; }
  };
  const getTitle = () => {
    switch (view) { case 'dia': return format(currentDate, "EEEE, d 'de' MMMM yyyy", { locale: pt }); case 'semana': return format(currentDate, "'Semana de' d 'de' MMMM yyyy", { locale: pt }); case 'mes': return format(currentDate, "MMMM 'de' yyyy", { locale: pt }); case 'ano': return format(currentDate, 'yyyy', { locale: pt }); }
  };

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" onClick={handlePrev} className="h-8 w-8 hover:bg-muted text-muted-foreground">
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={handleNext} className="h-8 w-8 hover:bg-muted text-muted-foreground">
        <ChevronRight className="w-4 h-4" />
      </Button>
      <h2 className="text-sm font-medium min-w-40 ml-2 capitalize text-foreground">
        {getTitle()}
      </h2>
    </div>
  );
}

export function CalendarViewToggles({ view, setView }: Pick<CalendarViewSelectorProps, 'view' | 'setView'>) {
  return (
    <div className="flex gap-0.5 bg-muted/40 p-0.5 rounded-lg border border-border/50">
      {(['dia', 'semana', 'mes', 'ano'] as CalendarView[]).map((v) => (
        <button
          key={v}
          onClick={() => setView(v)}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize',
            view === v
              ? 'bg-card text-foreground shadow-sm border border-border/50'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          {viewLabels[v]}
        </button>
      ))}
    </div>
  );
}
