'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Search } from 'lucide-react';
import { MainLayout } from '@/components/layout/main-layout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MobilePageHeader } from '@/components/layout/mobile-page-header';
import { MobileDesktopOnlyPlaceholder } from '@/components/mobile/mobile-desktop-only-placeholder';
import { useIsMobile } from '@/lib/hooks/use-media-query';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { useTimesheetsStore } from '@/lib/stores/timesheets-store';
import { useProjectsStore } from '@/lib/stores/projects-store';
import { TimesheetProjectCluster } from '@/components/timesheets/timesheet-project-cluster';
import { AddTimesheetDialog } from '@/components/timesheets/add-timesheet-dialog';
import { TimesheetDetailPanel } from '@/components/timesheets/timesheet-detail-panel';
import { computeTimesheetWeekResult } from '@/lib/timesheets/week-result';
import type { Timesheet } from '@/lib/timesheets/types';

const UNASSIGNED_KEY = '__unassigned__';

interface TimesheetCluster {
  projectId: string | null;
  projectName: string | null;
  timesheets: Timesheet[];
  totalPayCents: number | null;
  mostRecentWeek: string;
}

export default function TimesheetsPage() {
  const t = useTranslations('timesheets');
  const tCommon = useTranslations('common');
  const isMobile = useIsMobile();
  const { canCreate } = usePermissions();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const timesheets = useTimesheetsStore(s => s.timesheets);
  const isLoading = useTimesheetsStore(s => s.isLoading);
  const loadTimesheets = useTimesheetsStore(s => s.loadTimesheets);
  const selectTimesheet = useTimesheetsStore(s => s.selectTimesheet);
  const entriesByTimesheetId = useTimesheetsStore(s => s.entriesByTimesheetId);
  const loadAllEntriesForTimesheets = useTimesheetsStore(s => s.loadAllEntriesForTimesheets);
  // Derive the displayed timesheet directly from the store so updates via updateTimesheet
  // (e.g. checkbox toggles) propagate to the detail panel without needing a separate local
  // state copy that would go stale. (Bug #4)
  const selectedTimesheet: Timesheet | null = useTimesheetsStore(s => s.selectedTimesheet);

  const projects = useProjectsStore(s => s.projects);
  const fetchProjects = useProjectsStore(s => s.fetchProjects);

  useEffect(() => { loadTimesheets(); }, [loadTimesheets]);
  useEffect(() => { if (projects.length === 0) fetchProjects(); }, [projects.length, fetchProjects]);

  // Batch-load entries for the "pay at a glance" totals whenever the list view is showing
  // (not while the detail panel is open, and not on every unrelated timesheets[] update).
  useEffect(() => {
    if (!selectedTimesheet && timesheets.length > 0) {
      loadAllEntriesForTimesheets(timesheets.map(t => t.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTimesheet, timesheets, loadAllEntriesForTimesheets]);

  // Extract id before the JSX ternary so TypeScript doesn't narrow selectedTimesheet to null
  // inside the else-branch and then try to access .id on never.
  const selectedTimesheetId = selectedTimesheet?.id ?? null;

  const filtered = timesheets.filter(ts => {
    const q = searchQuery.toLowerCase();
    return (
      ts.person_name.toLowerCase().includes(q) ||
      ts.position_title.toLowerCase().includes(q) ||
      ts.week_start.includes(q)
    );
  });

  // Per-timesheet weekly pay total, computed from the batch-loaded entries.
  const payByTimesheetId = useMemo(() => {
    const map: Record<string, number | null> = {};
    for (const ts of timesheets) {
      const computed = computeTimesheetWeekResult(ts, entriesByTimesheetId[ts.id] ?? []);
      map[ts.id] = computed ? computed.result.totalGrossCents : null;
    }
    return map;
  }, [timesheets, entriesByTimesheetId]);

  // Cluster by project (timesheets already arrive sorted newest-week-first from the
  // store, so each cluster's sub-list stays in that order without re-sorting).
  const clusters = useMemo((): TimesheetCluster[] => {
    const groups = new Map<string, Timesheet[]>();
    for (const ts of filtered) {
      const key = ts.project_id ?? UNASSIGNED_KEY;
      const group = groups.get(key);
      if (group) group.push(ts);
      else groups.set(key, [ts]);
    }

    const result: TimesheetCluster[] = [];
    for (const [key, group] of groups) {
      const projectId = key === UNASSIGNED_KEY ? null : key;
      const project = projectId ? projects.find(p => p.id === projectId) : undefined;
      const payCentsList = group.map(ts => payByTimesheetId[ts.id]);
      const hasAnyPay = payCentsList.some(p => p != null);
      result.push({
        projectId,
        projectName: project?.name ?? null,
        timesheets: group,
        totalPayCents: hasAnyPay ? payCentsList.reduce<number>((sum, p) => sum + (p ?? 0), 0) : null,
        mostRecentWeek: group[0]?.week_start ?? '',
      });
    }

    // Unassigned cluster always last; otherwise most-recently-active project first.
    result.sort((a, b) => {
      if (a.projectId === null) return 1;
      if (b.projectId === null) return -1;
      return b.mostRecentWeek.localeCompare(a.mostRecentWeek);
    });
    return result;
  }, [filtered, projects, payByTimesheetId]);

  function handleSelect(ts: Timesheet) {
    const next = selectedTimesheet?.id === ts.id ? null : ts;
    selectTimesheet(next);
  }

  function handleCreated(ts: Timesheet) {
    selectTimesheet(ts);
  }

  function handleClose() {
    selectTimesheet(null);
  }

  if (isMobile) {
    return (
      <MainLayout>
        <MobilePageHeader title={t('title')} />
        <MobileDesktopOnlyPlaceholder
          title={t('title')}
          description={t('noTimesheetsHint')}
          actionHref="/"
          actionLabel={tCommon('back')}
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex h-full flex-col">
        <PageHeader
          title={t('title')}
          subtitle={timesheets.length > 0 ? `${timesheets.length}` : undefined}
          search={
            !selectedTimesheet ? (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  placeholder={tCommon('searchPlaceholder')}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                  aria-label={t('title')}
                />
              </div>
            ) : undefined
          }
          actions={
            canCreate ? (
              <Button onClick={() => setIsAddDialogOpen(true)} size="sm" className="h-9 gap-1.5">
                <Plus className="h-4 w-4" aria-hidden />
                {t('newTimesheet')}
              </Button>
            ) : undefined
          }
        />

        {selectedTimesheet ? (
          <div className="flex-1 overflow-hidden">
            <TimesheetDetailPanel
              timesheet={selectedTimesheet}
              onClose={handleClose}
              onDeleted={handleClose}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto min-h-0">
            {isLoading ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                {tCommon('loading')}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center gap-3">
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? tCommon('searchPlaceholder') : t('noTimesheets')}
                </p>
                {!searchQuery && canCreate && (
                  <Button variant="outline" size="sm" onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                    {t('addTimesheet')}
                  </Button>
                )}
              </div>
            ) : (
              clusters.map(cluster => (
                <TimesheetProjectCluster
                  key={cluster.projectId ?? UNASSIGNED_KEY}
                  projectName={cluster.projectName}
                  timesheets={cluster.timesheets}
                  totalPayCents={cluster.totalPayCents}
                  payByTimesheetId={payByTimesheetId}
                  selectedTimesheetId={selectedTimesheetId}
                  onSelect={handleSelect}
                />
              ))
            )}
          </div>
        )}
      </div>

      <AddTimesheetDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onCreated={handleCreated}
      />
    </MainLayout>
  );
}
