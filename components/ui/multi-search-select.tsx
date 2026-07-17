'use client';

import { useState, useRef } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';

interface MultiSearchSelectProps {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  maxSelections?: number;
  className?: string;
  showOptionsWhenEmpty?: boolean;
}

export function MultiSearchSelect({
  options,
  selected,
  onChange,
  placeholder = 'Search…',
  maxSelections,
  className,
  showOptionsWhenEmpty = true,
}: MultiSearchSelectProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const available = options.filter(o => !selected.includes(o.value));
  const filtered = query.trim()
    ? available.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : showOptionsWhenEmpty ? available : [];

  const shouldShowDropdown = open && filtered.length > 0;
  const canAddMore = !maxSelections || selected.length < maxSelections;

  const add = (value: string) => {
    if (!selected.includes(value) && canAddMore) {
      onChange([...selected, value]);
    }
    setQuery('');
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const remove = (value: string) => {
    onChange(selected.filter(s => s !== value));
  };

  return (
    <PopoverPrimitive.Root open={shouldShowDropdown} onOpenChange={(next) => { if (!next) setOpen(false); }}>
      <PopoverPrimitive.Anchor asChild>
        <div
          className={cn(
            'flex flex-wrap gap-1 min-h-7 items-center px-2 py-1 border border-input rounded-md bg-background cursor-text',
            className
          )}
          onClick={() => inputRef.current?.focus()}
        >
          {selected.map(val => {
            const opt = options.find(o => o.value === val);
            return (
              <Badge key={val} variant="secondary" className="text-xs px-1.5 py-0 h-5 gap-1 shrink-0">
                {opt?.label ?? val}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => { e.stopPropagation(); remove(val); }}
                  className="hover:text-destructive transition-colors"
                  aria-label={`Remove ${opt?.label ?? val}`}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            );
          })}
          {canAddMore && (
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onBlur={() => { setOpen(false); setQuery(''); }}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && !query && selected.length > 0) {
                  remove(selected[selected.length - 1]);
                }
                if (e.key === 'Escape') { setOpen(false); setQuery(''); }
              }}
              placeholder={selected.length === 0 ? placeholder : ''}
              className="flex-1 min-w-[80px] bg-transparent text-xs outline-none placeholder:text-muted-foreground"
            />
          )}
        </div>
      </PopoverPrimitive.Anchor>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="bottom"
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="z-50 max-h-56 w-(--radix-popover-trigger-width) min-w-(--radix-popover-trigger-width) overflow-y-auto rounded-xl border border-border bg-popover shadow-lg"
        >
          {filtered.map(opt => (
            <button
              key={opt.value}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => add(opt.value)}
              className="w-full text-left text-xs px-3 py-2 min-h-8 hover:bg-muted/60 transition-colors"
            >
              {opt.label}
            </button>
          ))}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
