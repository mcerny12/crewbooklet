'use client';

import { useTranslations } from 'next-intl';
import { formatEuroCents } from '@/lib/timesheets/week-result';
import { CompactTimesheetListItem } from './compact-timesheet-list-item';
import type { Timesheet } from '@/lib/timesheets/types';

interface Props {
  /** Project name, or null for the "unassigned" bucket. */
  projectName: string | null;
  timesheets: Timesheet[];
  /** Sum of this cluster's computable weekly totals; null when none are computable yet. */
  totalPayCents: number | null;
  payByTimesheetId: Record<string, number | null>;
  selectedTimesheetId: string | null;
  onSelect: (t: Timesheet) => void;
}

export function TimesheetProjectCluster({
  projectName,
  timesheets,
  totalPayCents,
  payByTimesheetId,
  selectedTimesheetId,
  onSelect,
}: Props) {
  const t = useTranslations('timesheets');

  return (
    <div>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-muted/60 px-5 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-foreground truncate">
          {projectName ?? t('unassignedProject')}
        </span>
        {totalPayCents != null && (
          <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
            {t('estimate.totalLabel')}: {formatEuroCents(totalPayCents)}
          </span>
        )}
      </div>
      {timesheets.map(ts => (
        <CompactTimesheetListItem
          key={ts.id}
          timesheet={ts}
          onSelect={onSelect}
          isSelected={selectedTimesheetId === ts.id}
          payCents={payByTimesheetId[ts.id] ?? null}
        />
      ))}
    </div>
  );
}
