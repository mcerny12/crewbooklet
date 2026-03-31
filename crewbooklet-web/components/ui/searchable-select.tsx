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
}

export function SearchableSelect({ options, value, onChange, placeholder = 'Search...', className }: SearchableSelectProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = value ? options.find(o => o.id === value) : null;
  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(query.toLowerCase()) ||
    (o.sublabel ?? '').toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (selected) {
    return (
      <div className={cn('flex items-center gap-1 h-7 px-2 text-xs border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800', className)}>
        <span className="flex-1 truncate text-gray-800 dark:text-gray-200">{selected.label}</span>
        {selected.sublabel && <span className="text-gray-400 shrink-0 text-[10px]">{selected.sublabel}</span>}
        <button
          type="button"
          onClick={() => { onChange(null); setQuery(''); }}
          className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
          title="Clear"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none z-10" />
      <Input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => { if (query.trim().length > 0) setOpen(true); }}
        placeholder={placeholder}
        className="h-7 text-xs pl-6"
      />
      {open && query.trim().length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-0.5 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-48 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-xs text-gray-400 px-2 py-1.5">No results found</div>
          ) : filtered.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onChange(opt.id); setQuery(''); setOpen(false); }}
              className="w-full text-left text-xs px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-between gap-2"
            >
              <span className="truncate">{opt.label}</span>
              {opt.sublabel && <span className="text-gray-400 shrink-0 text-[10px]">{opt.sublabel}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
