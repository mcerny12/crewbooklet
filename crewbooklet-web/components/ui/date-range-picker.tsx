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
  isBefore,
  isWithinInterval,
} from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarIcon, X } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from './popover';
import { cn } from '@/lib/utils';

interface DateRangePickerProps {
  startDate: string | null;
  endDate: string | null;
  onChangeStart: (v: string | null) => void;
  onChangeEnd: (v: string | null) => void;
  className?: string;
}

export function DateRangePicker({
  startDate,
  endDate,
  onChangeStart,
  onChangeEnd,
  className,
}: DateRangePickerProps) {
  const start = startDate ? new Date(startDate + 'T00:00:00') : null;
  const end = endDate ? new Date(endDate + 'T00:00:00') : null;

  const [viewMonth, setViewMonth] = useState<Date>(start ?? new Date());
  const [hovered, setHovered] = useState<Date | null>(null);
  const [open, setOpen] = useState(false);

  // Build calendar grid for viewMonth
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days: Date[] = [];
  let d = calStart;
  while (d <= calEnd) { days.push(d); d = addDays(d, 1); }

  const handleDayClick = (day: Date) => {
    if (!start || (start && end)) {
      // No start yet, or both already set → start fresh
      onChangeStart(format(day, 'yyyy-MM-dd'));
      onChangeEnd(null);
    } else {
      // Start set, no end
      if (isSameDay(day, start)) {
        onChangeStart(null);
      } else if (isBefore(day, start)) {
        onChangeStart(format(day, 'yyyy-MM-dd'));
        onChangeEnd(null);
      } else {
        onChangeEnd(format(day, 'yyyy-MM-dd'));
        setOpen(false);
      }
    }
  };

  const isInRange = (day: Date): boolean => {
    const rangeEnd = end ?? (start && hovered && !isBefore(hovered, start) ? hovered : null);
    if (!start || !rangeEnd) return false;
    try { return isWithinInterval(day, { start, end: rangeEnd }); } catch { return false; }
  };

  const triggerLabel = () => {
    if (start && end) return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
    if (start) return `${format(start, 'MMM d, yyyy')} →`;
    return null;
  };

  const label = triggerLabel();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex items-center gap-1.5 h-7 px-2 text-xs border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 w-full text-left transition-colors',
            !label && 'text-gray-400',
            className
          )}
        >
          <CalendarIcon className="h-3 w-3 text-gray-400 shrink-0" />
          <span className="flex-1">{label ?? 'Pick date range'}</span>
          {(start || end) && (
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                onChangeStart(null);
                onChangeEnd(null);
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="h-3 w-3" />
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="p-2 w-60">
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

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-0.5">
          {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((h) => (
            <div key={h} className="text-center text-[10px] text-gray-400 font-medium py-0.5">{h}</div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-px">
          {days.map((day, i) => {
            const inMonth = isSameMonth(day, viewMonth);
            const isStart = start ? isSameDay(day, start) : false;
            const isEnd = end ? isSameDay(day, end) : false;
            const inRange = isInRange(day) && !isStart && !isEnd;
            const todayDay = isToday(day);
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleDayClick(day)}
                onMouseEnter={() => setHovered(day)}
                onMouseLeave={() => setHovered(null)}
                className={cn(
                  'text-center text-[10px] py-0.5 rounded transition-colors',
                  !inMonth && 'text-gray-300 dark:text-gray-600',
                  (isStart || isEnd) && 'bg-blue-600 text-white font-medium',
                  inRange && 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200',
                  todayDay && !isStart && !isEnd && 'ring-1 ring-inset ring-blue-400',
                  inMonth && !isStart && !isEnd && 'hover:bg-gray-100 dark:hover:bg-gray-800',
                )}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>

        {/* Status hint + clear */}
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-[10px] text-gray-400">
            {!start ? 'Click to set start' : !end ? 'Click to set end' : ''}
          </span>
          {(start || end) && (
            <button
              type="button"
              onClick={() => { onChangeStart(null); onChangeEnd(null); }}
              className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Inline variant: calendar always visible, no popover ─────────────────────

interface InlineDateRangePickerProps {
  startDate: string | null;
  endDate: string | null;
  onChangeStart: (v: string | null) => void;
  onChangeEnd: (v: string | null) => void;
}

export function InlineDateRangePicker({
  startDate,
  endDate,
  onChangeStart,
  onChangeEnd,
}: InlineDateRangePickerProps) {
  const start = startDate ? new Date(startDate + 'T00:00:00') : null;
  const end = endDate ? new Date(endDate + 'T00:00:00') : null;
  const [viewMonth, setViewMonth] = useState<Date>(start ?? new Date());
  const [hovered, setHovered] = useState<Date | null>(null);

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days: Date[] = [];
  let d = calStart;
  while (d <= calEnd) { days.push(d); d = addDays(d, 1); }

  const handleDayClick = (day: Date) => {
    if (!start || (start && end)) {
      onChangeStart(format(day, 'yyyy-MM-dd'));
      onChangeEnd(null);
    } else {
      if (isSameDay(day, start)) {
        onChangeStart(null);
      } else if (isBefore(day, start)) {
        onChangeStart(format(day, 'yyyy-MM-dd'));
        onChangeEnd(null);
      } else {
        onChangeEnd(format(day, 'yyyy-MM-dd'));
      }
    }
  };

  const isInRange = (day: Date): boolean => {
    const rangeEnd = end ?? (start && hovered && !isBefore(hovered, start) ? hovered : null);
    if (!start || !rangeEnd) return false;
    try { return isWithinInterval(day, { start, end: rangeEnd }); } catch { return false; }
  };

  return (
    <div className="select-none">
      {/* Month header */}
      <div className="flex items-center justify-between mb-1">
        <button
          type="button"
          onClick={() => setViewMonth(subMonths(viewMonth, 1))}
          className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="text-xs font-medium">{format(viewMonth, 'MMMM yyyy')}</span>
        <button
          type="button"
          onClick={() => setViewMonth(addMonths(viewMonth, 1))}
          className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-0.5">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((h) => (
          <div key={h} className="text-center text-[10px] text-gray-400 font-medium py-0.5">{h}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-px">
        {days.map((day, i) => {
          const inMonth = isSameMonth(day, viewMonth);
          const isStart = start ? isSameDay(day, start) : false;
          const isEnd = end ? isSameDay(day, end) : false;
          const inRange = isInRange(day) && !isStart && !isEnd;
          const todayDay = isToday(day);
          return (
            <button
              key={i}
              type="button"
              onClick={() => handleDayClick(day)}
              onMouseEnter={() => setHovered(day)}
              onMouseLeave={() => setHovered(null)}
              className={cn(
                'text-center text-xs py-1 rounded transition-colors',
                !inMonth && 'text-gray-300 dark:text-gray-600',
                (isStart || isEnd) && 'bg-blue-600 text-white font-semibold',
                inRange && 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200',
                todayDay && !isStart && !isEnd && 'ring-1 ring-inset ring-blue-400',
                inMonth && !isStart && !isEnd && 'hover:bg-gray-100 dark:hover:bg-gray-800',
              )}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>

      {/* Status line */}
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-[10px] text-gray-400">
          {start && end
            ? `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
            : start
            ? `${format(start, 'MMM d, yyyy')} → pick end`
            : 'Click a day to set start'}
        </span>
        {(start || end) && (
          <button
            type="button"
            onClick={() => { onChangeStart(null); onChangeEnd(null); }}
            className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
