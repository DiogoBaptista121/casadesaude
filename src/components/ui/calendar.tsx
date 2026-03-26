import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const [mode, setMode] = React.useState<'days' | 'months' | 'years'>('days');
  
  // Try to use the passed date to establish our navigation center, default to today
  const defaultNavDate = React.useMemo(() => {
    if (props.defaultMonth) return props.defaultMonth;
    if (props.selected instanceof Date) return props.selected;
    return new Date();
  }, []);

  const [navDate, setNavDate] = React.useState<Date>(defaultNavDate);

  // Sync navDate with external props if they change
  React.useEffect(() => {
    if (props.defaultMonth) setNavDate(props.defaultMonth);
    else if (props.selected instanceof Date) setNavDate(props.selected);
  }, [props.defaultMonth, props.selected]);

  return (
    <div className={cn("w-[300px] h-[360px] flex flex-col p-3 bg-popover border border-border rounded-xl shadow-xl overflow-hidden", className)}>
      {mode === 'months' && (
        <div className="flex-col h-full w-full flex">
          <div className="flex items-center justify-center pt-1 mb-4 relative shrink-0">
            <button 
              onClick={() => setMode('years')} 
              className="text-sm font-medium hover:bg-muted px-2 py-1 rounded-md transition-colors"
            >
              {format(navDate, 'yyyy')}
            </button>
          </div>
          <div className="flex-1 grid grid-cols-3 h-full gap-2 p-2 items-center">
            {Array.from({ length: 12 }, (_, i) => {
              const date = new Date(navDate.getFullYear(), i, 1);
              const isSelected = navDate.getMonth() === i;
              return (
                <button
                  key={i}
                  onClick={() => {
                    setNavDate(date);
                    setMode('days');
                  }}
                  className={cn(
                    "w-full h-full flex items-center justify-center rounded-lg text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary capitalize",
                    isSelected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                  )}
                >
                  {format(date, 'MMM', { locale: pt })}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {mode === 'years' && (
        <div className="flex-col h-full w-full flex">
          <div className="flex items-center justify-center pt-1 mb-4 relative shrink-0">
            <button 
              onClick={() => setNavDate(new Date(navDate.getFullYear() - 12, navDate.getMonth(), 1))}
              className="absolute left-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 flex items-center justify-center border rounded-md"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-sm font-medium">
              {navDate.getFullYear() - 5} - {navDate.getFullYear() + 6}
            </div>
            <button 
              onClick={() => setNavDate(new Date(navDate.getFullYear() + 12, navDate.getMonth(), 1))}
              className="absolute right-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 flex items-center justify-center border rounded-md"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 grid grid-cols-3 h-full gap-2 p-2 items-center">
            {Array.from({ length: 12 }, (_, i) => {
              const year = navDate.getFullYear() - 5 + i;
              const isSelected = navDate.getFullYear() === year;
              return (
                <button
                  key={year}
                  onClick={() => {
                    setNavDate(new Date(year, navDate.getMonth(), 1));
                    setMode('months');
                  }}
                  className={cn(
                    "w-full h-full flex items-center justify-center rounded-lg text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary",
                    isSelected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                  )}
                >
                  {year}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {mode === 'days' && (
        <DayPicker
          month={navDate}
          onMonthChange={setNavDate}
          showOutsideDays={showOutsideDays}
          className="p-0 m-0 w-full h-full flex flex-col"
          classNames={{
            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 w-full h-full",
            month: "space-y-4 w-full h-full flex flex-col",
            caption: "flex justify-center pt-1 relative items-center shrink-0",
            caption_label: "text-sm font-medium",
            nav: "space-x-1 flex items-center",
            nav_button: cn(
              buttonVariants({ variant: "outline" }),
              "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
            ),
            nav_button_previous: "absolute left-1",
            nav_button_next: "absolute right-1",
            table: "w-full border-collapse space-y-1 flex-1",
            head_row: "flex justify-between w-full mb-1",
            head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] text-center px-0 flex-1",
            row: "flex w-full justify-between mt-1",
            cell: "h-9 w-9 text-center text-sm p-0 m-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20 flex items-center justify-center",
            day: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 font-normal aria-selected:opacity-100"),
            day_range_end: "day-range-end",
            day_selected:
              "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
            day_today: "bg-accent text-accent-foreground",
            day_outside:
              "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
            day_disabled: "text-muted-foreground opacity-50",
            day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
            day_hidden: "invisible",
            ...classNames,
          }}
          components={{
            IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
            IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
            CaptionLabel: ({ displayMonth }) => (
              <div className="flex gap-1 items-center justify-center">
                <button
                  onClick={() => setMode('months')}
                  className="text-sm font-medium hover:bg-muted px-2 py-1 rounded-md transition-colors capitalize"
                >
                  {format(displayMonth, 'MMMM', { locale: pt })}
                </button>
                <button
                  onClick={() => setMode('years')}
                  className="text-sm font-medium hover:bg-muted px-2 py-1 rounded-md transition-colors"
                >
                  {format(displayMonth, 'yyyy')}
                </button>
              </div>
            )
          }}
          {...props}
        />
      )}
    </div>
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
