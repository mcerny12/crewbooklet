'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { SupabaseService } from '@/lib/services/supabase-service';
import type { Invoice, InvoiceItem } from '@/lib/types/models';
import { InvoiceDocumentType } from '@/lib/types/models';
import { format } from 'date-fns';

// ── Formatting ────────────────────────────────────────────────

function fmt(d: string | null | undefined): string {
  if (!d) return '';
  try { return format(new Date(d), 'dd.MM.yyyy'); } catch { return ''; }
}

function fmtPeriod(s: string | null | undefined, e: string | null | undefined): string {
  if (!s && !e) return '';
  const fs = s ? format(new Date(s), 'dd.MM.') : '';
  const fe = e ? format(new Date(e), 'dd.MM.yyyy') : '';
  return [fs, fe].filter(Boolean).join(' – ');
}

function fmtCurrency(n: number | null | undefined): string {
  if (n == null) return '–';
  return new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' EUR';
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
// All in mm; body height also expressed in px for pagination math.

const MM              = 96 / 25.4;          // px per mm at 96 dpi

const PAGE_W_MM       = 210;
const PAGE_H_MM       = 297;
const PAD_L_MM        = 15.1;
const PAD_R_MM        = 15.1;
const CONTENT_W_MM    = PAGE_W_MM - PAD_L_MM - PAD_R_MM; // 179.8 mm

// The header block covers the full first-page header layout (company name,
// recipient address, invoice metadata). Height = 104.9 mm.
const HEADER_H_MM     = 104.9;

// Body starts 3 mm below the header.
const BODY_TOP_MM     = HEADER_H_MM + 3;    // 107.9 mm

// The bottom bar (footer) reserves 22 mm at the bottom of each page.
const FOOTER_H_MM     = 22;
const BODY_BOTTOM_MM  = PAGE_H_MM - FOOTER_H_MM; // 275 mm

const BODY_H_MM       = BODY_BOTTOM_MM - BODY_TOP_MM; // 167.1 mm
const BODY_H_PX       = Math.round(BODY_H_MM * MM);   // ≈ 631 px

// Rebalancing: if the last page is less than this fraction full, move
// content from the previous page to avoid an orphaned tail.
const MIN_FILL_RATIO  = 0.28;

// ── Block model ───────────────────────────────────────────────

type BlockKind = 'greeting' | 'tableHeader' | 'item' | 'totals' | 'legal' | 'payment';

interface Block {
  kind:      BlockKind;
  id:        string;
  heightPx:  number;
  itemIndex?: number;   // only for kind === 'item'
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

  const makeTH = (suffix: string): Block =>
    ({ kind: 'tableHeader', id: `th-${suffix}`, heightPx: tableHeaderH });

  const pages: PageData[] = [];
  let current: Block[]    = [];
  let usedH               = 0;

  function flush(withTableHeader: boolean) {
    pages.push({ blocks: current });
    current = [];
    usedH   = 0;
    if (withTableHeader) {
      const th = makeTH(String(pages.length));
      current.push(th);
      usedH += th.heightPx;
    }
  }

  // Page 1: optional greeting + table header
  if (greetingBlock) {
    current.push(greetingBlock);
    usedH += greetingBlock.heightPx;
  }
  const th0 = makeTH('0');
  current.push(th0);
  usedH += th0.heightPx;

  // Items
  for (const block of itemBlocks) {
    if (usedH + block.heightPx > bodyH) {
      flush(true); // continuation page always gets a table header
    }
    current.push(block);
    usedH += block.heightPx;
  }

  // Tail (totals + legal notes + payment/bank details).
  // Keep as one unit: if it doesn't fit, start a fresh page.
  if (current.length > 0 && usedH + tailH > bodyH) {
    flush(false); // tail page — no table header
  }
  for (const b of tailBlocks) {
    current.push(b);
    usedH += b.heightPx;
  }
  pages.push({ blocks: current });

  return rebalance(pages, tableHeaderH, bodyH);
}

function rebalance(
  pages:        PageData[],
  tableHeaderH: number,
  bodyH:        number,
): PageData[] {
  if (pages.length <= 1) return pages;

  for (let pass = 0; pass < 10; pass++) {
    const last = pages[pages.length - 1];
    const prev = pages[pages.length - 2];

    const lastH    = last.blocks.reduce((s, b) => s + b.heightPx, 0);
    const fillRatio = lastH / bodyH;

    const lastItemCount = last.blocks.filter(b => b.kind === 'item').length;
    const hasLonelyRow  = lastItemCount === 1;
    const isTooEmpty    = fillRatio < MIN_FILL_RATIO;

    if (!isTooEmpty && !hasLonelyRow) break;

    // Find the last item row on the previous page to move here.
    const movableIdx = findLastItemIdx(prev.blocks);
    if (movableIdx === -1) break;

    const movedBlock = prev.blocks[movableIdx];

    // Guard: moving would overflow the last page.
    if (lastH + movedBlock.heightPx > bodyH) break;

    prev.blocks.splice(movableIdx, 1);

    // Ensure last page has a table header when it gains item rows.
    const lastHasTH = last.blocks.some(b => b.kind === 'tableHeader');
    if (!lastHasTH) {
      last.blocks.unshift({
        kind: 'tableHeader',
        id: `th-rebal-${pass}`,
        heightPx: tableHeaderH,
      });
    }

    // Insert the moved block after any table header.
    const insertAt = last.blocks.findIndex(b => b.kind !== 'tableHeader');
    if (insertAt === -1) {
      last.blocks.push(movedBlock);
    } else {
      last.blocks.splice(insertAt, 0, movedBlock);
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
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', fontWeight: 400, ...style }}>
      <thead>
        <tr style={{ borderBottom: '0.75pt solid #000' }}>
          <th style={{ ...COL.c1, fontWeight: 400, paddingBottom: '2mm', textAlign: 'left' }}>Beschreibung</th>
          <th style={{ ...COL.c2, fontWeight: 400, paddingBottom: '2mm', textAlign: 'right' }}>Anzahl</th>
          <th style={{ ...COL.c3, fontWeight: 400, paddingBottom: '2mm', textAlign: 'right' }}>Einzelpreis</th>
          <th style={{ ...COL.c4, fontWeight: 400, paddingBottom: '2mm', textAlign: 'right' }}>Steuer</th>
          <th style={{ ...COL.c5, fontWeight: 400, paddingBottom: '2mm', textAlign: 'right' }}>Gesamt</th>
        </tr>
      </thead>
    </table>
  );
}

function ItemRow({ item }: { item: InvoiceItem }) {
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

function TotalsBlock({ subtotal, acontos, total }: { subtotal: number; acontos: Invoice[]; total: number }) {
  const BORDER_TOP: React.CSSProperties = { borderTop: '0.75pt solid #000', paddingTop: '2.5mm', paddingBottom: '2mm' };
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', fontWeight: 400 }}>
      <tbody>
        {acontos.length > 0 ? (
          <>
            <tr>
              <td colSpan={4} style={{ ...BORDER_TOP, textAlign: 'right', paddingRight: '4mm' }}>Zwischensumme</td>
              <td style={{ ...BORDER_TOP, ...COL.c5 }}>{fmtCurrency(subtotal)}</td>
            </tr>
            {acontos.map(a => (
              <tr key={a.id}>
                <td colSpan={4} style={{ paddingBottom: '2mm', textAlign: 'right', paddingRight: '4mm' }}>
                  Abzgl. Akonto {a.invoice_number}
                </td>
                <td style={{ paddingBottom: '2mm', ...COL.c5 }}>-{fmtCurrency(a.total ?? 0)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={4} style={{ ...BORDER_TOP, textAlign: 'right', paddingRight: '4mm' }}>Gesamtbetrag</td>
              <td style={{ ...BORDER_TOP, ...COL.c5 }}>{fmtCurrency(total)}</td>
            </tr>
          </>
        ) : (
          <tr>
            <td colSpan={4} style={{ ...BORDER_TOP, textAlign: 'right', paddingRight: '4mm' }}>Gesamtbetrag</td>
            <td style={{ ...BORDER_TOP, ...COL.c5 }}>{fmtCurrency(total)}</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function LegalNotes() {
  return (
    <div style={{ marginTop: '4mm', fontSize: '9pt', lineHeight: 1.4 }}>
      <p style={{ marginBottom: 0 }}>Der Leistungszeitraum, falls nicht anders angegeben, entspricht dem Rechnungsdatum.</p>
      <p style={{ marginTop: '3.8mm', marginBottom: 0 }}>Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.</p>
    </div>
  );
}

function PaymentBlock({ total, dueDate }: { total: number; dueDate: string | null | undefined }) {
  return (
    <div style={{ marginTop: '3.8mm', fontSize: '9pt', lineHeight: 1.4 }}>
      <p style={{ marginBottom: 0 }}>
        Ich bitte um Überweisung von {fmtCurrency(total)} bis zum {fmt(dueDate)} auf das angegebene Konto.
      </p>
      <p style={{ marginTop: '3.8mm', marginBottom: 0 }}>Empfänger: {BANK_NAME}</p>
      <p style={{ marginBottom: 0 }}>IBAN: {BANK_IBAN}</p>
      <p style={{ marginBottom: 0 }}>BIC: {BANK_BIC}</p>
    </div>
  );
}

function StornoFootnote({ reason }: { reason: string | null | undefined }) {
  return (
    <div style={{ marginTop: '3.8mm', fontSize: '9pt', lineHeight: 1.4 }}>
      <p style={{ marginBottom: 0 }}>
        Mit dieser Stornorechnung wird die oben genannte Rechnung vollständig aufgehoben. Eine Zahlung ist nicht erforderlich.
      </p>
      {reason && (
        <p style={{ marginTop: '3.8mm', marginBottom: 0 }}>
          <strong style={{ fontWeight: 700 }}>Stornogrund:</strong> {reason}
        </p>
      )}
    </div>
  );
}

// ── Page frame ────────────────────────────────────────────────

function InvoiceHeader({ invoice, period, docTitle }: { invoice: Invoice; period: string; docTitle: string }) {
  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0, right: 0,
      height: `${HEADER_H_MM}mm`,
    }}>
      {/* Company name */}
      <div style={{
        position: 'absolute',
        top: '12mm', left: `${PAD_L_MM}mm`, right: `${PAD_R_MM}mm`,
        display: 'flex', alignItems: 'baseline',
        fontSize: '9pt', lineHeight: 1,
      }}>
        <strong style={{ fontWeight: 700 }}>{SENDER_BOLD}</strong>
        <span style={{ fontWeight: 300 }}>&nbsp;&nbsp;|&nbsp;&nbsp;{SENDER_LIGHT}</span>
      </div>

      {/* Left: sender line + recipient address */}
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

      {/* Right: Rechnung + metadata grid */}
      <div style={{ position: 'absolute', top: '33.2mm', left: '113.9mm', right: `${PAD_R_MM}mm` }}>
        <div style={{ fontSize: '9pt', fontWeight: 700, marginBottom: '2.6mm' }}>{docTitle}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: '3mm' }}>
          {invoice.date && <><span style={{ fontSize: '9pt', fontWeight: 400, lineHeight: 1.22, whiteSpace: 'nowrap' }}>Datum</span><span style={{ fontSize: '9pt', fontWeight: 400, lineHeight: 1.22, textAlign: 'right' }}>{fmt(invoice.date)}</span></>}
          <span style={{ fontSize: '9pt', fontWeight: 400, lineHeight: 1.22, whiteSpace: 'nowrap' }}>Nummer</span>
          <span style={{ fontSize: '9pt', fontWeight: 400, lineHeight: 1.22, textAlign: 'right' }}>{invoice.invoice_number}</span>
          {period && <><span style={{ fontSize: '9pt', fontWeight: 400, lineHeight: 1.22, whiteSpace: 'nowrap' }}>Leistungszeitraum</span><span style={{ fontSize: '9pt', fontWeight: 400, lineHeight: 1.22, textAlign: 'right' }}>{period}</span></>}
          {invoice.due_date && <><span style={{ fontSize: '9pt', fontWeight: 400, lineHeight: 1.22, whiteSpace: 'nowrap' }}>Fälligkeitsdatum</span><span style={{ fontSize: '9pt', fontWeight: 400, lineHeight: 1.22, textAlign: 'right' }}>{fmt(invoice.due_date)}</span></>}
          {invoice.reference && <><span style={{ fontSize: '9pt', fontWeight: 400, lineHeight: 1.22, whiteSpace: 'nowrap' }}>Referenz</span><span style={{ fontSize: '9pt', fontWeight: 400, lineHeight: 1.22, textAlign: 'right' }}>{invoice.reference}</span></>}
          <span style={{ fontSize: '9pt', fontWeight: 400, lineHeight: 1.22, whiteSpace: 'nowrap' }}>UID Empfänger</span>
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
        Seite {pageNum} von {totalPages}
      </div>
    </div>
  );
}

// ── Document-type derivation ─────────────────────────────────

function deriveDocMeta(
  invoice: Invoice,
  original: Invoice | null,
  stornoForRevision: Invoice | null
): { isStorno: boolean; isRevision: boolean; docTitle: string; displayGreeting: string } {
  const isStorno   = invoice.document_type === InvoiceDocumentType.StornoInvoice;
  const isRevision = invoice.document_type === InvoiceDocumentType.RevisionInvoice;
  const docTitle = isStorno
    ? (invoice.pdf_document_label || 'Stornorechnung')
    : 'Rechnung';

  let referenceLine = '';
  if (isStorno && original) {
    referenceLine = `Diese ${docTitle} bezieht sich auf Rechnung ${original.invoice_number} vom ${fmt(original.date)} und hebt diese vollständig auf.`;
  } else if (isRevision && original) {
    const tail = stornoForRevision
      ? ` Die ursprüngliche Rechnung wurde mit Stornorechnung ${stornoForRevision.invoice_number} aufgehoben.`
      : '';
    referenceLine = `Korrigierte Rechnung zu Rechnung ${original.invoice_number} vom ${fmt(original.date)}.${tail}`;
  }

  const displayGreeting = [referenceLine, invoice.greeting ?? '']
    .filter(s => s && s.trim().length > 0)
    .join('\n\n');

  return { isStorno, isRevision, docTitle, displayGreeting };
}

// ── Component ─────────────────────────────────────────────────

export default function PrintInvoicePage() {
  const params = useParams();
  const id     = params?.id as string;

  const [invoice,  setInvoice]  = useState<Invoice | null>(null);
  const [acontos,  setAcontos]  = useState<Invoice[]>([]);
  const [original, setOriginal] = useState<Invoice | null>(null);
  const [stornoForRevision, setStornoForRevision] = useState<Invoice | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [pages,    setPages]    = useState<PageData[] | null>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  // ── Step 1: fetch ──────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    SupabaseService.fetchInvoice(id).then(async data => {
      setInvoice(data);
      if (data?.aconto_invoice_ids?.length) {
        const linked = await SupabaseService.fetchInvoicesByIds(data.aconto_invoice_ids);
        setAcontos(linked);
      }
      // For storno/revision docs, fetch the directly-corrected original
      // so we can render its number and date in the reference line.
      const targetId = data?.corrects_invoice_id ?? data?.revision_of_invoice_id ?? null;
      if (targetId) {
        const orig = await SupabaseService.fetchInvoice(targetId);
        setOriginal(orig);
        // For a revision, also fetch the storno that cancelled the original
        // so we can mention it in the reference text.
        if (data?.document_type === InvoiceDocumentType.RevisionInvoice && orig?.storno_invoice_id) {
          const storno = await SupabaseService.fetchInvoice(orig.storno_invoice_id);
          setStornoForRevision(storno);
        }
      }
      setLoading(false);
    });
  }, [id]);

  // ── Step 2: measure then paginate ──────────────────────────
  useEffect(() => {
    if (!invoice || loading || !measureRef.current) return;

    const container = measureRef.current;
    const measure = (key: string): number => {
      const el = container.querySelector(`[data-m="${key}"]`) as HTMLElement | null;
      return el ? el.offsetHeight : 0;
    };

    document.fonts.ready.then(() => {
      const items    = invoice.items ?? [];
      const subtotal = invoice.total ?? items.reduce((s, i) => s + i.total, 0);
      const acontoDeductionTotal = acontos.reduce((s, a) => s + (a.total ?? 0), 0);
      const total    = subtotal - acontoDeductionTotal;
      const { displayGreeting } = deriveDocMeta(invoice, original, stornoForRevision);

      // Build measured block list
      const blocks: Block[] = [];

      if (displayGreeting) {
        blocks.push({ kind: 'greeting',     id: 'greeting',     heightPx: measure('greeting') });
      }
      const tableHeaderH = measure('tableHeader');

      items.forEach((_, i) => {
        blocks.push({ kind: 'item', id: `item-${i}`, heightPx: measure(`item-${i}`), itemIndex: i });
      });

      blocks.push({ kind: 'totals',  id: 'totals',  heightPx: measure('totals')  });
      blocks.push({ kind: 'legal',   id: 'legal',   heightPx: measure('legal')   });
      blocks.push({ kind: 'payment', id: 'payment', heightPx: measure('payment') });

      void total; // used inside measurement divs below

      setPages(paginate(blocks, tableHeaderH, BODY_H_PX));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice, acontos, original, stornoForRevision, loading]);

  // ── Step 3: trigger print ──────────────────────────────────
  useEffect(() => {
    if (!pages || !invoice) return;
    document.title = [invoice.invoice_number, invoice.reference, invoice.recipient_name].filter(Boolean).join('-');
    const t = setTimeout(() => window.print(), 700);
    return () => clearTimeout(t);
  }, [pages, invoice]);

  // ── Early returns ──────────────────────────────────────────
  if (loading || !invoice)
    return <div style={{ padding: 40, fontFamily: 'sans-serif' }}>Loading…</div>;

  const items    = invoice.items ?? [];
  const subtotal = invoice.total ?? items.reduce((s, i) => s + i.total, 0);
  const acontoDeductionTotal = acontos.reduce((s, a) => s + (a.total ?? 0), 0);
  const total    = subtotal - acontoDeductionTotal;
  const period   = fmtPeriod(invoice.service_period_start, invoice.service_period_end);
  const totalPages = pages?.length ?? 1;

  const { isStorno, docTitle, displayGreeting } = deriveDocMeta(invoice, original, stornoForRevision);

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
        Print / Save PDF
      </button>

      {/* ── Hidden measurement container ──────────────────────
          Rendered only before pages are computed. Every block
          type is rendered here with identical styles so that
          offsetHeight gives accurate pixel measurements.
      ────────────────────────────────────────────────────── */}
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
            <TotalsBlock subtotal={subtotal} acontos={acontos} total={total} />
          </div>

          <div data-m="legal">
            <LegalNotes />
          </div>

          <div data-m="payment">
            {isStorno
              ? <StornoFootnote reason={invoice.storno_reason} />
              : <PaymentBlock total={total} dueDate={invoice.due_date} />}
          </div>
        </div>
      )}

      {/* ── Paginated output ───────────────────────────────── */}
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
                  return <TotalsBlock key={block.id} subtotal={subtotal} acontos={acontos} total={total} />;
                case 'legal':
                  return <LegalNotes key={block.id} />;
                case 'payment':
                  return isStorno
                    ? <StornoFootnote key={block.id} reason={invoice.storno_reason} />
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
