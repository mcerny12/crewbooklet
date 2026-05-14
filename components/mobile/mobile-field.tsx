'use client';

import * as React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type MobileFieldProps = {
  label: string;
  children: React.ReactNode;
  helper?: string;
  error?: string;
  className?: string;
  htmlFor?: string;
};

export function MobileField({ label, children, helper, error, className, htmlFor }: MobileFieldProps) {
  return (
    <div className={cn('grid gap-1', className)}>
      <Label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
      {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export const mobileInputCn = 'h-9 min-h-9 rounded-lg px-2.5 text-sm';
export const mobileTextareaCn = 'min-h-20 rounded-lg px-2.5 py-2 text-sm leading-snug resize-y';
export const mobileSelectCn = 'h-9 min-h-9 rounded-lg px-2.5 text-sm';
