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
  className,
}: {
  tabs: MobileSwipeTab[];
  defaultValue?: string;
  className?: string;
}) {
  const [value, setValue] = React.useState(defaultValue ?? tabs[0]?.value ?? '');
  const startRef = React.useRef<{ x: number; y: number } | null>(null);

  const currentIndex = Math.max(0, tabs.findIndex((tab) => tab.value === value));

  const goToIndex = React.useCallback(
    (index: number) => {
      const next = tabs[Math.min(Math.max(index, 0), tabs.length - 1)];
      if (next) setValue(next.value);
    },
    [tabs]
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
        className="flex shrink-0 gap-1 overflow-x-auto border-b bg-background px-4 py-2 scrollbar-none"
        style={{ scrollbarWidth: 'none' }}
      >
        {tabs.map((tab) => (
          <TabsPrimitive.Trigger
            key={tab.value}
            value={tab.value}
            className={cn(
              'flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-medium whitespace-nowrap',
              'text-muted-foreground transition-colors',
              'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30'
            )}
          >
            <span>{tab.label}</span>
            {tab.badge}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>

      <div
        className="min-h-0 flex-1 overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        {tabs.map((tab) => (
          <TabsPrimitive.Content
            key={tab.value}
            value={tab.value}
            className="h-full min-h-0 overflow-y-auto px-4 py-4 tab-panel-safe focus-visible:outline-none"
          >
            {tab.content}
          </TabsPrimitive.Content>
        ))}
      </div>
    </TabsPrimitive.Root>
  );
}
