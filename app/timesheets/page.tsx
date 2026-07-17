'use client';

import { useEffect, useState } from 'react';
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
import { CompactTimesheetListItem } from '@/components/timesheets/compact-timesheet-list-item';
import { AddTimesheetDialog } from '@/components/timesheets/add-timesheet-dialog';
import { TimesheetDetailPanel } from '@/components/timesheets/timesheet-detail-panel';
import type { Timesheet } from '@/lib/timesheets/types';

export default function TimesheetsPage() {
  const t = useTranslations('timesheets');
  const tCommon = useTranslations('common');
  const isMobile = useIsMobile();
  const { canCreate } = usePermissions();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);

  const timesheets = useTimesheetsStore(s => s.timesheets);
  const isLoading = useTimesheetsStore(s => s.isLoading);
  const loadTimesheets = useTimesheetsStore(s => s.loadTimesheets);
  const selectTimesheet = useTimesheetsStore(s => s.selectTimesheet);
  const selectedTimesheetId = selectedTimesheet?.id ?? null;

  useEffect(() => { loadTimesheets(); }, [loadTimesheets]);

  const filtered = timesheets.filter(ts => {
    const q = searchQuery.toLowerCase();
    return (
      ts.person_name.toLowerCase().includes(q) ||
      ts.position_title.toLowerCase().includes(q) ||
      ts.week_start.includes(q)
    );
  });

  function handleSelect(ts: Timesheet) {
    const next = selectedTimesheet?.id === ts.id ? null : ts;
    setSelectedTimesheet(next);
    selectTimesheet(next);
  }

  function handleCreated(ts: Timesheet) {
    setSelectedTimesheet(ts);
    selectTimesheet(ts);
  }

  function handleClose() {
    setSelectedTimesheet(null);
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
              filtered.map(ts => (
                <CompactTimesheetListItem
                  key={ts.id}
                  timesheet={ts}
                  onSelect={handleSelect}
                  isSelected={selectedTimesheetId === ts.id}
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
