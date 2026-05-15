'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { MobileAppHeader } from './mobile-app-header';

type MobileEntityDetailLayoutProps = {
  title: string;
  titleNode?: React.ReactNode;
  subtitle?: string;
  onBack: () => void;
  rightAction?: React.ReactNode;
  summary?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
} & { [key: `data-cb-${string}`]: string | undefined };

export function MobileEntityDetailLayout({
  title,
  titleNode,
  subtitle,
  onBack,
  rightAction,
  summary,
  children,
  footer,
  ...rest
}: MobileEntityDetailLayoutProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const content = (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-background lg:hidden" {...rest}>
      <MobileAppHeader
        mode="back"
        title={title}
        titleNode={titleNode}
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
