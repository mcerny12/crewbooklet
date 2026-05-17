'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
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

const PROJECT_STATUS_VALUES = new Set(Object.keys(PROJECT_STATUS_CLASSES));

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

const INVOICE_STATUS_VALUES = new Set(Object.keys(INVOICE_STATUS_CLASSES));

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

const AVAILABILITY_STATUS_VALUES = new Set(Object.keys(AVAILABILITY_STATUS_CLASSES));

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
  const t = useTranslations('projects.status');
  const label = PROJECT_STATUS_VALUES.has(status) ? t(status) : status;
  return (
    <StatusPill
      label={label}
      className={PROJECT_STATUS_CLASSES[status] ?? 'bg-slate-100 text-slate-600'}
    />
  );
}

export function InvoiceStatusBadge({ status }: { status: string }) {
  const t = useTranslations('invoices.status');
  const label = INVOICE_STATUS_VALUES.has(status)
    ? t(status)
    : status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <StatusPill
      label={label}
      className={INVOICE_STATUS_CLASSES[status] ?? 'bg-slate-100 text-slate-600'}
    />
  );
}

export function AvailabilityBadge({ status }: { status: string }) {
  const t = useTranslations('assignmentStatus');
  const label = AVAILABILITY_STATUS_VALUES.has(status) ? t(status) : status;
  return (
    <StatusPill
      label={label}
      className={AVAILABILITY_STATUS_CLASSES[status] ?? 'bg-slate-100 text-slate-500'}
    />
  );
}

export { PROJECT_STATUS_CLASSES, INVOICE_STATUS_CLASSES, AVAILABILITY_STATUS_CLASSES };
