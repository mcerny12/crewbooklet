'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchableSelectOption {
  id: string;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string | null | undefined;
  onChange: (id: string | null) => void;
  placeholder?: string;
  className?: string;
  /**
   * When true, opens the dropdown with the full option list as soon as the
   * input is focused (and keeps filtering as the user types). Use for fixed,
   * reasonably-sized enumerations like country / department, where users
   * expect to scan a list. Defaults to false to preserve the
   * type-to-search behaviour used for large entity pickers
   * (people / organizations / projects).
   */
  showOptionsWhenEmpty?: boolean;
}

export function SearchableSelect({ options, value, onChange, placeholder = 'Search...', className, showOptionsWhenEmpty = false }: SearchableSelectProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = value ? options.find(o => o.id === value) : null;
  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(query.toLowerCase()) ||
    (o.sublabel ?? '').toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setEditing(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const beginEditing = () => {
    const initial = selected?.label ?? '';
    setQuery(initial);
    setEditing(true);
    setOpen(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  };

  if (selected && !editing) {
    return (
      <div ref={containerRef} className={cn('ss-root flex items-center gap-2 min-h-9 pr-1 pl-3 text-sm border border-input rounded-lg bg-muted/40', className)}>
        <button
          type="button"
          onClick={beginEditing}
          className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left focus-visible:outline-none"
          aria-label={`Change selection (current: ${selected.label})`}
        >
          <span className="flex-1 truncate">{selected.label}</span>
          {selected.sublabel && <span className="text-muted-foreground shrink-0 text-xs">{selected.sublabel}</span>}
        </button>
        <button
          type="button"
          onClick={() => { onChange(null); setQuery(''); setEditing(false); setOpen(false); }}
          className="text-muted-foreground hover:text-destructive transition-colors shrink-0 flex h-6 w-6 items-center justify-center"
          aria-label="Clear selection"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn('ss-root relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none z-10" />
      <Input
        ref={inputRef}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => {
          if (showOptionsWhenEmpty || query.trim().length > 0) setOpen(true);
        }}
        onBlur={() => { if (editing && selected) setEditing(false); }}
        placeholder={placeholder}
        className="min-h-9 text-sm pl-8"
      />
      {open && (showOptionsWhenEmpty || query.trim().length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border border-border rounded-xl shadow-lg max-h-56 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground px-3 py-2.5">No results found</div>
          ) : filtered.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onChange(opt.id); setQuery(''); setOpen(false); setEditing(false); }}
              className="w-full text-left text-sm px-3 py-2.5 min-h-10 hover:bg-muted/60 transition-colors flex items-center justify-between gap-2"
            >
              <span className="truncate">{opt.label}</span>
              {opt.sublabel && <span className="text-muted-foreground shrink-0 text-xs">{opt.sublabel}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
