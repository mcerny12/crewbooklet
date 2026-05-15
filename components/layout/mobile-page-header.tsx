'use client';

import * as React from 'react';
import { MobileAppHeader } from '@/components/mobile/mobile-app-header';
import { useSidebar } from './sidebar-context';

type MobilePageHeaderProps = {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
};

export function MobilePageHeader({ title, subtitle, rightAction }: MobilePageHeaderProps) {
  const { setMobileOpen } = useSidebar();
  return (
    <MobileAppHeader
      data-cb-component="MobilePageHeader"
      title={title}
      subtitle={subtitle}
      mode="menu"
      onMenu={() => setMobileOpen(true)}
      rightAction={rightAction}
    />
  );
}
