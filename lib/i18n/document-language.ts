import type { Locale } from '@/i18n/routing';
import { defaultLocale, isLocale } from '@/i18n/routing';

/**
 * Resolve the language an invoice document should render in.
 *
 * Issued invoices freeze their language at finalization via `document_language`
 * so PDFs do not silently change when the app language is switched later.
 * Drafts fall back to the current app locale (so editing a draft uses the UI
 * language until the document is finalized).
 */
export function resolveInvoiceDocumentLanguage(
  invoiceDocumentLanguage: string | null | undefined,
  appLocale: string,
): Locale {
  if (isLocale(invoiceDocumentLanguage)) return invoiceDocumentLanguage;
  if (isLocale(appLocale)) return appLocale;
  return defaultLocale;
}
