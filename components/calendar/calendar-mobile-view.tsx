'use client';

import { useState, useMemo, useEffect } from 'react';
import { format, isToday, isTomorrow, startOfDay, startOfMonth, isSameMonth, addMonths, subMonths } from 'date-fns';
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
  if (isTomorrow(start)) return isAllDay ? 'Tomorrow' : `Tomorrow · ${format(start, 'HH:mm')}`;
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

  // Show all events (ignore is_visible filter on mobile since there's no sidebar to toggle)
  // Filter out cancelled, show from today onwards
  const today = startOfDay(new Date());
  const upcomingEvents = useMemo(() =>
    events
      .filter(e => e.status !== 'cancelled')
      .filter(e => new Date(e.start_date) >= today)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events]
  );

  // Auto-navigate to the month of the next event if current month has none
  useEffect(() => {
    if (upcomingEvents.length === 0) return;
    const currentMonthHasEvents = upcomingEvents.some(e => isSameMonth(new Date(e.start_date), month));
    if (!currentMonthHasEvents) {
      setMonth(startOfMonth(new Date(upcomingEvents[0].start_date)));
    }
  // Only run when events first load
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upcomingEvents.length]);

  // Events visible in the selected month (for month count)
  const monthEvents = useMemo(() =>
    upcomingEvents.filter(e => isSameMonth(new Date(e.start_date), month)),
    [upcomingEvents, month]
  );

  const grouped = useMemo(() => groupByDay(monthEvents), [monthEvents]);

  // Find whether adjacent months have events (for navigation hints)
  const prevMonth = subMonths(month, 1);
  const nextMonth = addMonths(month, 1);
  const hasPrevEvents = upcomingEvents.some(e => isSameMonth(new Date(e.start_date), prevMonth));
  const hasNextEvents = upcomingEvents.some(e => isSameMonth(new Date(e.start_date), nextMonth));

  return (
    <div className="flex flex-col h-full">
      {/* Month navigation */}
      <div className="shrink-0 flex items-center justify-between border-b bg-card px-4 py-3">
        <button
          type="button"
          onClick={() => setMonth(m => subMonths(m, 1))}
          aria-label="Previous month"
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
            hasPrevEvents ? 'text-foreground hover:bg-muted' : 'text-muted-foreground/40 hover:bg-muted/40'
          )}
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="text-center">
          <p className="text-base font-semibold">{format(month, 'MMMM yyyy')}</p>
          <p className="text-xs text-muted-foreground">
            {monthEvents.length > 0
              ? `${monthEvents.length} event${monthEvents.length !== 1 ? 's' : ''}`
              : upcomingEvents.length > 0 ? 'No events this month' : 'No upcoming events'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setMonth(m => addMonths(m, 1))}
          aria-label="Next month"
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
            hasNextEvents ? 'text-foreground hover:bg-muted' : 'text-muted-foreground/40 hover:bg-muted/40'
          )}
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* Event list */}
      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
        {grouped.length === 0 ? (
          <div className="px-4 py-8">
            {upcomingEvents.length > 0 ? (
              <div className="text-center space-y-3">
                <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No events in {format(month, 'MMMM')}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMonth(startOfMonth(new Date(upcomingEvents[0].start_date)))}
                  className="h-9 rounded-xl"
                >
                  Go to {format(new Date(upcomingEvents[0].start_date), 'MMMM yyyy')}
                </Button>
              </div>
            ) : (
              <MobileEmptyState
                icon={<CalendarDays className="h-10 w-10" />}
                title="No upcoming events"
                description="Tap the button below to add an event."
                action={
                  <Button onClick={() => onAddEvent(new Date())} className="h-11 rounded-xl gap-2">
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add Event
                  </Button>
                }
              />
            )}
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
