import * as React from 'react';
import { cn } from '@/lib/utils';

interface FormSectionProps {
  title: string;
  /** Optional description below the title */
  description?: string;
  children: React.ReactNode;
  className?: string;
  /** Slot for optional header action (e.g. a toggle checkbox) */
  headerAction?: React.ReactNode;
}

export function FormSection({
  title,
  description,
  children,
  className,
  headerAction,
}: FormSectionProps) {
  return (
    <div className={cn('section-card', className)}>
      <div className="section-card-header flex items-center justify-between">
        <div>
          <div>{title}</div>
          {description && (
            <div className="mt-0.5 text-[10px] font-normal normal-case tracking-normal text-muted-foreground/70">
              {description}
            </div>
          )}
        </div>
        {headerAction}
      </div>
      <div className="section-card-body space-y-2 detail-form-fields">
        {children}
      </div>
    </div>
  );
}
