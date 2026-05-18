'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type DetailSlideProps = {
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
};

/**
 * A single page inside the desktop detail snap canvas. Each slide takes the
 * full visible width of the canvas and holds one or two `DetailFrame`s laid
 * out side by side (each `flex-1`). Snap-start sits on the slide, not on the
 * individual frames, so horizontal navigation moves page by page.
 *
 *   <DesktopDetailSnapCanvas ariaLabel="...">
 *     <DetailSlide>
 *       <DetailFrame className="flex-1" title="Basic Information">...</DetailFrame>
 *       <DetailFrame className="flex-1" title="Schedule">...</DetailFrame>
 *     </DetailSlide>
 *
 *     <DetailSlide>
 *       <DetailFrame className="flex-1" title="Crew">...</DetailFrame>
 *     </DetailSlide>
 *   </DesktopDetailSnapCanvas>
 */
export function DetailSlide({ children, className, ariaLabel }: DetailSlideProps) {
  return (
    <section
      aria-label={ariaLabel}
      className={cn('flex w-full h-full shrink-0 snap-start items-stretch gap-3', className)}
    >
      {children}
    </section>
  );
}
