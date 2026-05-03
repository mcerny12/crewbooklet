'use client';

import { useState } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  addDays,
} from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from './popover';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  className?: string;
}

export function DatePicker({ value, onChange, placeholder = 'Pick a date', className }: DatePickerProps) {
  // Parse date as local date (avoid UTC offset issues)
  const selectedDate = value ? new Date(value + 'T00:00:00') : null;
  const [viewMonth, setViewMonth] = useState<Date>(selectedDate ?? new Date());
  const [open, setOpen] = useState(false);

  // Build the calendar grid for viewMonth
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let day = calStart;
  while (day <= calEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const handleDayClick = (d: Date) => {
    onChange(format(d, 'yyyy-MM-dd'));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex items-center gap-1.5 h-6 px-2 text-xs border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 w-full text-left transition-colors',
            !selectedDate && 'text-gray-400',
            className
          )}
        >
          <CalendarIcon className="h-3 w-3 text-gray-400 shrink-0" />
          {selectedDate ? format(selectedDate, 'MMM d, yyyy') : placeholder}
        </button>
      </PopoverTrigger>

      <PopoverContent className="p-2 w-52">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-1.5">
          <button
            type="button"
            onClick={() => setViewMonth(subMonths(viewMonth, 1))}
            className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
          <span className="text-xs font-medium">{format(viewMonth, 'MMMM yyyy')}</span>
          <button
            type="button"
            onClick={() => setViewMonth(addMonths(viewMonth, 1))}
            className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-0.5">
          {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
            <div key={d} className="text-center text-[10px] text-gray-400 font-medium py-0.5">
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-px">
          {days.map((d, i) => {
            const inMonth = isSameMonth(d, viewMonth);
            const selected = selectedDate ? isSameDay(d, selectedDate) : false;
            const todayDay = isToday(d);
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleDayClick(d)}
                className={cn(
                  'text-center text-[10px] py-0.5 rounded transition-colors',
                  !inMonth && 'text-gray-300 dark:text-gray-600',
                  selected && 'bg-blue-600 text-white font-medium',
                  todayDay && !selected && 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium',
                  inMonth && !selected && 'hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                {format(d, 'd')}
              </button>
            );
          })}
        </div>

        {/* Clear */}
        {selectedDate && (
          <button
            type="button"
            onClick={() => { onChange(null); setOpen(false); }}
            className="mt-1.5 w-full text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-center transition-colors"
          >
            Clear date
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
