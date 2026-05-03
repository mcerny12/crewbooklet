'use client';

import * as React from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface MultiSelectProps {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  maxSelections?: number;
  className?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Select items...',
  maxSelections,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleUnselect = (item: string) => {
    onChange(selected.filter((s) => s !== item));
  };

  const handleSelect = (value: string) => {
    const isSelected = selected.includes(value);
    if (isSelected) {
      onChange(selected.filter((s) => s !== value));
    } else {
      if (maxSelections && selected.length >= maxSelections) {
        return;
      }
      onChange([...selected, value]);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('h-7 justify-between text-xs w-full', className)}
        >
          <div className="flex gap-1 flex-wrap flex-1 items-center">
            {selected.length === 0 && (
              <span className="text-muted-foreground text-xs">{placeholder}</span>
            )}
            {selected.slice(0, 2).map((item) => {
              const option = options.find((opt) => opt.value === item);
              return (
                <Badge
                  variant="secondary"
                  key={item}
                  className="text-xs px-1.5 py-0 h-5"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUnselect(item);
                  }}
                >
                  {option?.label}
                  <X className="ml-1 h-2 w-2 cursor-pointer" />
                </Badge>
              );
            })}
            {selected.length > 2 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
                +{selected.length - 2} more
              </Badge>
            )}
          </div>
          <ChevronDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[300px] max-h-64 overflow-auto" align="start">
        {options.map((option) => {
          const isSelected = selected.includes(option.value);
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={(e) => {
                e.preventDefault();
                handleSelect(option.value);
              }}
              className="text-xs cursor-pointer"
            >
              <Checkbox
                checked={isSelected}
                className="mr-2 h-4 w-4"
                onClick={(e) => e.stopPropagation()}
              />
              {option.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
