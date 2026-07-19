/**
 * Timesheet PDF export.
 * GET /api/timesheets/[id]/pdf — returns the printable Stundenzettel PDF,
 * built by overlaying dynamic values onto the original template (see
 * lib/timesheets/print/). Requires an authenticated session; RLS on
 * `timesheets` / `timesheet_entries` / `projects` governs access same as
 * everywhere else in the app.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { generateTimesheetPdf } from '@/lib/timesheets/print/generate-pdf';
import type { Timesheet, TimesheetEntry } from '@/lib/timesheets/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { supabase, responseHeaders } = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: responseHeaders });
  }

  const { data: timesheet, error: tsError } = await supabase
    .from('timesheets')
    .select('*')
    .eq('id', id)
    .single();

  if (tsError || !timesheet) {
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers: responseHeaders });
  }

  const { data: entries } = await supabase
    .from('timesheet_entries')
    .select('*')
    .eq('timesheet_id', id)
    .order('entry_date');

  let projectName: string | null = null;
  if (timesheet.project_id) {
    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', timesheet.project_id)
      .single();
    projectName = project?.name ?? null;
  }

  const pdfBytes = await generateTimesheetPdf({
    timesheet: timesheet as Timesheet,
    entries: (entries ?? []) as TimesheetEntry[],
    projectName,
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      ...Object.fromEntries(responseHeaders),
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="stundenzettel-${timesheet.week_start}.pdf"`,
    },
  });
}
