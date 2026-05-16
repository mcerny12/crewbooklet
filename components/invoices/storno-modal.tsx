'use client';

import { useEffect, useState } from 'react';
import type { Invoice, InvoiceAcontoApplication } from '@/lib/types/models';
import { SupabaseService } from '@/lib/services/supabase-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, X } from 'lucide-react';
import { format } from 'date-fns';

type Mode = 'full_storno' | 'correct_with_revision';
const DOCUMENT_LABELS = ['Stornorechnung', 'Rechnungskorrektur', 'Gutschrift'] as const;
type DocumentLabel = (typeof DOCUMENT_LABELS)[number];

interface StornoModalProps {
  invoice: Invoice;
  onClose: () => void;
  onCompleted: (result: { storno: Invoice; revision?: Invoice | null }) => void;
}

export function StornoModal({ invoice, onClose, onCompleted }: StornoModalProps) {
  const [mode, setMode] = useState<Mode>('full_storno');
  const [docLabel, setDocLabel] = useState<DocumentLabel>('Stornorechnung');
  const [reason, setReason] = useState('');
  const [stornoDate, setStornoDate] = useState(format(new Date(), 'yyyy-MM-dd'));
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

  // If the caller didn't pre-load applications, fetch them so the warning section is accurate.
  useEffect(() => {
    if (invoice.aconto_applications !== undefined) return;
    let cancelled = false;
    SupabaseService.fetchInvoiceAcontoApplications(invoice.id)
      .then(apps => { if (!cancelled) setAppliedAcontos(apps); })
      .catch(err => console.error('Failed to fetch aconto applications for storno modal:', err));
    return () => { cancelled = true; };
  }, [invoice.id, invoice.aconto_applications]);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);

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
      setError(err instanceof Error ? err.message : 'Unknown error creating Storno.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h2 className="text-base font-semibold">Storno / Rechnungskorrektur erstellen</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {isPaid && (
            <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                Diese Rechnung ist bereits als <strong>bezahlt</strong> markiert. Eine Storno wird
                buchhalterisch und ggf. die Rückerstattung an den Empfänger separat behandelt werden müssen.
              </div>
            </div>
          )}

          {appliedAcontos.length > 0 && (
            <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-700" />
              <div className="space-y-2">
                <div>
                  Diese Rechnung enthält Abzüge der folgenden Aconto-/Anzahlungsrechnungen:
                </div>
                <ul className="list-disc pl-4 space-y-0.5">
                  {appliedAcontos.map(app => (
                    <li key={app.id}>
                      <strong>{app.source_invoice_number}</strong>
                      {app.source_invoice_date && ` vom ${app.source_invoice_date}`}
                      {' — '}
                      Abzug {formatCurrency(app.applied_amount ?? 0)}
                    </li>
                  ))}
                </ul>
                <div>
                  Die Stornorechnung hebt den <em>Abzug</em> dieser Acontos auf der Originalrechnung
                  auf — die ursprünglichen Aconto-/Anzahlungsrechnungen <strong>selbst bleiben gültig</strong>
                  und werden nicht automatisch storniert. Falls eine dieser Aconto-Rechnungen
                  ebenfalls falsch ist, muss sie separat storniert/korrigiert werden.
                </div>
                {mode === 'correct_with_revision' && (
                  <div>
                    Auf die Revisionsrechnung werden diese Aconto-Abzüge automatisch übernommen.
                    Du kannst sie dort bearbeiten oder entfernen.
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
              Modus
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
                  <div className="font-medium">Vollständig stornieren</div>
                  <div className="text-xs text-muted-foreground">
                    Nur eine Stornorechnung wird erstellt. Die Originalrechnung wird auf <em>Storniert</em> gesetzt.
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
                  <div className="font-medium">Stornieren und korrigierte Rechnung erstellen</div>
                  <div className="text-xs text-muted-foreground">
                    Erzeugt zusätzlich eine bearbeitbare Revisionsrechnung mit allen Positionen kopiert.
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">PDF-Bezeichnung</Label>
              <Select value={docLabel} onValueChange={v => setDocLabel(v as DocumentLabel)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOCUMENT_LABELS.map(l => (
                    <SelectItem key={l} value={l} className="text-sm">{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {docLabel === 'Gutschrift' && (
                <p className="text-[11px] text-amber-700 mt-1">
                  Nur nutzen, wenn der Steuerberater dies explizit verlangt — &quot;Gutschrift&quot; ist im DACH-Raum mehrdeutig.
                </p>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Stornodatum</Label>
              <Input
                type="date"
                value={stornoDate}
                onChange={e => setStornoDate(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Grund (optional)</Label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="z.B. falscher Betrag, falscher Leistungszeitraum, falsche Empfängeradresse…"
              className="text-sm min-h-16"
            />
          </div>

          <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Originalrechnung</span>
              <span className="font-medium">{invoice.invoice_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Neue Stornonummer</span>
              <span className="font-medium">{previewStornoNumber}</span>
            </div>
            {mode === 'correct_with_revision' && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Neue Revisionsnummer</span>
                <span className="font-medium">{previewRevisionNumber}</span>
              </div>
            )}
          </div>

          <ul className="text-[11px] text-muted-foreground space-y-1 list-disc pl-4">
            <li>Die Originalrechnung wird nicht verändert und bleibt vollständig erhalten.</li>
            <li>Es wird ein neues Storno-Dokument mit umgekehrten Beträgen erstellt.</li>
            {mode === 'correct_with_revision' && (
              <li>Zusätzlich wird eine bearbeitbare Revisionsrechnung mit allen Positionen erzeugt.</li>
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
            Abbrechen
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="h-8 text-sm">
            {submitting
              ? 'Erstellt…'
              : mode === 'full_storno' ? 'Storno erstellen' : 'Storno + Revision erstellen'}
          </Button>
        </div>
      </div>
    </div>
  );
}
