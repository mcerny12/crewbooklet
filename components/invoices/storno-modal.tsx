'use client';

import { useEffect, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import type { Invoice, InvoiceAcontoApplication } from '@/lib/types/models';
import { SupabaseService } from '@/lib/services/supabase-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, X } from 'lucide-react';
import { format as formatDate } from 'date-fns';

type Mode = 'full_storno' | 'correct_with_revision';
const DOCUMENT_LABELS = ['Stornorechnung', 'Rechnungskorrektur', 'Gutschrift'] as const;
type DocumentLabel = (typeof DOCUMENT_LABELS)[number];

interface StornoModalProps {
  invoice: Invoice;
  onClose: () => void;
  onCompleted: (result: { storno: Invoice; revision?: Invoice | null }) => void;
}

export function StornoModal({ invoice, onClose, onCompleted }: StornoModalProps) {
  const t = useTranslations('invoices.storno');
  const tInvoices = useTranslations('invoices');
  const tCommon = useTranslations('common');
  const format = useFormatter();

  const [mode, setMode] = useState<Mode>('full_storno');
  const [docLabel, setDocLabel] = useState<DocumentLabel>('Stornorechnung');
  const [reason, setReason] = useState('');
  const [stornoDate, setStornoDate] = useState(formatDate(new Date(), 'yyyy-MM-dd'));
  const [previewStornoNumber, setPreviewStornoNumber] = useState<string>('…');
  const [previewRevisionNumber, setPreviewRevisionNumber] = useState<string>('…');
  const [appliedAcontos, setAppliedAcontos] = useState<InvoiceAcontoApplication[]>(
    invoice.aconto_applications ?? []
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, r] = await Promise.all([
          SupabaseService.getNextStornoInvoiceNumber(invoice.invoice_number),
          SupabaseService.getNextRevisionInvoiceNumber(invoice.invoice_number),
        ]);
        if (cancelled) return;
        setPreviewStornoNumber(s);
        setPreviewRevisionNumber(r.number);
      } catch (err) {
        console.error('Failed to preview storno/revision numbers:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [invoice.invoice_number]);

  useEffect(() => {
    if (invoice.aconto_applications !== undefined) return;
    let cancelled = false;
    SupabaseService.fetchInvoiceAcontoApplications(invoice.id)
      .then(apps => { if (!cancelled) setAppliedAcontos(apps); })
      .catch(err => console.error('Failed to fetch aconto applications for storno modal:', err));
    return () => { cancelled = true; };
  }, [invoice.id, invoice.aconto_applications]);

  const formatCurrency = (n: number) => format.number(n, { style: 'currency', currency: 'EUR' });

  const isPaid = invoice.status === 'paid';

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (mode === 'full_storno') {
        const storno = await SupabaseService.createInvoiceStorno({
          invoiceId: invoice.id,
          documentLabel: docLabel,
          reason: reason.trim() || null,
          stornoDate: stornoDate || null,
        });
        onCompleted({ storno });
      } else {
        const { storno, revision } = await SupabaseService.createStornoAndRevision({
          invoiceId: invoice.id,
          documentLabel: docLabel,
          reason: reason.trim() || null,
          stornoDate: stornoDate || null,
        });
        onCompleted({ storno, revision });
      }
    } catch (err) {
      console.error('Storno creation failed:', err);
      setError(err instanceof Error ? err.message : t('submitFailed'));
      setSubmitting(false);
    }
  };

  const docLabelLabel = (label: DocumentLabel) => t(`documentLabels.${label}`);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h2 className="text-base font-semibold">{t('title')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label={tCommon('close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {isPaid && (
            <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div
                dangerouslySetInnerHTML={{ __html: t.raw('paidWarning') as string }}
              />
            </div>
          )}

          {appliedAcontos.length > 0 && (
            <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-700" />
              <div className="space-y-2">
                <div>{t('acontosNoticeIntro')}</div>
                <ul className="list-disc pl-4 space-y-0.5">
                  {appliedAcontos.map(app => (
                    <li key={app.id}>
                      {t.rich('acontoLine', {
                        number: () => <strong>{app.source_invoice_number}</strong>,
                        dateSuffix: app.source_invoice_date ? t('acontosDateSuffix', { date: app.source_invoice_date }) : '',
                        amount: formatCurrency(app.applied_amount ?? 0),
                      })}
                    </li>
                  ))}
                </ul>
                <div
                  dangerouslySetInnerHTML={{ __html: t.raw('acontosNoticeAfter') as string }}
                />
                {mode === 'correct_with_revision' && (
                  <div>{t('acontosNoticeRevision')}</div>
                )}
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
              {t('modeLabel')}
            </Label>
            <div className="space-y-2">
              <label className="flex items-start gap-2 cursor-pointer rounded-md border p-3 hover:bg-accent/30">
                <input
                  type="radio"
                  name="mode"
                  value="full_storno"
                  checked={mode === 'full_storno'}
                  onChange={() => setMode('full_storno')}
                  className="mt-0.5"
                />
                <div className="text-sm">
                  <div className="font-medium">{t('modeFullStorno')}</div>
                  <div className="text-xs text-muted-foreground">
                    {t('modeFullStornoDescription', { status: tInvoices('status.cancelled') })}
                  </div>
                </div>
              </label>
              <label className="flex items-start gap-2 cursor-pointer rounded-md border p-3 hover:bg-accent/30">
                <input
                  type="radio"
                  name="mode"
                  value="correct_with_revision"
                  checked={mode === 'correct_with_revision'}
                  onChange={() => setMode('correct_with_revision')}
                  className="mt-0.5"
                />
                <div className="text-sm">
                  <div className="font-medium">{t('modeCorrectWithRevision')}</div>
                  <div className="text-xs text-muted-foreground">
                    {t('modeCorrectWithRevisionDescription')}
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">{t('pdfLabel')}</Label>
              <Select value={docLabel} onValueChange={v => setDocLabel(v as DocumentLabel)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOCUMENT_LABELS.map(l => (
                    <SelectItem key={l} value={l} className="text-sm">{docLabelLabel(l)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {docLabel === 'Gutschrift' && (
                <p className="text-[11px] text-amber-700 mt-1">
                  {t('pdfLabelHint')}
                </p>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">{t('stornoDate')}</Label>
              <Input
                type="date"
                value={stornoDate}
                onChange={e => setStornoDate(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">{t('reasonLabel')}</Label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={t('reasonPlaceholder')}
              className="text-sm min-h-16"
            />
          </div>

          <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('originalInvoice')}</span>
              <span className="font-medium">{invoice.invoice_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('newStornoNumber')}</span>
              <span className="font-medium">{previewStornoNumber}</span>
            </div>
            {mode === 'correct_with_revision' && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('newRevisionNumber')}</span>
                <span className="font-medium">{previewRevisionNumber}</span>
              </div>
            )}
          </div>

          <ul className="text-[11px] text-muted-foreground space-y-1 list-disc pl-4">
            <li>{(t.raw('footerNotesLines') as string[])[0]}</li>
            <li>{(t.raw('footerNotesLines') as string[])[1]}</li>
            {mode === 'correct_with_revision' && (
              <li>{(t.raw('footerNotesLines') as string[])[2]}</li>
            )}
          </ul>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t">
          <Button variant="ghost" onClick={onClose} disabled={submitting} className="h-8 text-sm">
            {tCommon('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="h-8 text-sm">
            {submitting
              ? t('submitting')
              : mode === 'full_storno' ? t('submit') : t('submitWithRevision')}
          </Button>
        </div>
      </div>
    </div>
  );
}
