'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import type { CalendarEvent, ProjectCalendar } from '@/lib/types/models';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, parseISO, format,
} from 'date-fns';

// ── helpers ──────────────────────────────────────────────────────────────────

function buildGrid(year: number, month: number): Date[][] {
  const first = new Date(year, month - 1, 1);
  const last  = new Date(year, month, 0);
  const start = startOfWeek(first, { weekStartsOn: 1 });
  const end   = endOfWeek(last,    { weekStartsOn: 1 });
  const days  = eachDayOfInterval({ start, end });
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

function eventsForDay(day: Date, events: CalendarEvent[]): CalendarEvent[] {
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const dayEnd   = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);
  return events.filter(ev => {
    const s = parseISO(ev.start_date);
    const e = parseISO(ev.end_date);
    return s <= dayEnd && e >= dayStart;
  });
}

// ── content ──────────────────────────────────────────────────────────────────

function PrintContent() {
  const params     = useSearchParams();
  const monthParam = params.get('month') ?? format(new Date(), 'yyyy-MM');
  const calIds     = (params.get('calendars') ?? '').split(',').filter(Boolean);
  // title param kept for override; otherwise auto-filled from projects below
  const titleParam = params.get('title') ?? '';

  const [calendars,    setCalendars]    = useState<ProjectCalendar[]>([]);
  const [events,       setEvents]       = useState<CalendarEvent[]>([]);
  const [projectNames, setProjectNames] = useState<string[]>([]);
  const [loading,      setLoading]      = useState(true);

  const [year, month] = monthParam.split('-').map(Number);

  useEffect(() => {
    if (!calIds.length) { setLoading(false); return; }
    (async () => {
      const { data: cals } = await supabase
        .from('project_calendars')
        .select('*')
        .in('id', calIds);

      const projectIds = [...new Set((cals ?? []).map((c: ProjectCalendar) => c.project_id))];
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name')
        .in('id', projectIds);

      const monthStart = startOfMonth(new Date(year, month - 1)).toISOString();
      const monthEnd   = endOfMonth(  new Date(year, month - 1)).toISOString();

      const { data: evs } = await supabase
        .from('calendar_events')
        .select('*')
        .in('calendar_id', calIds)
        .lte('start_date', monthEnd)
        .gte('end_date',   monthStart)
        .order('start_date', { ascending: true });

      setCalendars((cals ?? []) as ProjectCalendar[]);
      setProjectNames((projects ?? []).map((p: { name: string }) => p.name));
      setEvents((evs ?? []) as CalendarEvent[]);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => window.print(), 500);
      return () => clearTimeout(t);
    }
  }, [loading]);

  if (loading) return <div style={{ padding: 40, fontFamily: 'sans-serif' }}>Loading…</div>;

  const grid      = buildGrid(year, month);
  const numWeeks  = grid.length; // 5 or 6
  const calMap    = Object.fromEntries(calendars.map(c => [c.id, c]));
  const monthDate = new Date(year, month - 1, 1);
  const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const title = titleParam || projectNames.join(' · ') || format(monthDate, 'MMMM yyyy');

  // Row height calculation: A4 landscape = 277×190mm usable.
  // Header ~14mm, legend ~10mm, day-header row ~8mm, borders ~2mm → ~34mm overhead
  // Remaining: 190 - 34 = 156mm split across numWeeks rows
  const rowHeightMm = Math.floor(156 / numWeeks);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'Montserrat', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          background: #fff;
          color: #111;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          .no-print { display: none !important; }
          body { background: #fff; }
        }

        /* ── PAGE ── */
        .page {
          width: 277mm;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
        }

        /* ── HEADER ── */
        .hdr {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          border-bottom: 0.75pt solid #111;
          padding-bottom: 2.5mm;
          margin-bottom: 3mm;
          flex-shrink: 0;
        }
        .hdr-title  { font-size: 14pt; font-weight: 700; letter-spacing: -0.02em; }
        .hdr-month  { font-size: 9pt;  font-weight: 300; color: #555; }

        /* ── LEGEND ── */
        .legend {
          display: flex;
          flex-wrap: wrap;
          gap: 2mm 5mm;
          margin-bottom: 3mm;
          flex-shrink: 0;
        }
        .legend-item  { display: flex; align-items: center; gap: 1.5mm; font-size: 7.5pt; }
        .legend-swatch { width: 7pt; height: 7pt; border-radius: 1.5pt; flex-shrink: 0; }

        /* ── GRID ── */
        table.grid {
          width: 277mm !important;
          table-layout: fixed;
          border-collapse: collapse;
          flex-shrink: 0;
        }

        col.day-col { width: calc(277mm / 7); }

        thead th {
          font-size: 7.5pt;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #444;
          text-align: left;
          padding: 1.5mm 2mm;
          border-bottom: 0.5pt solid #999;
          border-left: 0.4pt solid #ddd;
          width: calc(277mm / 7);
        }
        thead th:first-child { border-left: none; }

        tbody td {
          vertical-align: top;
          border: 0.4pt solid #ddd;
          border-top: none;
          padding: 1.5mm 2mm;
          height: ${rowHeightMm}mm;
          width: calc(277mm / 7);
          overflow: hidden;
        }
        tbody tr:first-child td { border-top: 0.4pt solid #ddd; }
        tbody td:first-child { border-left: none; }
        tbody td:last-child  { border-right: none; }

        td.other-month { background: #f9f9f9; }
        td.other-month .day-num { color: #ccc; }

        .day-num {
          font-size: 7.5pt;
          font-weight: 600;
          margin-bottom: 1mm;
          display: inline-block;
          line-height: 1;
          color: #111;
        }
        .day-num.today {
          background: #111;
          color: #fff;
          width: 13pt;
          height: 13pt;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 7pt;
        }

        .event-chip {
          display: block;
          font-size: 6.5pt;
          font-weight: 400;
          border-radius: 2pt;
          padding: 0.6mm 1.5mm;
          margin-bottom: 0.7mm;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: #fff;
        }
        .event-chip.tentative { opacity: 0.65; }
        .event-chip.cancelled { opacity: 0.4; text-decoration: line-through; }
        .more { font-size: 5.5pt; color: #aaa; margin-top: 0.5mm; }

        /* ── SCREEN PREVIEW ── */
        @media screen {
          body { background: #ccc; }
          .page {
            background: #fff;
            box-shadow: 0 4px 40px rgba(0,0,0,0.2);
            margin: 20px auto;
            padding: 10mm;
          }
          .print-btn {
            position: fixed; top: 16px; right: 16px;
            padding: 8px 18px;
            background: #111; color: #fff;
            border: none; border-radius: 6px;
            font-size: 13px; cursor: pointer;
            font-family: system-ui, sans-serif;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            z-index: 999;
          }
        }
      `}</style>

      <button className="print-btn no-print" onClick={() => window.print()}>
        Print / Save PDF
      </button>

      <div className="page">

        {/* Header */}
        <div className="hdr">
          <span className="hdr-title">{title}</span>
          <span className="hdr-month">{format(monthDate, 'MMMM yyyy')}</span>
        </div>

        {/* Legend */}
        <div className="legend">
          {calendars.map(cal => (
            <div key={cal.id} className="legend-item">
              <span className="legend-swatch" style={{ background: cal.color }} />
              <span>{cal.name}</span>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <table className="grid">
          <colgroup>
            {DAY_NAMES.map((_, i) => <col key={i} className="day-col" />)}
          </colgroup>
          <thead>
            <tr>
              {DAY_NAMES.map(d => <th key={d}>{d}</th>)}
            </tr>
          </thead>
          <tbody>
            {grid.map((week, wi) => (
              <tr key={wi}>
                {week.map((day, di) => {
                  const inMonth = isSameMonth(day, monthDate);
                  const dayEvs  = eventsForDay(day, events);
                  // How many chips fit: (rowHeight - day-num ~5mm - padding 3mm) / chip ~4mm
                  const maxChips = Math.max(1, Math.floor((rowHeightMm - 8) / 4));
                  const visible  = dayEvs.slice(0, maxChips);
                  const extra    = dayEvs.length - visible.length;
                  return (
                    <td key={di} className={inMonth ? '' : 'other-month'}>
                      <div className={`day-num${isToday(day) ? ' today' : ''}`}>
                        {format(day, 'd')}
                      </div>
                      {visible.map(ev => (
                        <span
                          key={ev.id}
                          className={`event-chip ${ev.status}`}
                          style={{ background: calMap[ev.calendar_id]?.color ?? '#6B7280' }}
                          title={ev.title}
                        >
                          {!ev.is_all_day && (
                            <>{format(parseISO(ev.start_date), 'HH:mm')} </>
                          )}
                          {ev.title}
                        </span>
                      ))}
                      {extra > 0 && <div className="more">+{extra} more</div>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

      </div>
    </>
  );
}

export default function CalendarPrintPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, fontFamily: 'sans-serif' }}>Loading…</div>}>
      <PrintContent />
    </Suspense>
  );
}
