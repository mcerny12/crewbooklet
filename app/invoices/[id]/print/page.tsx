'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { NextIntlClientProvider, useFormatter, useLocale, useTranslations } from 'next-intl';
import { SupabaseService } from '@/lib/services/supabase-service';
import type { Invoice, InvoiceItem, InvoiceAcontoApplication } from '@/lib/types/models';
import { InvoiceDocumentType, InvoiceItemType } from '@/lib/types/models';
import { calculateInvoiceTotals } from '@/lib/invoice/totals';
import { resolveInvoiceDocumentLanguage } from '@/lib/i18n/document-language';
import type { Locale } from '@/i18n/routing';
import deMessages from '@/messages/de.json';
import enMessages from '@/messages/en.json';

// Messages bundle for a specific document language. Loaded eagerly so the
// print page can switch locale without an async boundary in the middle of
// the pagination flow.
const MESSAGES_BY_LOCALE: Record<Locale, typeof deMessages> = {
  de: deMessages,
  en: enMessages,
};

// ── Formatting ────────────────────────────────────────────────

// Per-locale date format helpers. Centralised here so all date rendering on
// the PDF respects the invoice's frozen document_language.
function useDateFormatters() {
  const format = useFormatter();
  const locale = useLocale();
  return {
    full: (d: string | null | undefined): string => {
      if (!d) return '';
      try { return format.dateTime(new Date(d), { day: '2-digit', month: '2-digit', year: 'numeric' }); }
      catch { return ''; }
    },
    period: (s: string | null | undefined, e: string | null | undefined): string => {
      if (!s && !e) return '';
      // German renders "01.02. – 15.02.2026"; English renders "Feb 1 – Feb 15, 2026"
      const sFmt = locale === 'de'
        ? (d: string) => format.dateTime(new Date(d), { day: '2-digit', month: '2-digit' }) + '.'
        : (d: string) => format.dateTime(new Date(d), { day: 'numeric', month: 'short' });
      const eFmt = (d: string) => format.dateTime(new Date(d), { day: '2-digit', month: '2-digit', year: 'numeric' });
      const fs = s ? sFmt(s) : '';
      const fe = e ? eFmt(e) : '';
      return [fs, fe].filter(Boolean).join(' – ');
    },
  };
}

function useCurrencyFormatter() {
  const format = useFormatter();
  return (n: number | null | undefined): string => {
    if (n == null) return '–';
    return format.number(n, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' EUR';
  };
}

// ── Sender constants ──────────────────────────────────────────

const SENDER_BOLD   = 'Mortimer Cerny';
const SENDER_LIGHT  = 'Production Service';
const SENDER_ADDR   = 'Rodenbergstraße 2, 10439 Berlin, Germany';
const SENDER_PHONE  = '+49 151 403 704 20';
const SENDER_EMAIL  = 'mortimer.cerny@gmail.com';
const SENDER_TAXNR  = 'StNr 31/250/01678';
const SENDER_KUIDNR = 'KU-IdNr DE460340497-EX';
const BANK_NAME     = 'Mortimer Cerny';
const BANK_IBAN     = 'DE41 1001 1001 2927 0427 52';
const BANK_BIC      = 'NTSBDEB1XXX';

// ── Layout constants ──────────────────────────────────────────

const MM              = 96 / 25.4;
const PAGE_W_MM       = 210;
const PAGE_H_MM       = 297;
const PAD_L_MM        = 15.1;
const PAD_R_MM        = 15.1;
const CONTENT_W_MM    = PAGE_W_MM - PAD_L_MM - PAD_R_MM;
const HEADER_H_MM     = 104.9;
const BODY_TOP_MM     = HEADER_H_MM + 3;
const FOOTER_H_MM     = 22;
const BODY_BOTTOM_MM  = PAGE_H_MM - FOOTER_H_MM;
const BODY_H_MM       = BODY_BOTTOM_MM - BODY_TOP_MM;
const BODY_H_PX       = Math.round(BODY_H_MM * MM);
const MIN_FILL_RATIO  = 0.28;

// ── Block model ───────────────────────────────────────────────

type BlockKind = 'greeting' | 'tableHeader' | 'item' | 'totals' | 'legal' | 'payment';

interface Block {
  kind:      BlockKind;
  id:        string;
  heightPx:  number;
  itemIndex?: number;
}

interface PageData {
  blocks: Block[];
}

// ── Pagination ────────────────────────────────────────────────

function paginate(
  allBlocks: Block[],
  tableHeaderH: number,
  bodyH: number,
): PageData[] {
  const TAIL_KINDS: BlockKind[] = ['totals', 'legal', 'payment'];

  const greetingBlock  = allBlocks.find(b => b.kind === 'greeting');
  const itemBlocks     = allBlocks.filter(b => b.kind === 'item');
  const tailBlocks     = allBlocks.filter(b => TAIL_KINDS.includes(b.kind));
  const tailH          = tailBlocks.reduce((s, b) => s + b.heightPx, 0);

  const pages: PageData[] = [];
  let currentPage: Block[] = [];
  let currentH = 0;

  const startNewPage = () => {
    pages.push({ blocks: currentPage });
    currentPage = [];
    currentH = 0;
  };

  if (greetingBlock) {
    currentPage.push(greetingBlock);
    currentH += greetingBlock.heightPx;
  }

  currentPage.push({ kind: 'tableHeader', id: 'tableHeader', heightPx: tableHeaderH });
  currentH += tableHeaderH;

  for (const item of itemBlocks) {
    if (currentH + item.heightPx > bodyH) {
      startNewPage();
      currentPage.push({ kind: 'tableHeader', id: 'tableHeader', heightPx: tableHeaderH });
      currentH = tableHeaderH;
    }
    currentPage.push(item);
    currentH += item.heightPx;
  }

  if (currentH + tailH > bodyH) {
    startNewPage();
  }
  currentPage.push(...tailBlocks);
  pages.push({ blocks: currentPage });

  // Avoid orphaned tail page
  if (pages.length >= 2) {
    const last = pages[pages.length - 1];
    const lastH = last.blocks.reduce((s, b) => s + b.heightPx, 0);
    if (lastH < bodyH * MIN_FILL_RATIO) {
      const prev = pages[pages.length - 2];
      const lastItemIdx = findLastItemIdx(prev.blocks);
      if (lastItemIdx >= 0) {
        const movedItem = prev.blocks.splice(lastItemIdx, 1)[0];
        last.blocks.unshift(movedItem);
        const headerInLast = last.blocks.find(b => b.kind === 'tableHeader');
        if (!headerInLast) {
          last.blocks.unshift({ kind: 'tableHeader', id: 'tableHeader', heightPx: tableHeaderH });
        }
      }
    }
  }

  return pages;
}

function findLastItemIdx(blocks: Block[]): number {
  for (let i = blocks.length - 1; i >= 0; i--) {
    if (blocks[i].kind === 'item') return i;
  }
  return -1;
}

// ── Block renderers ───────────────────────────────────────────

const COL = {
  c1: { width: '50%', textAlign: 'left'  as const },
  c2: { width: '9%',  textAlign: 'right' as const, paddingRight: '2mm' },
  c3: { width: '16%', textAlign: 'right' as const, paddingRight: '2mm' },
  c4: { width: '10%', textAlign: 'right' as const, paddingRight: '2mm' },
  c5: { width: '15%', textAlign: 'right' as const },
};
const TD_PAD: React.CSSProperties = { padding: '2.2mm 0', verticalAlign: 'top' };

function TableHeaderRow({ style }: { style?: React.CSSProperties }) {
  const t = useTranslations('invoicePdf.tableHeaders');
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', fontWeight: 400, ...style }}>
      <thead>
        <tr style={{ borderBottom: '0.75pt solid #000' }}>
          <th style={{ ...COL.c1, fontWeight: 400, paddingBottom: '2mm', textAlign: 'left' }}>{t('description')}</th>
          <th style={{ ...COL.c2, fontWeight: 400, paddingBottom: '2mm', textAlign: 'right' }}>{t('quantity')}</th>
          <th style={{ ...COL.c3, fontWeight: 400, paddingBottom: '2mm', textAlign: 'right' }}>{t('unitPrice')}</th>
          <th style={{ ...COL.c4, fontWeight: 400, paddingBottom: '2mm', textAlign: 'right' }}>{t('tax')}</th>
          <th style={{ ...COL.c5, fontWeight: 400, paddingBottom: '2mm', textAlign: 'right' }}>{t('total')}</th>
        </tr>
      </thead>
    </table>
  );
}

function ItemRow({ item }: { item: InvoiceItem }) {
  const fmtCurrency = useCurrencyFormatter();
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', fontWeight: 400 }}>
      <tbody>
        <tr>
          <td style={{ ...COL.c1, ...TD_PAD }}>
            {item.description}
            {item.sub_description && (
              <div style={{ fontSize: '8.5pt', color: '#222', marginTop: '0.5mm' }}>
                {item.sub_description}
              </div>
            )}
          </td>
          <td style={{ ...COL.c2, ...TD_PAD }}>
            {item.quantity % 1 === 0 ? item.quantity.toFixed(0) : item.quantity}
          </td>
          <td style={{ ...COL.c3, ...TD_PAD }}>{fmtCurrency(item.unit_price)}</td>
          <td style={{ ...COL.c4, ...TD_PAD }}>{item.tax_rate > 0 ? `${item.tax_rate}%` : '0%'}</td>
          <td style={{ ...COL.c5, ...TD_PAD }}>{fmtCurrency(item.total)}</td>
        </tr>
      </tbody>
    </table>
  );
}

function TotalsBlock({
  subtotal,
  applications,
  total,
}: {
  subtotal: number;
  applications: InvoiceAcontoApplication[];
  total: number;
}) {
  const t = useTranslations('invoicePdf.totals');
  const fmtCurrency = useCurrencyFormatter();
  const dateFmt = useDateFormatters();
  const BORDER_TOP: React.CSSProperties = { borderTop: '0.75pt solid #000', paddingTop: '2.5mm', paddingBottom: '2mm' };
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', fontWeight: 400 }}>
      <tbody>
        {applications.length > 0 ? (
          <>
            <tr>
              <td colSpan={4} style={{ ...BORDER_TOP, textAlign: 'right', paddingRight: '4mm' }}>{t('subtotal')}</td>
              <td style={{ ...BORDER_TOP, ...COL.c5 }}>{fmtCurrency(subtotal)}</td>
            </tr>
            <tr>
              <td colSpan={5} style={{ paddingTop: '2mm', paddingBottom: '1mm', fontWeight: 700 }}>
                {t('appliedAcontosHeading')}
              </td>
            </tr>
            {applications.map(app => (
              <tr key={app.id}>
                <td colSpan={4} style={{ paddingBottom: '2mm', textAlign: 'right', paddingRight: '4mm' }}>
                  {app.label} {app.source_invoice_number}
                  {app.source_invoice_date && ` · ${dateFmt.full(app.source_invoice_date)}`}
                </td>
                <td style={{ paddingBottom: '2mm', ...COL.c5 }}>-{fmtCurrency(app.applied_amount ?? 0)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={4} style={{ ...BORDER_TOP, textAlign: 'right', paddingRight: '4mm', fontWeight: 700 }}>
                {t('total')}
              </td>
              <td style={{ ...BORDER_TOP, ...COL.c5, fontWeight: 700 }}>{fmtCurrency(total)}</td>
            </tr>
          </>
        ) : (
          <tr>
            <td colSpan={4} style={{ ...BORDER_TOP, textAlign: 'right', paddingRight: '4mm' }}>{t('total')}</td>
            <td style={{ ...BORDER_TOP, ...COL.c5 }}>{fmtCurrency(total)}</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function LegalNotes() {
  const t = useTranslations('invoicePdf');
  return (
    <div style={{ marginTop: '4mm', fontSize: '9pt', lineHeight: 1.4 }}>
      <p style={{ marginBottom: 0 }}>{t('legalNote')}</p>
    </div>
  );
}

function PaymentBlock({ total, dueDate }: { total: number; dueDate: string | null | undefined }) {
  const t = useTranslations('invoicePdf.payment');
  const fmtCurrency = useCurrencyFormatter();
  const dateFmt = useDateFormatters();
  void total;
  void dueDate;
  return (
    <div style={{ marginTop: '3.8mm', fontSize: '9pt', lineHeight: 1.4 }}>
      <p style={{ marginBottom: 0 }}>
        {t('instruction')} {fmtCurrency(total)}{dueDate ? ` · ${dateFmt.full(dueDate)}` : ''}
      </p>
      <p style={{ marginTop: '3.8mm', marginBottom: 0 }}>{t('bank')}: {BANK_NAME}</p>
      <p style={{ marginBottom: 0 }}>{t('iban')}: {BANK_IBAN}</p>
      <p style={{ marginBottom: 0 }}>{t('bic')}: {BANK_BIC}</p>
    </div>
  );
}

function StornoFootnote({
  reason,
  hasAcontoReversals,
  originalInvoiceNumber,
}: {
  reason: string | null | undefined;
  hasAcontoReversals: boolean;
  originalInvoiceNumber: string | null | undefined;
}) {
  const t = useTranslations('invoicePdf.storno');
  return (
    <div style={{ marginTop: '3.8mm', fontSize: '9pt', lineHeight: 1.4 }}>
      <p style={{ marginBottom: 0 }}>
        {t('footnoteIntro', { originalSuffix: originalInvoiceNumber ? ` ${originalInvoiceNumber}` : '' })}
      </p>
      {hasAcontoReversals && (
        <p
          style={{ marginTop: '3.8mm', marginBottom: 0 }}
          dangerouslySetInnerHTML={{ __html: t.raw('acontoNote') as string }}
        />
      )}
      {reason && (
        <p style={{ marginTop: '3.8mm', marginBottom: 0 }}>
          <strong style={{ fontWeight: 700 }}>{t('reasonLabel')}</strong> {reason}
        </p>
      )}
    </div>
  );
}

// ── Page frame ────────────────────────────────────────────────

function InvoiceHeader({ invoice, period, docTitle }: { invoice: Invoice; period: string; docTitle: string }) {
  const t = useTranslations('invoicePdf.metadata');
  const dateFmt = useDateFormatters();
  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0, right: 0,
      height: `${HEADER_H_MM}mm`,
    }}>
      <div style={{
        position: 'absolute',
        top: '12mm', left: `${PAD_L_MM}mm`, right: `${PAD_R_MM}mm`,
        display: 'flex', alignItems: 'baseline',
        fontSize: '9pt', lineHeight: 1,
      }}>
        <strong style={{ fontWeight: 700 }}>{SENDER_BOLD}</strong>
        <span style={{ fontWeight: 300 }}>&nbsp;&nbsp;|&nbsp;&nbsp;{SENDER_LIGHT}</span>
      </div>

      <div style={{ position: 'absolute', top: '39.5mm', left: `${PAD_L_MM}mm`, width: '93mm' }}>
        <div style={{ fontSize: '7.9pt', fontWeight: 400, lineHeight: 1.3, paddingBottom: '1.5mm', marginBottom: '2mm' }}>
          {SENDER_BOLD}, {SENDER_ADDR}
        </div>
        {invoice.recipient_name    && <div style={{ fontSize: '9pt', fontWeight: 400, lineHeight: 1.25 }}>{invoice.recipient_name}</div>}
        {invoice.recipient_contact && <div style={{ fontSize: '9pt', fontWeight: 400, lineHeight: 1.25 }}>{invoice.recipient_contact}</div>}
        {invoice.recipient_street  && <div style={{ fontSize: '9pt', fontWeight: 400, lineHeight: 1.25 }}>{invoice.recipient_street}</div>}
        {(invoice.recipient_zip || invoice.recipient_city) && (
          <div style={{ fontSize: '9pt', fontWeight: 400, lineHeight: 1.25 }}>
            {[invoice.recipient_zip, invoice.recipient_city].filter(Boolean).join(' ')}
          </div>
        )}
        {invoice.recipient_country && <div style={{ fontSize: '9pt', fontWeight: 400, lineHeight: 1.25 }}>{invoice.recipient_country}</div>}
      </div>

      <div style={{ position: 'absolute', top: '33.2mm', left: '113.9mm', right: `${PAD_R_MM}mm` }}>
        <div style={{ fontSize: '9pt', fontWeight: 700, marginBottom: '2.6mm' }}>{docTitle}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: '3mm' }}>
          {invoice.date && <><span style={{ fontSize: '9pt', fontWeight: 400, lineHeight: 1.22, whiteSpace: 'nowrap' }}>{t('date')}</span><span style={{ fontSize: '9pt', fontWeight: 400, lineHeight: 1.22, textAlign: 'right' }}>{dateFmt.full(invoice.date)}</span></>}
          <span style={{ fontSize: '9pt', fontWeight: 400, lineHeight: 1.22, whiteSpace: 'nowrap' }}>{t('number')}</span>
          <span style={{ fontSize: '9pt', fontWeight: 400, lineHeight: 1.22, textAlign: 'right' }}>{invoice.invoice_number}</span>
          {period && <><span style={{ fontSize: '9pt', fontWeight: 400, lineHeight: 1.22, whiteSpace: 'nowrap' }}>{t('servicePeriod')}</span><span style={{ fontSize: '9pt', fontWeight: 400, lineHeight: 1.22, textAlign: 'right' }}>{period}</span></>}
          {invoice.reference && <><span style={{ fontSize: '9pt', fontWeight: 400, lineHeight: 1.22, whiteSpace: 'nowrap' }}>{t('reference')}</span><span style={{ fontSize: '9pt', fontWeight: 400, lineHeight: 1.22, textAlign: 'right' }}>{invoice.reference}</span></>}
          <span style={{ fontSize: '9pt', fontWeight: 400, lineHeight: 1.22, whiteSpace: 'nowrap' }}>{t('vatId')}</span>
          <span style={{ fontSize: '9pt', fontWeight: 400, lineHeight: 1.22, textAlign: 'right' }}>{invoice.uid_recipient ?? ''}</span>
          <span style={{ fontSize: '9pt', fontWeight: 400, lineHeight: 1.22, whiteSpace: 'nowrap', marginTop: '3mm' }}>T</span>
          <span style={{ fontSize: '9pt', fontWeight: 400, lineHeight: 1.22, textAlign: 'right', marginTop: '3mm' }}>{SENDER_PHONE}</span>
          <span style={{ fontSize: '9pt', fontWeight: 400, lineHeight: 1.22, whiteSpace: 'nowrap' }}>E</span>
          <span style={{ fontSize: '9pt', fontWeight: 400, lineHeight: 1.22, textAlign: 'right' }}>{SENDER_EMAIL}</span>
        </div>
      </div>
    </div>
  );
}

function InvoiceFooter({ pageNum, totalPages }: { pageNum: number; totalPages: number }) {
  const t = useTranslations('invoicePdf.footer');
  return (
    <div style={{
      position: 'absolute',
      bottom: 0, left: 0, right: 0,
      height: `${FOOTER_H_MM}mm`,
      paddingLeft: `${PAD_L_MM}mm`,
      paddingRight: `${PAD_R_MM}mm`,
      paddingTop: '2mm',
      paddingBottom: '7mm',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      fontSize: '6.6pt',
      fontWeight: 300,
      color: '#333',
    }}>
      <div style={{ lineHeight: 1.55 }}>
        <div>{SENDER_BOLD}, {SENDER_ADDR}</div>
        <div>M {SENDER_PHONE}&nbsp;&nbsp;|&nbsp;&nbsp;{SENDER_EMAIL}&nbsp;&nbsp;|&nbsp;&nbsp;{SENDER_TAXNR}&nbsp;&nbsp;|&nbsp;&nbsp;{SENDER_KUIDNR}</div>
      </div>
      <div style={{ fontSize: '5.9pt', whiteSpace: 'nowrap' }}>
        {t('page', { current: pageNum, total: totalPages })}
      </div>
    </div>
  );
}

// ── Document-type derivation ─────────────────────────────────

function useDocMeta(
  invoice: Invoice,
  original: Invoice | null,
  stornoForRevision: Invoice | null
): { isStorno: boolean; isRevision: boolean; docTitle: string; displayGreeting: string } {
  const t = useTranslations('invoicePdf');
  const dateFmt = useDateFormatters();
  const isStorno   = invoice.document_type === InvoiceDocumentType.StornoInvoice;
  const isRevision = invoice.document_type === InvoiceDocumentType.RevisionInvoice;
  const docTitle = isStorno
    ? (invoice.pdf_document_label || t('documentTitle.stornoDefault'))
    : t('documentTitle.invoice');

  let referenceLine = '';
  if (isStorno && original) {
    referenceLine = t('storno.referenceWithOriginal', {
      docTitle,
      originalNumber: original.invoice_number,
      originalDate: dateFmt.full(original.date),
    });
  } else if (isRevision && original) {
    const tail = stornoForRevision
      ? t('storno.originalCancelledTail', { stornoNumber: stornoForRevision.invoice_number })
      : '';
    referenceLine = t('storno.correctionWithOriginal', {
      originalNumber: original.invoice_number,
      originalDate: dateFmt.full(original.date),
      tail,
    });
  }

  const displayGreeting = [referenceLine, invoice.greeting ?? '']
    .filter(s => s && s.trim().length > 0)
    .join('\n\n');

  return { isStorno, isRevision, docTitle, displayGreeting };
}

// ── Component ─────────────────────────────────────────────────

function PrintInvoiceInner({ invoiceId }: { invoiceId: string }) {
  const tCommon = useTranslations('common');

  const [invoice,  setInvoice]  = useState<Invoice | null>(null);
  const [applications, setApplications] = useState<InvoiceAcontoApplication[]>([]);
  const [original, setOriginal] = useState<Invoice | null>(null);
  const [stornoForRevision, setStornoForRevision] = useState<Invoice | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [pages,    setPages]    = useState<PageData[] | null>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!invoiceId) return;
    SupabaseService.fetchInvoice(invoiceId).then(async data => {
      setInvoice(data);
      if (data?.aconto_applications && data.aconto_applications.length > 0) {
        setApplications(data.aconto_applications);
      } else if (data?.aconto_invoice_ids?.length) {
        const apps = await SupabaseService.fetchInvoiceAcontoApplications(data.id);
        if (apps.length > 0) {
          setApplications(apps);
        } else {
          const linked = await SupabaseService.fetchInvoicesByIds(data.aconto_invoice_ids);
          setApplications(linked.map((inv, idx) => ({
            id: `legacy-${inv.id}`,
            created_at: new Date().toISOString(),
            invoice_id: data.id,
            source_invoice_id: inv.id,
            source_invoice_number: inv.invoice_number,
            source_invoice_date: inv.date ?? null,
            label: 'Aconto',
            net_amount: inv.total ?? 0,
            tax_amount: null,
            gross_amount: inv.total ?? 0,
            applied_amount: inv.total ?? 0,
            sort_order: idx,
          })));
        }
      }
      const targetId = data?.corrects_invoice_id ?? data?.revision_of_invoice_id ?? null;
      if (targetId) {
        const orig = await SupabaseService.fetchInvoice(targetId);
        setOriginal(orig);
        if (data?.document_type === InvoiceDocumentType.RevisionInvoice && orig?.storno_invoice_id) {
          const storno = await SupabaseService.fetchInvoice(orig.storno_invoice_id);
          setStornoForRevision(storno);
        }
      }
      setLoading(false);
    });
  }, [invoiceId]);

  const docMeta = invoice ? deriveDocMetaSnapshot(invoice, original, stornoForRevision) : null;
  const { isStorno, docTitle, displayGreeting } = useDocMetaFor(invoice, original, stornoForRevision);

  useEffect(() => {
    if (!invoice || loading || !measureRef.current) return;

    const container = measureRef.current;
    const measure = (key: string): number => {
      const el = container.querySelector(`[data-m="${key}"]`) as HTMLElement | null;
      return el ? el.offsetHeight : 0;
    };

    document.fonts.ready.then(() => {
      const items = invoice.items ?? [];
      const blocks: Block[] = [];

      if (displayGreeting) {
        blocks.push({ kind: 'greeting', id: 'greeting', heightPx: measure('greeting') });
      }
      const tableHeaderH = measure('tableHeader');

      items.forEach((_, i) => {
        blocks.push({ kind: 'item', id: `item-${i}`, heightPx: measure(`item-${i}`), itemIndex: i });
      });

      blocks.push({ kind: 'totals',  id: 'totals',  heightPx: measure('totals')  });
      blocks.push({ kind: 'legal',   id: 'legal',   heightPx: measure('legal')   });
      blocks.push({ kind: 'payment', id: 'payment', heightPx: measure('payment') });

      setPages(paginate(blocks, tableHeaderH, BODY_H_PX));
    });
  }, [invoice, applications, original, stornoForRevision, loading, displayGreeting]);

  useEffect(() => {
    if (!pages || !invoice) return;
    document.title = [invoice.invoice_number, invoice.reference, invoice.recipient_name].filter(Boolean).join('-');
    const t = setTimeout(() => window.print(), 700);
    return () => clearTimeout(t);
  }, [pages, invoice]);

  if (loading || !invoice)
    return <div style={{ padding: 40, fontFamily: 'sans-serif' }}>{tCommon('loading')}</div>;

  const items    = invoice.items ?? [];
  const computed = calculateInvoiceTotals(items, applications, invoice.document_type);
  const subtotal = computed.subtotal;
  const total    = computed.total;
  const period   = formatPeriodFallback(invoice.service_period_start, invoice.service_period_end);
  const totalPages = pages?.length ?? 1;

  const hasAcontoReversals = items.some(it => it.item_type === InvoiceItemType.CorrectionReversal);
  const stornoOriginalNumber = original?.invoice_number ?? invoice.reference ?? null;
  void docMeta;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Montserrat', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #000;
          background: #fff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        @media print {
          @page { size: A4 portrait; margin: 0; }
          .no-print { display: none !important; }
        }
        .invoice-page {
          position: relative;
          width: 210mm;
          height: 297mm;
          overflow: hidden;
          background: #fff;
          page-break-after: always;
          break-after: page;
        }
        .invoice-page:last-child {
          page-break-after: auto;
          break-after: auto;
        }
        .invoice-body {
          position: absolute;
          left: ${PAD_L_MM}mm;
          right: ${PAD_R_MM}mm;
          top: ${BODY_TOP_MM}mm;
          bottom: ${FOOTER_H_MM}mm;
          overflow: hidden;
          font-size: 9pt;
          font-weight: 400;
        }
        @media screen {
          body { background: #d8d8d8; }
          .invoice-page {
            background: #fff;
            box-shadow: 0 2px 32px rgba(0,0,0,0.22);
            margin: 20px auto;
          }
          .print-btn {
            position: fixed; top: 16px; right: 16px;
            padding: 9px 20px; background: #111; color: #fff;
            border: none; border-radius: 6px; font-size: 13px;
            font-family: system-ui, sans-serif; cursor: pointer;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3); z-index: 999;
          }
        }
      `}</style>

      <button className="print-btn no-print" onClick={() => window.print()}>
        {tCommon('print')}
      </button>

      {!pages && (
        <div
          ref={measureRef}
          style={{
            position: 'absolute',
            left: '-10000px',
            top: 0,
            width: `${CONTENT_W_MM}mm`,
            visibility: 'hidden',
            pointerEvents: 'none',
            fontFamily: "'Montserrat', 'Helvetica Neue', Helvetica, Arial, sans-serif",
            fontSize: '9pt',
            fontWeight: 400,
            color: '#000',
          }}
        >
          {displayGreeting && (
            <div data-m="greeting" style={{ whiteSpace: 'pre-line', lineHeight: 1.5, marginBottom: '4mm' }}>
              {displayGreeting}
            </div>
          )}

          <div data-m="tableHeader">
            <TableHeaderRow />
          </div>

          {items.map((item, i) => (
            <div data-m={`item-${i}`} key={i}>
              <ItemRow item={item} />
            </div>
          ))}

          <div data-m="totals">
            <TotalsBlock subtotal={subtotal} applications={isStorno ? [] : applications} total={total} />
          </div>

          <div data-m="legal">
            <LegalNotes />
          </div>

          <div data-m="payment">
            {isStorno
              ? <StornoFootnote
                  reason={invoice.storno_reason}
                  hasAcontoReversals={hasAcontoReversals}
                  originalInvoiceNumber={stornoOriginalNumber}
                />
              : <PaymentBlock total={total} dueDate={invoice.due_date} />}
          </div>
        </div>
      )}

      {pages && pages.map((page, pageIdx) => (
        <div key={pageIdx} className="invoice-page">

          <InvoiceHeader invoice={invoice} period={period} docTitle={docTitle} />

          <div className="invoice-body">
            {page.blocks.map(block => {
              switch (block.kind) {
                case 'greeting':
                  return (
                    <div key={block.id} style={{ whiteSpace: 'pre-line', lineHeight: 1.5, marginBottom: '4mm' }}>
                      {displayGreeting}
                    </div>
                  );
                case 'tableHeader':
                  return <TableHeaderRow key={block.id} />;
                case 'item': {
                  const item = items[block.itemIndex!];
                  return <ItemRow key={block.id} item={item} />;
                }
                case 'totals':
                  return <TotalsBlock key={block.id} subtotal={subtotal} applications={isStorno ? [] : applications} total={total} />;
                case 'legal':
                  return <LegalNotes key={block.id} />;
                case 'payment':
                  return isStorno
                    ? <StornoFootnote
                        key={block.id}
                        reason={invoice.storno_reason}
                        hasAcontoReversals={hasAcontoReversals}
                        originalInvoiceNumber={stornoOriginalNumber}
                      />
                    : <PaymentBlock key={block.id} total={total} dueDate={invoice.due_date} />;
                default:
                  return null;
              }
            })}
          </div>

          <InvoiceFooter pageNum={pageIdx + 1} totalPages={totalPages} />

        </div>
      ))}
    </>
  );
}

// Non-locale-aware date period fallback used outside hook context.
function formatPeriodFallback(_s: string | null | undefined, _e: string | null | undefined): string {
  return '';
}

// Snapshot version of deriveDocMeta (no hooks) — currently unused, retained
// for parity with the previous file shape so future refactors can opt out
// of the hook variant.
function deriveDocMetaSnapshot(
  invoice: Invoice,
  _original: Invoice | null,
  _stornoForRevision: Invoice | null
) {
  return {
    isStorno: invoice.document_type === InvoiceDocumentType.StornoInvoice,
  };
}

// Hook variant used to keep all i18n/format calls inside React render so
// they pick up the scoped NextIntlClientProvider locale.
function useDocMetaFor(
  invoice: Invoice | null,
  original: Invoice | null,
  stornoForRevision: Invoice | null
) {
  const t = useTranslations('invoicePdf');
  const dateFmt = useDateFormatters();
  return useMemo(() => {
    if (!invoice) return { isStorno: false, isRevision: false, docTitle: '', displayGreeting: '' };
    const isStorno   = invoice.document_type === InvoiceDocumentType.StornoInvoice;
    const isRevision = invoice.document_type === InvoiceDocumentType.RevisionInvoice;
    const docTitle = isStorno
      ? (invoice.pdf_document_label || t('documentTitle.stornoDefault'))
      : t('documentTitle.invoice');

    let referenceLine = '';
    if (isStorno && original) {
      referenceLine = t('storno.referenceWithOriginal', {
        docTitle,
        originalNumber: original.invoice_number,
        originalDate: dateFmt.full(original.date),
      });
    } else if (isRevision && original) {
      const tail = stornoForRevision
        ? t('storno.originalCancelledTail', { stornoNumber: stornoForRevision.invoice_number })
        : '';
      referenceLine = t('storno.correctionWithOriginal', {
        originalNumber: original.invoice_number,
        originalDate: dateFmt.full(original.date),
        tail,
      });
    }
    const displayGreeting = [referenceLine, invoice.greeting ?? '']
      .filter(s => s && s.trim().length > 0)
      .join('\n\n');
    return { isStorno, isRevision, docTitle, displayGreeting };
  }, [invoice, original, stornoForRevision, t, dateFmt]);
}

export default function PrintInvoicePage() {
  const params = useParams();
  const id     = params?.id as string;
  const appLocale = useLocale();
  const [docLocale, setDocLocale] = useState<Locale | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!id) return;
    SupabaseService.fetchInvoice(id).then(inv => {
      if (cancelled) return;
      setDocLocale(resolveInvoiceDocumentLanguage(inv?.document_language, appLocale));
    });
    return () => { cancelled = true; };
  }, [id, appLocale]);

  if (!docLocale) {
    return <div style={{ padding: 40, fontFamily: 'sans-serif' }}>…</div>;
  }

  return (
    <NextIntlClientProvider locale={docLocale} messages={MESSAGES_BY_LOCALE[docLocale]}>
      <PrintInvoiceInner invoiceId={id} />
    </NextIntlClientProvider>
  );
}
