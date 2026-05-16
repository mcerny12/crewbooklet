import {
  InvoiceDocumentType,
  InvoiceItemType,
  type Invoice,
  type InvoiceAcontoApplication,
  type InvoiceItem,
} from '@/lib/types/models';

export interface InvoiceTotals {
  /** Sum of positive service/expense/other line items (before tax already baked into item.total). */
  subtotal: number;
  /** Sum of applied aconto deductions (positive value; deducted from subtotal). */
  acontoDeductionTotal: number;
  /**
   * Final invoice total: subtotal − acontoDeductionTotal for normal/revision invoices.
   * For storno invoices: the literal sum of all line items (which is negative).
   */
  total: number;
}

function isPositiveLineItem(item: InvoiceItem): boolean {
  const t = item.item_type ?? InvoiceItemType.Service;
  // CorrectionReversal lines are only present on storno invoices, where we want
  // them included in the literal sum (handled in the storno branch below).
  return t === InvoiceItemType.Service
      || t === InvoiceItemType.Expense
      || t === InvoiceItemType.Other;
}

/**
 * Pure totals calculator. Single source of truth for invoice math across UI + PDF.
 *
 * - Normal / Revision invoice: subtotal (service+expense+other items) − sum(applications.applied_amount).
 * - Storno invoice: literal sum of all line items, including correction_reversal lines.
 *   (Applications on a storno are not used; the reversal is encoded in the items themselves.)
 */
export function calculateInvoiceTotals(
  items: InvoiceItem[] | null | undefined,
  applications: InvoiceAcontoApplication[] | null | undefined,
  documentType?: InvoiceDocumentType | null
): InvoiceTotals {
  const safeItems = items ?? [];
  const safeApps = applications ?? [];

  if (documentType === InvoiceDocumentType.StornoInvoice) {
    const total = safeItems.reduce((sum, it) => sum + (it.total ?? 0), 0);
    const subtotal = safeItems
      .filter(isPositiveLineItem)
      .reduce((sum, it) => sum + (it.total ?? 0), 0);
    return {
      subtotal,
      acontoDeductionTotal: 0,
      total,
    };
  }

  const subtotal = safeItems
    .filter(isPositiveLineItem)
    .reduce((sum, it) => sum + (it.total ?? 0), 0);
  const acontoDeductionTotal = safeApps.reduce(
    (sum, app) => sum + (app.applied_amount ?? 0),
    0
  );
  return {
    subtotal,
    acontoDeductionTotal,
    total: subtotal - acontoDeductionTotal,
  };
}

/** Convenience for callers that already have a fully-loaded Invoice in hand. */
export function totalsForInvoice(invoice: Invoice): InvoiceTotals {
  return calculateInvoiceTotals(
    invoice.items,
    invoice.aconto_applications,
    invoice.document_type
  );
}
