'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

export type MobileSwipeTab = {
  value: string;
  label: string;
  badge?: React.ReactNode;
  content: React.ReactNode;
};

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return !!target.closest(
    "input, textarea, select, button, a, [role='button'], [contenteditable='true'], [data-radix-popper-content-wrapper]"
  );
}

export function MobileSwipeTabs({
  tabs,
  defaultValue,
  value: valueProp,
  onValueChange,
  className,
  contentClassName,
  flushContent = false,
}: {
  tabs: MobileSwipeTab[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  contentClassName?: string;
  flushContent?: boolean;
}) {
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? tabs[0]?.value ?? '');
  const isControlled = valueProp !== undefined;
  const value = isControlled ? valueProp : internalValue;

  const setValue = React.useCallback(
    (v: string) => {
      if (!isControlled) setInternalValue(v);
      onValueChange?.(v);
    },
    [isControlled, onValueChange]
  );

  const startRef = React.useRef<{ x: number; y: number } | null>(null);
  const currentIndex = Math.max(0, tabs.findIndex((tab) => tab.value === value));

  const goToIndex = React.useCallback(
    (index: number) => {
      const next = tabs[Math.min(Math.max(index, 0), tabs.length - 1)];
      if (next) setValue(next.value);
    },
    [tabs, setValue]
  );

  const onPointerDown = (event: React.PointerEvent) => {
    if (isInteractiveTarget(event.target)) return;
    startRef.current = { x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event: React.PointerEvent) => {
    const start = startRef.current;
    startRef.current = null;
    if (!start) return;
    if (isInteractiveTarget(event.target)) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;

    if (Math.abs(dx) < 48) return;
    if (Math.abs(dy) > Math.abs(dx)) return;

    if (dx < 0) goToIndex(currentIndex + 1);
    if (dx > 0) goToIndex(currentIndex - 1);
  };

  return (
    <TabsPrimitive.Root
      value={value}
      onValueChange={setValue}
      className={cn('flex h-full min-h-0 flex-col', className)}
    >
      <TabsPrimitive.List
        aria-label="Detail sections"
        className="shrink-0 grid border-b bg-muted/40 mx-3 my-2 rounded-xl p-0.5"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}
      >
        {tabs.map((tab) => (
          <TabsPrimitive.Trigger
            key={tab.value}
            value={tab.value}
            className={cn(
              'flex h-8 min-w-0 items-center justify-center gap-1 rounded-lg px-1 text-xs font-medium',
              'text-muted-foreground transition-colors',
              'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30'
            )}
          >
            <span className="truncate">{tab.label}</span>
            {tab.badge}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>

      <div
        className="min-h-0 flex-1 overflow-hidden"
        onPointerDown={flushContent ? undefined : onPointerDown}
        onPointerUp={flushContent ? undefined : onPointerUp}
      >
        {tabs.map((tab) => (
          <TabsPrimitive.Content
            key={tab.value}
            value={tab.value}
            className={cn(
              'h-full min-h-0 focus-visible:outline-none',
              flushContent ? 'overflow-hidden' : 'overflow-y-auto px-3 py-3',
              contentClassName
            )}
          >
            {tab.content}
          </TabsPrimitive.Content>
        ))}
      </div>
    </TabsPrimitive.Root>
  );
}
