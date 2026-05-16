import * as React from 'react';
import { cn } from '@/lib/utils';

// ── Project status ───────────────────────────────────────────────────────────

const PROJECT_STATUS_CLASSES: Record<string, string> = {
  INQUIRY:    'bg-blue-50   text-blue-700   border border-blue-200',
  BUDGET:     'bg-amber-50  text-amber-700  border border-amber-200',
  PRODUCTION: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  COMPLETED:  'bg-teal-50   text-teal-700   border border-teal-200',
  CANCELLED:  'bg-red-50    text-red-600    border border-red-200',
  HOLD:       'bg-purple-50 text-purple-700 border border-purple-200',
};

const PROJECT_STATUS_LABELS: Record<string, string> = {
  INQUIRY:    'Inquiry',
  BUDGET:     'Budget',
  PRODUCTION: 'Production',
  COMPLETED:  'Completed',
  CANCELLED:  'Cancelled',
  HOLD:       'Hold',
};

// ── Invoice status ───────────────────────────────────────────────────────────

const INVOICE_STATUS_CLASSES: Record<string, string> = {
  draft:           'bg-slate-100  text-slate-600  border border-slate-200',
  sent:            'bg-blue-50    text-blue-700   border border-blue-200',
  paid:            'bg-emerald-50 text-emerald-700 border border-emerald-200',
  overdue:         'bg-red-50     text-red-600    border border-red-200',
  cancelled:       'bg-slate-100  text-slate-500  border border-slate-200',
  corrected:       'bg-amber-50   text-amber-700  border border-amber-200',
  revision_draft:  'bg-slate-100  text-slate-600  border border-slate-200',
};

const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft:           'Draft',
  sent:            'Sent',
  paid:            'Paid',
  overdue:         'Overdue',
  cancelled:       'Storniert',
  corrected:       'Korrigiert',
  revision_draft:  'Revision draft',
};

// ── Assignment / availability status ─────────────────────────────────────────

const AVAILABILITY_STATUS_CLASSES: Record<string, string> = {
  'To Inquire':   'bg-blue-50   text-blue-700   border border-blue-200',
  'Inquired':     'bg-sky-50    text-sky-700    border border-sky-200',
  'Available':    'bg-emerald-50 text-emerald-700 border border-emerald-200',
  'Not Available':'bg-slate-100 text-slate-500  border border-slate-200',
  '1st Option':   'bg-yellow-50 text-yellow-700 border border-yellow-200',
  '2nd Option':   'bg-amber-50  text-amber-700  border border-amber-200',
  'Booked':       'bg-emerald-50 text-emerald-700 border border-emerald-200',
  'Cancelled':    'bg-red-50    text-red-600    border border-red-200',
  'No Response':  'bg-slate-100 text-slate-500  border border-slate-200',
};

// ── Generic badge ────────────────────────────────────────────────────────────

function StatusPill({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap',
        className,
      )}
    >
      {label}
    </span>
  );
}

// ── Exported convenience components ─────────────────────────────────────────

export function ProjectStatusBadge({ status }: { status: string }) {
  return (
    <StatusPill
      label={PROJECT_STATUS_LABELS[status] ?? status}
      className={PROJECT_STATUS_CLASSES[status] ?? 'bg-slate-100 text-slate-600'}
    />
  );
}

export function InvoiceStatusBadge({ status }: { status: string }) {
  const label = INVOICE_STATUS_LABELS[status] ?? (status.charAt(0).toUpperCase() + status.slice(1));
  return (
    <StatusPill
      label={label}
      className={INVOICE_STATUS_CLASSES[status] ?? 'bg-slate-100 text-slate-600'}
    />
  );
}

export function AvailabilityBadge({ status }: { status: string }) {
  return (
    <StatusPill
      label={status}
      className={AVAILABILITY_STATUS_CLASSES[status] ?? 'bg-slate-100 text-slate-500'}
    />
  );
}

export { PROJECT_STATUS_CLASSES, INVOICE_STATUS_CLASSES, AVAILABILITY_STATUS_CLASSES };
