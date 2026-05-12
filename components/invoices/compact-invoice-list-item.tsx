'use client';

import type { Invoice } from '@/lib/types/models';
import { InvoiceStatus } from '@/lib/types/models';
import { InvoiceStatusBadge } from '@/components/ui/status-badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface CompactInvoiceListItemProps {
  invoice: Invoice;
  onSelect: (invoice: Invoice) => void;
  isSelected?: boolean;
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  try { return format(new Date(d), 'dd.MM.yyyy'); } catch { return '—'; }
}

function formatAmount(n: number | null | undefined): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n);
}

export function CompactInvoiceListItem({ invoice, onSelect, isSelected }: CompactInvoiceListItemProps) {
  return (
    <div
      role="row"
      aria-selected={isSelected}
      onClick={() => onSelect(invoice)}
      className={cn(
        'grid items-center gap-3 px-5 py-3 cursor-pointer border-b transition-colors',
        'grid-cols-[1.5fr_2fr_1fr_1fr_1fr]',
        isSelected
          ? 'list-row-selected'
          : 'hover:bg-muted/40',
      )}
    >
      {/* Invoice number */}
      <div className="min-w-0">
        <div className={cn('font-medium truncate text-[13.5px]', isSelected && 'text-primary')}>
          {invoice.invoice_number}
          {invoice.is_aconto && (
            <span className="ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700">
              ACONTO
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground truncate">{invoice.reference || '—'}</div>
      </div>

      {/* Recipient */}
      <div className="min-w-0">
        <div className="truncate text-[13px]">{invoice.recipient_name || '—'}</div>
        <div className="text-xs text-muted-foreground truncate">{invoice.recipient_city || ''}</div>
      </div>

      {/* Date */}
      <div className="text-[12.5px] text-muted-foreground tabular-nums">{formatDate(invoice.date)}</div>

      {/* Total — right-aligned */}
      <div className="text-[13px] font-semibold tabular-nums text-right">
        {formatAmount(invoice.total)}
      </div>

      {/* Status */}
      <div>
        <InvoiceStatusBadge status={invoice.status} />
      </div>
    </div>
  );
}
