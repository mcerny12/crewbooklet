'use client';

import type { Invoice } from '@/lib/types/models';
import { InvoiceStatus } from '@/lib/types/models';
import { format } from 'date-fns';

interface CompactInvoiceListItemProps {
  invoice: Invoice;
  onSelect: (invoice: Invoice) => void;
  isSelected?: boolean;
}

const STATUS_BADGE_COLORS: Record<InvoiceStatus, string> = {
  [InvoiceStatus.Draft]: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  [InvoiceStatus.Sent]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  [InvoiceStatus.Paid]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  [InvoiceStatus.Overdue]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  [InvoiceStatus.Cancelled]: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
};

export function CompactInvoiceListItem({ invoice, onSelect, isSelected }: CompactInvoiceListItemProps) {
  const formatDate = (d: string | null | undefined) => {
    if (!d) return '—';
    try { return format(new Date(d), 'dd.MM.yyyy'); } catch { return '—'; }
  };

  const formatAmount = (n: number | null | undefined) => {
    if (n == null) return '—';
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);
  };

  return (
    <div
      className={`grid grid-cols-[1.5fr_2fr_1fr_1fr_1fr] gap-3 px-4 py-2 cursor-pointer transition-colors items-center text-sm border-b ${
        isSelected
          ? 'bg-blue-50 dark:bg-blue-950'
          : 'hover:bg-gray-50 dark:hover:bg-gray-900'
      }`}
      onClick={() => onSelect(invoice)}
    >
      {/* Number */}
      <div className="min-w-0">
        <div className="font-medium truncate">{invoice.invoice_number}</div>
        <div className="text-xs text-gray-500 truncate">{invoice.reference || '—'}</div>
      </div>

      {/* Recipient */}
      <div className="min-w-0">
        <div className="truncate">{invoice.recipient_name || '—'}</div>
        <div className="text-xs text-gray-500 truncate">{invoice.recipient_city || ''}</div>
      </div>

      {/* Date */}
      <div className="text-xs truncate">{formatDate(invoice.date)}</div>

      {/* Total */}
      <div className="text-xs font-medium truncate">{formatAmount(invoice.total)}</div>

      {/* Status */}
      <div>
        <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_COLORS[invoice.status] ?? STATUS_BADGE_COLORS[InvoiceStatus.Draft]}`}>
          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
        </span>
      </div>
    </div>
  );
}
