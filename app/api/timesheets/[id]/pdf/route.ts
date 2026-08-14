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
import { generateTimesheetPdf, getTimesheetTemplate } from '@/lib/timesheets/print/generate-pdf';
import { isTimesheetTemplateId } from '@/lib/timesheets/print/templates';
import { resolveTimesheetTemplate } from '@/lib/timesheets/types';
import type { Timesheet, TimesheetEntry, TimesheetTemplateId } from '@/lib/timesheets/types';

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

  // The printed form belongs to the client, not the individual sheet: the
  // project's client organization sets it and a single project may override.
  // Every timesheet under that project therefore exports the same way with no
  // per-sheet selection.
  let projectName: string | null = null;
  let projectTemplate: TimesheetTemplateId | null = null;
  let orgTemplate: TimesheetTemplateId | null = null;

  if (timesheet.project_id) {
    const { data: project } = await supabase
      .from('projects')
      .select('name, timesheet_template, client_organization_id')
      .eq('id', timesheet.project_id)
      .single();

    projectName = project?.name ?? null;
    if (isTimesheetTemplateId(project?.timesheet_template)) {
      projectTemplate = project.timesheet_template;
    }

    if (project?.client_organization_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('timesheet_template')
        .eq('id', project.client_organization_id)
        .single();
      if (isTimesheetTemplateId(org?.timesheet_template)) {
        orgTemplate = org.timesheet_template;
      }
    }
  }

  const template = resolveTimesheetTemplate(projectTemplate, orgTemplate);

  const form = getTimesheetTemplate(template);
  const pdfBytes = await generateTimesheetPdf({
    timesheet: timesheet as Timesheet,
    entries: (entries ?? []) as TimesheetEntry[],
    projectName,
    template,
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      ...Object.fromEntries(responseHeaders),
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${form.fileStem}-${timesheet.week_start}.pdf"`,
    },
  });
}
