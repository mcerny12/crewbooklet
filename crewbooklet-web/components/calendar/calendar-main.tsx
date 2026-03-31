'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Views, type View, type SlotInfo } from 'react-big-calendar';
import { Printer } from 'lucide-react';
import withDragAndDrop, { type EventInteractionArgs } from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

import { useCalendarStore } from '@/lib/stores/calendar-store';
import { useProjectsStore } from '@/lib/stores/projects-store';
import { CalendarSidebar } from './calendar-sidebar';
import { EventDialog } from './event-dialog';
import { PrintDialog } from './print-dialog';
import type { CalendarEvent, ProjectCalendar } from '@/lib/types/models';

const DnDCalendar = withDragAndDrop(Calendar);

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (d: Date) => startOfWeek(d, { weekStartsOn: 1 }),
  getDay,
  locales: { 'en-US': enUS },
});

interface RBCEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  color: string;
  calEvent: CalendarEvent;
}

export function CalendarMain() {
  const { calendars, events, isLoading, error, fetchAll, createCalendar, updateCalendar, deleteCalendar, createEvent, updateEvent, deleteEvent } = useCalendarStore();
  const { projects, fetchProjects } = useProjectsStore();

  const [view, setView]               = useState<View>(Views.WEEK);
  const [date, setDate]               = useState(new Date());
  const [dialogOpen, setDialogOpen]   = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [pendingSlot, setPendingSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [shareMsg, setShareMsg]       = useState<string | null>(null);
  const [printOpen, setPrintOpen]     = useState(false);

  useEffect(() => {
    fetchAll();
    if (projects.length === 0) fetchProjects();
  }, []);

  // Visible calendars
  const visibleCalendarIds = useMemo(
    () => new Set(calendars.filter(c => c.is_visible).map(c => c.id)),
    [calendars]
  );

  // Map calendar ID → color
  const calColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    calendars.forEach(c => { map[c.id] = c.color; });
    return map;
  }, [calendars]);

  // Convert our events to react-big-calendar format
  const rbcEvents: RBCEvent[] = useMemo(() =>
    events
      .filter(e => visibleCalendarIds.has(e.calendar_id))
      .map(e => ({
        id: e.id,
        title: e.status === 'tentative' ? `(?) ${e.title}` : e.status === 'cancelled' ? `✕ ${e.title}` : e.title,
        start: new Date(e.start_date),
        end:   new Date(e.end_date),
        allDay: e.is_all_day,
        color:  calColorMap[e.calendar_id] ?? '#3B82F6',
        calEvent: e,
      })),
    [events, visibleCalendarIds, calColorMap]
  );

  // Calendars enriched with project name for the dialog dropdown
  const enrichedCalendars = useMemo(() =>
    calendars.map(c => ({
      ...c,
      projectName: projects.find(p => p.id === c.project_id)?.name ?? 'Unknown',
    })),
    [calendars, projects]
  );

  const handleSelectSlot = useCallback((slot: SlotInfo) => {
    setPendingSlot({ start: slot.start as Date, end: slot.end as Date });
    setEditingEvent(null);
    setDialogOpen(true);
  }, []);

  const handleSelectEvent = useCallback((event: object) => {
    const e = event as RBCEvent;
    setEditingEvent(e.calEvent);
    setPendingSlot(null);
    setDialogOpen(true);
  }, []);

  const handleEventDrop = useCallback(({ event, start, end }: EventInteractionArgs<object>) => {
    const e = event as RBCEvent;
    updateEvent(e.id, {
      start_date: (start as Date).toISOString(),
      end_date:   (end   as Date).toISOString(),
    });
  }, [updateEvent]);

  const handleEventResize = useCallback(({ event, start, end }: EventInteractionArgs<object>) => {
    const e = event as RBCEvent;
    updateEvent(e.id, {
      start_date: (start as Date).toISOString(),
      end_date:   (end   as Date).toISOString(),
    });
  }, [updateEvent]);

  const eventPropGetter = useCallback((event: object) => {
    const e = event as RBCEvent;
    return {
      style: {
        backgroundColor: e.color,
        border: 'none',
        borderRadius: '3px',
        color: '#fff',
        fontSize: '11px',
        opacity: e.calEvent.status === 'cancelled' ? 0.5 : 1,
      },
    };
  }, []);

  const handleShareCalendar = (cal: ProjectCalendar) => {
    const url = `${window.location.origin}/api/calendar/${cal.share_token}`;
    navigator.clipboard.writeText(url).then(() => {
      setShareMsg(`ICS link copied for "${cal.name}"`);
      setTimeout(() => setShareMsg(null), 3000);
    });
  };

  if (isLoading) {
    return <div className="flex h-full items-center justify-center text-gray-400 text-sm">Loading calendars…</div>;
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center flex-col gap-2">
        <p className="text-sm text-red-600 font-medium">Failed to load calendar data</p>
        <p className="text-xs text-gray-500 max-w-md text-center">{error}</p>
        <button onClick={() => fetchAll()} className="text-xs text-blue-600 underline mt-1">Retry</button>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden relative">
      <CalendarSidebar
        projects={projects}
        calendars={calendars}
        onToggleVisibility={(id, v) => updateCalendar(id, { is_visible: v })}
        onAddCalendar={async (projectId, name, color) => {
          const sortOrder = calendars.filter(c => c.project_id === projectId).length;
          await createCalendar(projectId, name, color, sortOrder);
        }}
        onDeleteCalendar={deleteCalendar}
        onShareCalendar={handleShareCalendar}
      />

      <div className="flex-1 overflow-hidden flex flex-col p-3 gap-2">
        <div className="flex justify-end shrink-0">
          <button
            type="button"
            onClick={() => setPrintOpen(true)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border rounded px-2.5 py-1 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Printer className="h-3.5 w-3.5" />Print
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
        <style>{`
          .rbc-calendar { font-family: inherit; font-size: 12px; }
          .rbc-toolbar { margin-bottom: 8px; }
          .rbc-toolbar button { font-size: 11px; padding: 3px 10px; border-radius: 4px; }
          .rbc-toolbar button.rbc-active { background: #111827; color: #fff; border-color: #111827; }
          .rbc-header { font-size: 11px; font-weight: 600; padding: 4px 0; }
          .rbc-time-slot { font-size: 10px; }
          .rbc-event { padding: 1px 4px !important; }
          .rbc-event-label { font-size: 10px !important; }
          .rbc-show-more { font-size: 10px; color: #6b7280; }
          .rbc-today { background: rgba(59,130,246,0.04); }
          .rbc-current-time-indicator { background: #EF4444; }
          .rbc-slot-selection { background: rgba(59,130,246,0.15); border: 1px solid #3B82F6; }
        `}</style>

        <DnDCalendar
          localizer={localizer}
          events={rbcEvents}
          view={view}
          date={date}
          onView={setView}
          onNavigate={setDate}
          views={[Views.MONTH, Views.WEEK, Views.DAY]}
          defaultView={Views.WEEK}
          selectable
          resizable
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
          eventPropGetter={eventPropGetter}
          step={30}
          timeslots={2}
          style={{ height: '100%' }}
          popup
        />
        </div>
      </div>

      <EventDialog
        open={dialogOpen}
        event={editingEvent}
        initialSlot={pendingSlot}
        defaultCalendarId={enrichedCalendars[0]?.id ?? null}
        calendars={enrichedCalendars}
        onClose={() => setDialogOpen(false)}
        onSave={async (data) => { await createEvent(data); }}
        onUpdate={updateEvent}
        onDelete={deleteEvent}
      />

      <PrintDialog
        open={printOpen}
        calendars={enrichedCalendars}
        projects={projects}
        currentDate={date}
        onClose={() => setPrintOpen(false)}
      />

      {/* Share toast */}
      {shareMsg && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-4 py-2 rounded-lg shadow-lg z-50">
          {shareMsg}
        </div>
      )}
    </div>
  );
}
