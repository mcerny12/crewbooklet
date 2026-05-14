'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { MobilePageHeader } from '@/components/layout/mobile-page-header';
import { CalendarMain } from '@/components/calendar/calendar-main';

export default function CalendarPage() {
  return (
    <MainLayout>
      <div className="h-full flex flex-col overflow-hidden">
        <MobilePageHeader title="Calendar" />
        <div className="flex-1 min-h-0 overflow-hidden">
          <CalendarMain />
        </div>
      </div>
    </MainLayout>
  );
}
