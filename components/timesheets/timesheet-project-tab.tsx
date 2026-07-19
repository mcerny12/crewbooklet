'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { format, parseISO, endOfWeek } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { Clock, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTimesheetsStore } from '@/lib/stores/timesheets-store';
import { cn } from '@/lib/utils';
import type { Timesheet } from '@/lib/timesheets/types';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  submitted: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
};

function weekRange(weekStart: string, dateLocale: typeof de): string {
  try {
    const monday = parseISO(weekStart);
    const sunday = endOfWeek(monday, { weekStartsOn: 1 });
    return `${format(monday, 'd. MMM', { locale: dateLocale })} – ${format(sunday, 'd. MMM', { locale: dateLocale })}`;
  } catch {
    return weekStart;
  }
}

interface Props {
  projectId: string;
}

export function TimesheetProjectTab({ projectId }: Props) {
  const t = useTranslations('timesheets');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const dateLocale = locale === 'de' ? de : enUS;
  const loadTimesheetsByProject = useTimesheetsStore(s => s.loadTimesheetsByProject);
  const [sheets, setSheets] = useState<Timesheet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadTimesheetsByProject(projectId).then(result => {
      if (!cancelled) {
        setSheets(result);
        setIsLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [projectId, loadTimesheetsByProject]);

  if (isLoading) {
    return (
      <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
        {tCommon('loading')}
      </div>
    );
  }

  if (sheets.length === 0) {
    return (
      <div className="flex h-32 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-8 w-8 opacity-20" />
        <p>{t('projectTab.noTimesheets')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {sheets.map(ts => (
        <div
          key={ts.id}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-muted/30 transition-colors"
        >
          {/* Week info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{weekRange(ts.week_start, dateLocale)}</span>
              <span className={cn(
                'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                STATUS_COLORS[ts.status],
              )}>
                {t(`status.${ts.status}`)}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {ts.person_name || '—'}
              {ts.position_title ? ` · ${ts.position_title}` : ''}
            </div>
          </div>

          {/* Print button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => window.open(`/timesheets/${ts.id}/print`, '_blank')}
            title={t('exportPdf')}
          >
            <Printer className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}
