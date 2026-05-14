'use client';

import * as React from 'react';
import { MobileAppHeader } from './mobile-app-header';

type MobileEntityDetailLayoutProps = {
  title: string;
  subtitle?: string;
  onBack: () => void;
  rightAction?: React.ReactNode;
  summary?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function MobileEntityDetailLayout({
  title,
  subtitle,
  onBack,
  rightAction,
  summary,
  children,
  footer,
}: MobileEntityDetailLayoutProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background lg:hidden">
      <MobileAppHeader
        mode="back"
        title={title}
        subtitle={subtitle}
        onBack={onBack}
        rightAction={rightAction}
      />

      {summary ? (
        <div className="shrink-0 border-b bg-muted/30 px-4 py-3">
          {summary}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-hidden">
        {children}
      </div>

      {footer ? (
        <footer
          className="shrink-0 border-t bg-background/95 px-4 py-3 backdrop-blur"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          {footer}
        </footer>
      ) : null}
    </div>
  );
}
