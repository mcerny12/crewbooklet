import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { ProjectCalendar, CalendarEvent } from '@/lib/types/models';

// Server-side client — bypasses RLS so the public share_token endpoint works
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function icsDateOnly(d: Date): string {
  return d.toISOString().split('T')[0].replace(/-/g, '');
}

function icsEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function buildICS(calendar: ProjectCalendar, events: CalendarEvent[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CrewBooklet//CrewBooklet//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsEscape(calendar.name)}`,
    'X-WR-TIMEZONE:UTC',
  ];

  const now = icsDate(new Date());

  for (const ev of events) {
    const start = new Date(ev.start_date);
    const end   = new Date(ev.end_date);
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ev.id}@crewbooklet`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`LAST-MODIFIED:${now}`);
    if (ev.is_all_day) {
      lines.push(`DTSTART;VALUE=DATE:${icsDateOnly(start)}`);
      lines.push(`DTEND;VALUE=DATE:${icsDateOnly(end)}`);
    } else {
      lines.push(`DTSTART:${icsDate(start)}`);
      lines.push(`DTEND:${icsDate(end)}`);
    }
    lines.push(`SUMMARY:${icsEscape(ev.title)}`);
    if (ev.location) lines.push(`LOCATION:${icsEscape(ev.location)}`);
    if (ev.notes)    lines.push(`DESCRIPTION:${icsEscape(ev.notes)}`);
    const statusMap: Record<string, string> = { tentative: 'TENTATIVE', confirmed: 'CONFIRMED', cancelled: 'CANCELLED' };
    lines.push(`STATUS:${statusMap[ev.status] ?? 'CONFIRMED'}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = getAdminClient();

  const { data: calendar, error } = await supabase
    .from('project_calendars')
    .select('*')
    .eq('share_token', token)
    .single();

  if (error || !calendar) {
    return new NextResponse('Calendar not found', { status: 404 });
  }

  const { data: events } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('calendar_id', calendar.id)
    .order('start_date', { ascending: true });

  const ics = buildICS(calendar as ProjectCalendar, (events ?? []) as CalendarEvent[]);

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(calendar.name)}.ics"`,
      'Cache-Control': 'no-cache',
    },
  });
}
