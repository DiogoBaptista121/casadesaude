import * as React from 'react';
import { format, parse, isValid } from 'date-fns';
import { pt } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DatePickerInputProps {
  /** Controlled value — YYYY-MM-DD string or empty string */
  value: string;
  /** Called with YYYY-MM-DD string when user picks a date */
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * A polished date picker that uses the shadcn Calendar (react-day-picker) in a
 * Popover, allowing easy month/year navigation. Accepts and returns ISO date
 * strings (YYYY-MM-DD) to stay API-compatible with the native <input type="date">.
 */
export function DatePickerInput({
  value,
  onChange,
  placeholder = 'Selecione uma data',
  disabled = false,
  className,
}: DatePickerInputProps) {
  const [open, setOpen] = React.useState(false);

  // Parse the string value into a Date for DayPicker
  const selected: Date | undefined = React.useMemo(() => {
    if (!value) return undefined;
    const d = parse(value, 'yyyy-MM-dd', new Date());
    return isValid(d) ? d : undefined;
  }, [value]);

  const handleSelect = (day: Date | undefined) => {
    if (day) {
      onChange(format(day, 'yyyy-MM-dd'));
    } else {
      onChange('');
    }
    setOpen(false);
  };

  return (
    <Popover modal={false} open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal h-10',
            !selected && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          {selected
            ? format(selected, "d 'de' MMMM 'de' yyyy", { locale: pt })
            : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-[200]" align="start" side="bottom">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          defaultMonth={selected}
          locale={pt}
          formatters={{
            formatMonthCaption: (date, options) => {
              const m = format(date, 'MMMM', { locale: options?.locale });
              return m.charAt(0).toUpperCase() + m.slice(1);
            }
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
