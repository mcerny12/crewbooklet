'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { CalendarMain } from '@/components/calendar/calendar-main';

export default function CalendarPage() {
  return (
    <MainLayout>
      <div className="h-full flex flex-col overflow-hidden">
        <CalendarMain />
      </div>
    </MainLayout>
  );
}
