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
    <div className={cn('grid gap-1.5', className)}>
      <Label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
      {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export const mobileInputCn = 'h-11 text-base rounded-xl';
export const mobileTextareaCn = 'min-h-24 text-base rounded-xl resize-y';
export const mobileSelectCn = 'h-11 text-base rounded-xl';
