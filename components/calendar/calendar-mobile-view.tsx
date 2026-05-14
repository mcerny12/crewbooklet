'use client';

import { useState, useMemo } from 'react';
import { format, isToday, isTomorrow, isThisWeek, addMonths, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MobileEmptyState } from '@/components/mobile/mobile-empty-state';
import type { CalendarEvent, ProjectCalendar } from '@/lib/types/models';
import { cn } from '@/lib/utils';

interface CalendarMobileViewProps {
  events: CalendarEvent[];
  calendars: ProjectCalendar[];
  onSelectEvent: (event: CalendarEvent) => void;
  onAddEvent: (date: Date) => void;
}

function eventDateLabel(start: Date, end: Date, isAllDay: boolean): string {
  if (isToday(start)) return isAllDay ? 'Today' : `Today · ${format(start, 'HH:mm')}–${format(end, 'HH:mm')}`;
  if (isTomorrow(start)) return isAllDay ? 'Tomorrow' : `Tomorrow · ${format(start, 'HH:mm')}–${format(end, 'HH:mm')}`;
  if (isThisWeek(start)) return isAllDay ? format(start, 'EEEE') : `${format(start, 'EEEE')} · ${format(start, 'HH:mm')}`;
  return isAllDay ? format(start, 'EEE, MMM d') : `${format(start, 'EEE, MMM d')} · ${format(start, 'HH:mm')}`;
}

function groupByDay(events: CalendarEvent[]): { dayLabel: string; date: Date; events: CalendarEvent[] }[] {
  const map = new Map<string, { date: Date; events: CalendarEvent[] }>();
  for (const ev of events) {
    const d = new Date(ev.start_date);
    const key = format(d, 'yyyy-MM-dd');
    if (!map.has(key)) map.set(key, { date: d, events: [] });
    map.get(key)!.events.push(ev);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, { date, events }]) => ({
      dayLabel: isToday(date) ? 'Today' : isTomorrow(date) ? 'Tomorrow' : format(date, 'EEEE, MMMM d'),
      date,
      events: events.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()),
    }));
}

export function CalendarMobileView({ events, calendars, onSelectEvent, onAddEvent }: CalendarMobileViewProps) {
  const [month, setMonth] = useState(new Date());

  const calMap = useMemo(() => {
    const m: Record<string, ProjectCalendar> = {};
    calendars.forEach(c => { m[c.id] = c; });
    return m;
  }, [calendars]);

  const visibleIds = useMemo(() => new Set(calendars.filter(c => c.is_visible).map(c => c.id)), [calendars]);

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);

  const monthEvents = useMemo(() =>
    events
      .filter(e => visibleIds.has(e.calendar_id))
      .filter(e => isWithinInterval(new Date(e.start_date), { start: monthStart, end: monthEnd }))
      .filter(e => e.status !== 'cancelled'),
    [events, visibleIds, monthStart, monthEnd]
  );

  const grouped = useMemo(() => groupByDay(monthEvents), [monthEvents]);

  return (
    <div className="flex flex-col h-full">
      {/* Month navigation */}
      <div className="shrink-0 flex items-center justify-between border-b bg-card px-4 py-3">
        <button
          type="button"
          onClick={() => setMonth(m => subMonths(m, 1))}
          aria-label="Previous month"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="text-center">
          <p className="text-base font-semibold">{format(month, 'MMMM yyyy')}</p>
          <p className="text-xs text-muted-foreground">{monthEvents.length} event{monthEvents.length !== 1 ? 's' : ''}</p>
        </div>

        <button
          type="button"
          onClick={() => setMonth(m => addMonths(m, 1))}
          aria-label="Next month"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* Event list */}
      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
        {grouped.length === 0 ? (
          <div className="px-4 py-8">
            <MobileEmptyState
              icon={<CalendarDays className="h-10 w-10" />}
              title={`No events in ${format(month, 'MMMM')}`}
              description="Tap the button below to add an event."
              action={
                <Button onClick={() => onAddEvent(new Date())} className="h-11 rounded-xl gap-2">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add Event
                </Button>
              }
            />
          </div>
        ) : (
          <div className="space-y-4 px-4 py-4">
            {grouped.map(({ dayLabel, date, events: dayEvents }) => (
              <div key={dayLabel}>
                <p className={cn(
                  'mb-2 text-xs font-semibold uppercase tracking-wide',
                  isToday(date) ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {dayLabel}
                </p>
                <div className="space-y-2">
                  {dayEvents.map(ev => {
                    const cal = calMap[ev.calendar_id];
                    const start = new Date(ev.start_date);
                    const end = new Date(ev.end_date);
                    return (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => onSelectEvent(ev)}
                        className="w-full text-left rounded-2xl border bg-card p-4 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 active:scale-[0.98] transition-transform"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="mt-0.5 h-3 w-3 shrink-0 rounded-full"
                            style={{ backgroundColor: cal?.color ?? '#3B82F6' }}
                            aria-hidden="true"
                          />
                          <div className="min-w-0 flex-1">
                            <p className={cn(
                              'font-medium text-sm truncate',
                              ev.status === 'tentative' && 'text-muted-foreground',
                            )}>
                              {ev.status === 'tentative' ? `(Tentative) ${ev.title}` : ev.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {eventDateLabel(start, end, ev.is_all_day)}
                            </p>
                            {cal && <p className="text-xs text-muted-foreground truncate mt-0.5">{cal.name}</p>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB for adding events */}
      {grouped.length > 0 && (
        <div
          className="shrink-0 border-t bg-background/95 px-4 py-3 backdrop-blur"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          <Button onClick={() => onAddEvent(new Date())} className="w-full h-11 rounded-xl gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Event
          </Button>
        </div>
      )}
    </div>
  );
}
