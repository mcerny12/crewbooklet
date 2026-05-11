'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { SupabaseService } from '@/lib/services/supabase-service';
import type { Invoice } from '@/lib/types/models';
import { format } from 'date-fns';

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

// ── Hardcoded sender details (from invtemp.pdf) ──
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

export default function PrintInvoicePage() {
  const params = useParams();
  const id = params?.id as string;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [acontos, setAcontos] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    SupabaseService.fetchInvoice(id).then(async data => {
      setInvoice(data);
      if (data?.aconto_invoice_ids?.length) {
        const linked = await SupabaseService.fetchInvoicesByIds(data.aconto_invoice_ids);
        setAcontos(linked);
      }
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (!loading && invoice) {
      const parts = [
        invoice.invoice_number,
        invoice.reference,
        invoice.recipient_name,
      ].filter(Boolean);
      document.title = parts.join('-');
      const t = setTimeout(() => window.print(), 500);
      return () => clearTimeout(t);
    }
  }, [loading, invoice]);

  if (loading) return <div style={{ padding: 40, fontFamily: 'sans-serif' }}>Loading…</div>;
  if (!invoice) return <div style={{ padding: 40, fontFamily: 'sans-serif' }}>Invoice not found.</div>;

  const items = invoice.items ?? [];
  const subtotal = invoice.total ?? items.reduce((s, i) => s + i.total, 0);
  const acontoDeductionTotal = acontos.reduce((s, a) => s + (a.total ?? 0), 0);
  const total = subtotal - acontoDeductionTotal;
  const period = fmtPeriod(invoice.service_period_start, invoice.service_period_end);

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

        /* ─── PAGE ─── */
        .page {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
        }

        /* ─── HEADER (fixed height = position of separator line 1) ─── */
        .hdr {
          height: 104.9mm;
          position: relative;
          flex-shrink: 0;
        }

        .hdr-company {
          position: absolute;
          top: 12.0mm;
          left: 15.1mm;
          right: 15.1mm;
          display: flex;
          align-items: baseline;
          font-size: 9pt;
          line-height: 1;
        }
        .hdr-bold  { font-weight: 700; }
        .hdr-light { font-weight: 300; }

        /* Left column: small sender address + recipient */
        .hdr-left {
          position: absolute;
          top: 39.5mm;
          left: 15.1mm;
          width: 93mm;
        }
        .sender-small {
          font-size: 7.9pt;
          font-weight: 400;
          line-height: 1.3;
          padding-bottom: 1.5mm;
          margin-bottom: 2mm;
        }
        .rcpt-line {
          font-size: 9pt;
          font-weight: 400;
          line-height: 1.25;
        }

        /* Right column: Rechnung + metadata */
        .hdr-right {
          position: absolute;
          top: 33.2mm;
          left: 113.9mm;
          right: 15.1mm;
        }
        .rechnung-title {
          font-size: 9pt;
          font-weight: 700;
          margin-bottom: 2.6mm;
        }
        .meta-grid {
          display: grid;
          grid-template-columns: auto 1fr;
          column-gap: 3mm;
        }
        .ml, .mv {
          font-size: 9pt;
          font-weight: 400;
          line-height: 1.22;
        }
        .ml { white-space: nowrap; }
        .mv { text-align: right; }

        /* ─── SEPARATOR ─── */
        .sep {
          display: none;
        }

        /* ─── CONTENT ─── */
        .content {
          flex: 1;
          padding: 3mm 15.1mm 0;
          font-size: 9pt;
          font-weight: 400;
        }

        /* Greeting: white-space: pre-line handles newlines naturally */
        .greeting {
          white-space: pre-line;
          line-height: 1.5;
          margin-bottom: 4mm;
        }

        /* ─── TABLE ─── */
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9pt;
          font-weight: 400;
        }
        thead tr { border-bottom: 0.75pt solid #000; }
        thead th { font-weight: 400; padding-bottom: 2mm; text-align: left; }
        tbody tr { border-bottom: none; }
        td { padding: 2.2mm 0; vertical-align: top; }

        .c1 { width: 50%; text-align: left; }
        .c2 { width: 9%;  text-align: right; padding-right: 2mm; }
        .c3 { width: 16%; text-align: right; padding-right: 2mm; }
        .c4 { width: 10%; text-align: right; padding-right: 2mm; }
        .c5 { width: 15%; text-align: right; }

        .subdesc { font-size: 8.5pt; color: #222; margin-top: 0.5mm; }

        .total-row td {
          border-top: 0.75pt solid #000;
          border-bottom: none;
          padding-top: 2.5mm;
          padding-bottom: 2mm;
        }

        /* ─── FOOTER NOTES (hardcoded block) ─── */
        .fnotes {
          margin-top: 4mm;
          font-size: 9pt;
          line-height: 1.4;
        }
        .fnotes p { margin-bottom: 0; }
        .fnotes .gap { margin-top: 3.8mm; }

        /* ─── SPACER ─── */
        .spacer { flex: 1; }

        /* ─── BOTTOM BAR ─── */
        .bottom-bar {
          flex-shrink: 0;
          margin: 0 15.1mm;
          border-top: none;
          padding-top: 2mm;
          padding-bottom: 7mm;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          font-size: 6.6pt;
          font-weight: 300;
          color: #333;
        }
        .bb-info { line-height: 1.55; }
        .bb-r { font-size: 5.9pt; white-space: nowrap; }

        /* ─── SCREEN ONLY ─── */
        @media screen {
          body { background: #e0e0e0; }
          .page {
            background: #fff;
            box-shadow: 0 2px 32px rgba(0,0,0,0.22);
            margin: 20px auto;
          }
          .print-btn {
            position: fixed;
            top: 16px;
            right: 16px;
            padding: 9px 20px;
            background: #111;
            color: #fff;
            border: none;
            border-radius: 6px;
            font-size: 13px;
            font-family: system-ui, sans-serif;
            cursor: pointer;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            z-index: 999;
          }
        }
      `}</style>

      <button className="print-btn no-print" onClick={() => window.print()}>
        Print / Save PDF
      </button>

      <div className="page">

        {/* ─── HEADER ─── */}
        <div className="hdr">

          <div className="hdr-company">
            <span className="hdr-bold">{SENDER_BOLD}</span>
            <span className="hdr-light">&nbsp;&nbsp;|&nbsp;&nbsp;{SENDER_LIGHT}</span>
          </div>

          <div className="hdr-left">
            <div className="sender-small">{SENDER_BOLD}, {SENDER_ADDR}</div>
            {invoice.recipient_name    && <div className="rcpt-line">{invoice.recipient_name}</div>}
            {invoice.recipient_contact && <div className="rcpt-line">{invoice.recipient_contact}</div>}
            {invoice.recipient_street  && <div className="rcpt-line">{invoice.recipient_street}</div>}
            {(invoice.recipient_zip || invoice.recipient_city) && (
              <div className="rcpt-line">
                {[invoice.recipient_zip, invoice.recipient_city].filter(Boolean).join(' ')}
              </div>
            )}
            {invoice.recipient_country && <div className="rcpt-line">{invoice.recipient_country}</div>}
          </div>

          <div className="hdr-right">
            <div className="rechnung-title">Rechnung</div>
            <div className="meta-grid">
              {invoice.date && <>
                <span className="ml">Datum</span>
                <span className="mv">{fmt(invoice.date)}</span>
              </>}
              <span className="ml">Nummer</span>
              <span className="mv">{invoice.invoice_number}</span>
              {period && <>
                <span className="ml">Leistungszeitraum</span>
                <span className="mv">{period}</span>
              </>}
              {invoice.due_date && <>
                <span className="ml">Fälligkeitsdatum</span>
                <span className="mv">{fmt(invoice.due_date)}</span>
              </>}
              {invoice.reference && <>
                <span className="ml">Referenz</span>
                <span className="mv">{invoice.reference}</span>
              </>}
              <span className="ml">UID Empfänger</span>
              <span className="mv">{invoice.uid_recipient ?? ''}</span>
              <span className="ml" style={{ marginTop: '3mm' }}>T</span>
              <span className="mv" style={{ marginTop: '3mm' }}>{SENDER_PHONE}</span>
              <span className="ml">E</span>
              <span className="mv">{SENDER_EMAIL}</span>
            </div>
          </div>
        </div>

        {/* ─── SEPARATOR 1 ─── */}
        <hr className="sep" />

        {/* ─── CONTENT ─── */}
        <div className="content">

          {invoice.greeting && (
            <div className="greeting">{invoice.greeting}</div>
          )}

          <table>
            <thead>
              <tr>
                <th className="c1">Beschreibung</th>
                <th className="c2">Anzahl</th>
                <th className="c3">Einzelpreis</th>
                <th className="c4">Steuer</th>
                <th className="c5">Gesamt</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td className="c1">
                    {item.description}
                    {item.sub_description && (
                      <div className="subdesc">{item.sub_description}</div>
                    )}
                  </td>
                  <td className="c2">
                    {item.quantity % 1 === 0 ? item.quantity.toFixed(0) : item.quantity}
                  </td>
                  <td className="c3">{fmtCurrency(item.unit_price)}</td>
                  <td className="c4">{item.tax_rate > 0 ? `${item.tax_rate}%` : '0%'}</td>
                  <td className="c5">{fmtCurrency(item.total)}</td>
                </tr>
              ))}
              {acontos.length > 0 && (
                <tr className="total-row">
                  <td colSpan={4} style={{ textAlign: 'right', paddingRight: '4mm' }}>Zwischensumme</td>
                  <td className="c5">{fmtCurrency(subtotal)}</td>
                </tr>
              )}
              {acontos.map(aconto => (
                <tr key={aconto.id}>
                  <td colSpan={4} style={{ textAlign: 'right', paddingRight: '4mm' }}>
                    Abzgl. Akonto {aconto.invoice_number}
                  </td>
                  <td className="c5">-{fmtCurrency(aconto.total ?? 0)}</td>
                </tr>
              ))}
              <tr className="total-row">
                <td colSpan={4} style={{ textAlign: 'right', paddingRight: '4mm' }}>Gesamtbetrag</td>
                <td className="c5">{fmtCurrency(total)}</td>
              </tr>
            </tbody>
          </table>

          {/* ─── HARDCODED FOOTER NOTES ─── */}
          <div className="fnotes">
            <p>Der Leistungszeitraum, falls nicht anders angegeben, entspricht dem Rechnungsdatum.</p>
            <p className="gap">Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.</p>
            <p className="gap">
              Ich bitte um Überweisung von {fmtCurrency(total)} bis zum {fmt(invoice.due_date)} auf das angegebene Konto.
            </p>
            <p className="gap">Empfänger: {BANK_NAME}</p>
            <p>IBAN: {BANK_IBAN}</p>
            <p>BIC: {BANK_BIC}</p>
          </div>

        </div>

        <div className="spacer" />

        {/* ─── BOTTOM BAR ─── */}
        <div className="bottom-bar">
          <div className="bb-info">
            <div>{SENDER_BOLD}, {SENDER_ADDR}</div>
            <div>M {SENDER_PHONE}&nbsp;&nbsp;|&nbsp;&nbsp;{SENDER_EMAIL}&nbsp;&nbsp;|&nbsp;&nbsp;{SENDER_TAXNR}&nbsp;&nbsp;|&nbsp;&nbsp;{SENDER_KUIDNR}</div>
          </div>
          <div className="bb-r">page 1 of 1</div>
        </div>

      </div>
    </>
  );
}
