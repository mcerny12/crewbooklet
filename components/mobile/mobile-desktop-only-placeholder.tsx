'use client';

import * as React from 'react';
import Link from 'next/link';
import { Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type MobileDesktopOnlyPlaceholderProps = {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
};

export function MobileDesktopOnlyPlaceholder({
  title,
  description,
  actionHref = '/',
  actionLabel = 'Go to Dashboard',
  className,
}: MobileDesktopOnlyPlaceholderProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 px-8 py-16 text-center', className)}>
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <Monitor className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      </div>
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <Button asChild size="lg" className="mt-2 rounded-xl h-12 px-6">
        <Link href={actionHref}>{actionLabel}</Link>
      </Button>
    </div>
  );
}
