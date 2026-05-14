'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
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
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const content = (
    <div className="fixed inset-0 z-200 flex flex-col overflow-hidden bg-background lg:hidden">
      <MobileAppHeader
        mode="back"
        title={title}
        subtitle={subtitle}
        onBack={onBack}
        rightAction={rightAction}
        className="shrink-0"
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

  if (!mounted) return null;
  return createPortal(content, document.body);
}
