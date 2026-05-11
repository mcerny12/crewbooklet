'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Invoice, InvoiceItem, InvoiceAttachment } from '@/lib/types/models';
import { InvoiceStatus } from '@/lib/types/models';
import { SupabaseService } from '@/lib/services/supabase-service';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInvoiceStore } from '@/lib/stores/invoice-store';
import { useProjectsStore } from '@/lib/stores/projects-store';
import { useOrganizationsStore } from '@/lib/stores/organizations-store';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronLeft, Trash2, Plus, Printer, X, Paperclip, Download, FileText } from 'lucide-react';
import { format, addDays } from 'date-fns';

interface InvoiceDetailPanelProps {
  invoice: Invoice;
  onClose: () => void;
  onDeleted: () => void;
}

function toDateInput(d: string | null | undefined): string {
  if (!d) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  try { return format(new Date(d), 'yyyy-MM-dd'); } catch { return ''; }
}

function calcTotal(items: InvoiceItem[]): number {
  return items.reduce((sum, i) => sum + i.total, 0);
}

function calcItemTotal(qty: number, price: number, tax: number): number {
  return parseFloat((qty * price * (1 + tax / 100)).toFixed(2));
}

function dueDateFrom(dateStr: string): string {
  return format(addDays(new Date(dateStr), 30), 'yyyy-MM-dd');
}

const STATUS_OPTIONS = Object.values(InvoiceStatus);

function fmtFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentRow({
  att, onDownload, onDelete, showLabel,
}: {
  att: InvoiceAttachment;
  onDownload: (a: InvoiceAttachment) => void;
  onDelete: (a: InvoiceAttachment) => void;
  showLabel?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-2 py-1">
      <FileText className="h-3 w-3 text-gray-400 shrink-0" />
      <div className="flex-1 min-w-0">
        {showLabel && att.label && <div className="text-[9px] text-gray-400 truncate">{att.label}</div>}
        <div className="text-xs truncate">{att.file_name}</div>
        {att.file_size && <div className="text-[9px] text-gray-400">{fmtFileSize(att.file_size)}</div>}
      </div>
      <button type="button" onClick={() => onDownload(att)} className="text-gray-400 hover:text-gray-700 shrink-0" title="Download">
        <Download className="h-3 w-3" />
      </button>
      <button type="button" onClick={() => onDelete(att)} className="text-gray-400 hover:text-red-600 shrink-0" title="Remove">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export function InvoiceDetailPanel({ invoice, onClose, onDeleted }: InvoiceDetailPanelProps) {
  const [edited, setEdited] = useState<Invoice>({ ...invoice, items: invoice.items ?? [] });
  const [items, setItems] = useState<InvoiceItem[]>(invoice.items ?? []);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastIdRef = useRef<string>(invoice.id);

  const [attachments, setAttachments] = useState<InvoiceAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingLabelRef = useRef<string | null>(null);

  const updateInvoice = useInvoiceStore(state => state.updateInvoice);
  const deleteInvoice = useInvoiceStore(state => state.deleteInvoice);
  const replaceItems   = useInvoiceStore(state => state.replaceItems);
  const allInvoices    = useInvoiceStore(state => state.invoices);
  const fetchInvoices  = useInvoiceStore(state => state.fetchInvoices);

  const projects        = useProjectsStore(state => state.projects);
  const fetchProjects   = useProjectsStore(state => state.fetchProjects);
  const organizations   = useOrganizationsStore(state => state.organizations);
  const fetchOrganizations = useOrganizationsStore(state => state.fetchOrganizations);

  useEffect(() => {
    if (projects.length === 0)      fetchProjects();
    if (organizations.length === 0) fetchOrganizations();
    if (allInvoices.length === 0)   fetchInvoices();
  }, []);

  useEffect(() => {
    SupabaseService.fetchInvoiceAttachments(invoice.id).then(setAttachments).catch(console.error);
  }, [invoice.id]);

  // Reset when switching to a different invoice
  useEffect(() => {
    if (invoice.id !== lastIdRef.current) {
      lastIdRef.current = invoice.id;
      setEdited({ ...invoice, items: invoice.items ?? [] });
      setItems(invoice.items ?? []);
    }
  }, [invoice.id]);

  const scheduleSave = useCallback((data: Invoice, currentItems: InvoiceItem[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await updateInvoice(data.id, { ...data, total: calcTotal(currentItems), items: undefined });
      } finally { setIsSaving(false); }
    }, 1000);
  }, [updateInvoice]);

  const scheduleItemsSave = useCallback((newItems: InvoiceItem[]) => {
    if (itemsTimerRef.current) clearTimeout(itemsTimerRef.current);
    itemsTimerRef.current = setTimeout(async () => {
      const total = calcTotal(newItems);
      await replaceItems(edited.id, newItems.map(({ id: _id, ...rest }) => rest as Omit<InvoiceItem, 'id'>));
      await updateInvoice(edited.id, { total });
    }, 1000);
  }, [replaceItems, updateInvoice, edited.id]);

  const handleChange = (field: keyof Invoice, value: Invoice[keyof Invoice]) => {
    const next = { ...edited, [field]: value };
    setEdited(next);
    scheduleSave(next, items);
  };

  // When invoice date changes, auto-recalculate due date (+30 days)
  const handleDateChange = (newDate: string) => {
    const next = { ...edited, date: newDate || null, due_date: newDate ? dueDateFrom(newDate) : null };
    setEdited(next);
    scheduleSave(next, items);
  };

  // Auto-fill recipient from project's client org
  const handleProjectChange = (projectId: string | null) => {
    const project = projects.find(p => p.id === projectId);
    const org = project?.client_organization_id
      ? organizations.find(o => o.id === project.client_organization_id)
      : null;
    const updates: Partial<Invoice> = { project_id: projectId };
    if (org) {
      updates.recipient_name    = org.name_invoice || org.name;
      updates.recipient_street  = org.street_invoice  || org.street  || undefined;
      updates.recipient_zip     = org.zip_invoice     || org.zip     || undefined;
      updates.recipient_city    = org.city_invoice    || org.city    || undefined;
      updates.recipient_country = org.country_invoice || org.country || undefined;
    }
    if (project) updates.reference = `${project.project_number} / ${project.name}`;
    const next = { ...edited, ...updates };
    setEdited(next);
    scheduleSave(next, items);
  };

  const triggerUpload = (label: string | null) => {
    pendingLabelRef.current = label;
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const att = await SupabaseService.uploadInvoiceAttachment(edited.id, file, pendingLabelRef.current);
      setAttachments(prev => [...prev, att]);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
      pendingLabelRef.current = null;
      e.target.value = '';
    }
  };

  const handleDownloadAttachment = async (att: InvoiceAttachment) => {
    try {
      const url = await SupabaseService.getAttachmentDownloadUrl(att.file_path);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handleDeleteAttachment = async (att: InvoiceAttachment) => {
    await SupabaseService.deleteInvoiceAttachment(att.id, att.file_path);
    setAttachments(prev => prev.filter(a => a.id !== att.id));
  };

  const handleItemChange = (idx: number, field: keyof InvoiceItem, value: InvoiceItem[keyof InvoiceItem]) => {
    const newItems = items.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      if (['quantity', 'unit_price', 'tax_rate'].includes(field as string)) {
        updated.total = calcItemTotal(
          (field === 'quantity'   ? value : updated.quantity)   as number,
          (field === 'unit_price' ? value : updated.unit_price) as number,
          (field === 'tax_rate'   ? value : updated.tax_rate)   as number,
        );
      }
      return updated;
    });
    setItems(newItems);
    scheduleItemsSave(newItems);
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: `temp-${Date.now()}`,
      invoice_id: edited.id,
      sort_order: items.length,
      description: '',
      sub_description: '',
      quantity: 1,
      unit_price: 0,
      tax_rate: 0,
      total: 0,
    };
    const newItems = [...items, newItem];
    setItems(newItems);
    scheduleItemsSave(newItems);
  };

  const removeItem = (idx: number) => {
    const newItems = items
      .filter((_, i) => i !== idx)
      .map((item, i) => ({ ...item, sort_order: i }));
    setItems(newItems);
    scheduleItemsSave(newItems);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete invoice ${edited.invoice_number}?`)) return;
    await deleteInvoice(edited.id);
    onDeleted();
  };

  const totalAmount = calcTotal(items);
  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);

  const linkedAcontoIds = edited.aconto_invoice_ids ?? [];
  const linkedAcontos = allInvoices.filter(inv => linkedAcontoIds.includes(inv.id));
  const acontoDeductionTotal = linkedAcontos.reduce((sum, inv) => sum + (inv.total ?? 0), 0);
  const amountDue = totalAmount - acontoDeductionTotal;

  // Aconto invoices available to link: marked as aconto, same project or recipient, not self
  const availableAcontos = allInvoices.filter(inv =>
    inv.is_aconto === true &&
    inv.id !== edited.id &&
    (
      (edited.project_id && inv.project_id === edited.project_id) ||
      (edited.recipient_name && inv.recipient_name === edited.recipient_name)
    )
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b px-4 py-2 shrink-0">
        <Button variant="ghost" size="sm" onClick={onClose} className="gap-1 text-xs">
          <ChevronLeft className="h-3 w-3" />Back
        </Button>
        <div className="flex-1" />
        <span className="text-xs text-gray-400">{isSaving ? 'Saving…' : 'Saved'}</span>
        <Button variant="outline" size="sm" onClick={() => window.open(`/invoices/${edited.id}/print`, '_blank')} className="gap-1 text-xs">
          <Printer className="h-3 w-3" />Print / PDF
        </Button>
        <Button variant="ghost" size="sm" onClick={handleDelete} className="text-red-600 hover:text-red-700 text-xs gap-1">
          <Trash2 className="h-3 w-3" />Delete
        </Button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Number + status + aconto flag */}
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-xl font-bold">{edited.invoice_number}</h1>
          <Select value={edited.status} onValueChange={v => handleChange('status', v)}>
            <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(s => (
                <SelectItem key={s} value={s} className="text-xs">
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <Checkbox
              checked={!!edited.is_aconto}
              onCheckedChange={checked => handleChange('is_aconto', !!checked)}
              className="h-3.5 w-3.5"
            />
            <span className="text-xs text-gray-600">Aconto invoice</span>
          </label>
        </div>

        {/* Two-column: recipient | dates */}
        <div className="grid grid-cols-2 gap-6">

          {/* Left: project + recipient */}
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Project</Label>
              <SearchableSelect
                options={projects.map(p => ({ id: p.id, label: p.name, sublabel: p.project_number }))}
                value={edited.project_id ?? null}
                onChange={handleProjectChange}
                placeholder="Link to project..."
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Recipient</Label>
              <div className="space-y-2">
                <Input value={edited.recipient_name ?? ''} onChange={e => handleChange('recipient_name', e.target.value)} placeholder="Company / Name" className="h-8 text-sm" />
                <Input value={edited.recipient_contact ?? ''} onChange={e => handleChange('recipient_contact', e.target.value)} placeholder="Contact person" className="h-8 text-sm" />
                <Input value={edited.recipient_street ?? ''} onChange={e => handleChange('recipient_street', e.target.value)} placeholder="Street" className="h-8 text-sm" />
                <div className="grid grid-cols-3 gap-2">
                  <Input value={edited.recipient_zip ?? ''} onChange={e => handleChange('recipient_zip', e.target.value)} placeholder="ZIP" className="h-8 text-sm" />
                  <Input value={edited.recipient_city ?? ''} onChange={e => handleChange('recipient_city', e.target.value)} placeholder="City" className="h-8 text-sm col-span-2" />
                </div>
                <Input value={edited.recipient_country ?? ''} onChange={e => handleChange('recipient_country', e.target.value)} placeholder="Country" className="h-8 text-sm" />
              </div>
            </div>
          </div>

          {/* Right: dates + meta */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">Invoice Date</Label>
                <Input type="date" value={toDateInput(edited.date)} onChange={e => handleDateChange(e.target.value)} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">Due Date <span className="text-gray-400 font-normal">(auto +30d)</span></Label>
                <Input type="date" value={toDateInput(edited.due_date)} onChange={e => handleChange('due_date', e.target.value || null)} className="h-8 text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">Service Period From</Label>
                <Input type="date" value={toDateInput(edited.service_period_start)} onChange={e => handleChange('service_period_start', e.target.value || null)} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">To</Label>
                <Input type="date" value={toDateInput(edited.service_period_end)} onChange={e => handleChange('service_period_end', e.target.value || null)} className="h-8 text-sm" />
              </div>
            </div>

            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Reference</Label>
              <Input value={edited.reference ?? ''} onChange={e => handleChange('reference', e.target.value)} placeholder="e.g. P26015 / Project Name" className="h-8 text-sm" />
            </div>

            <div>
              <Label className="text-xs text-gray-500 mb-1 block">UID Empfänger</Label>
              <Input value={edited.uid_recipient ?? ''} onChange={e => handleChange('uid_recipient', e.target.value)} placeholder="VAT ID of recipient" className="h-8 text-sm" />
            </div>
          </div>
        </div>

        {/* Greeting (replaces separate greeting + intro) */}
        <div>
          <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Greeting & Opening</Label>
          <Textarea
            value={edited.greeting ?? ''}
            onChange={e => handleChange('greeting', e.target.value)}
            placeholder={'e.g.\nLieber Niklas,\n\nfür meine Leistungen berechne ich wie folgt'}
            className="text-sm min-h-20"
          />
        </div>

        {/* Line Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Line Items</Label>
            <Button variant="outline" size="sm" onClick={addItem} className="h-7 text-xs gap-1">
              <Plus className="h-3 w-3" />Add Item
            </Button>
          </div>

          <div className="border rounded overflow-hidden">
            <div className="grid grid-cols-[3fr_1fr_1.2fr_0.8fr_1fr_28px] gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 text-xs font-semibold text-gray-500 border-b">
              <div>Description</div><div>Qty</div><div>Unit Price</div><div>Tax %</div><div>Total</div><div />
            </div>

            {items.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-gray-400">No items yet — click Add Item</div>
            )}

            {items.map((item, idx) => (
              <div key={item.id} className="border-b last:border-b-0">
                <div className="grid grid-cols-[3fr_1fr_1.2fr_0.8fr_1fr_28px] gap-2 px-3 py-1.5 items-center">
                  <Input value={item.description} onChange={e => handleItemChange(idx, 'description', e.target.value)} placeholder="Description" className="h-7 text-xs" />
                  <Input type="number" value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)} className="h-7 text-xs" min={0} step={0.5} />
                  <Input type="number" value={item.unit_price} onChange={e => handleItemChange(idx, 'unit_price', parseFloat(e.target.value) || 0)} className="h-7 text-xs" min={0} step={0.01} />
                  <Input type="number" value={item.tax_rate} onChange={e => handleItemChange(idx, 'tax_rate', parseFloat(e.target.value) || 0)} className="h-7 text-xs" min={0} max={100} />
                  <div className="text-xs font-medium text-right">{formatCurrency(item.total)}</div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-red-600" onClick={() => removeItem(idx)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="px-3 pb-1.5 flex items-center gap-2">
                  <Input value={item.sub_description ?? ''} onChange={e => handleItemChange(idx, 'sub_description', e.target.value)} placeholder="Sub-description (optional)" className="flex-1 h-6 text-xs text-gray-500 border-dashed" />
                  <button
                    type="button"
                    title="Attach file to this item"
                    onClick={() => triggerUpload(item.description || `Item ${idx + 1}`)}
                    className={`shrink-0 flex items-center gap-0.5 text-xs rounded px-1 py-0.5 transition-colors ${
                      attachments.filter(a => a.label === (item.description || `Item ${idx + 1}`)).length > 0
                        ? 'text-blue-600 bg-blue-50 dark:bg-blue-950'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <Paperclip className="h-3 w-3" />
                    {attachments.filter(a => a.label === (item.description || `Item ${idx + 1}`)).length > 0 && (
                      <span>{attachments.filter(a => a.label === (item.description || `Item ${idx + 1}`)).length}</span>
                    )}
                  </button>
                </div>
              </div>
            ))}

            <div className="grid grid-cols-[3fr_1fr_1.2fr_0.8fr_1fr_28px] gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 items-center border-t">
              <div className="col-span-4 text-xs font-semibold text-right text-gray-600">
                {linkedAcontos.length > 0 ? 'Subtotal' : 'Total'}
              </div>
              <div className="text-sm font-bold text-right">{formatCurrency(totalAmount)}</div>
              <div />
            </div>
            {linkedAcontos.map(aconto => (
              <div key={aconto.id} className="grid grid-cols-[3fr_1fr_1.2fr_0.8fr_1fr_28px] gap-2 px-3 py-1 bg-amber-50 dark:bg-amber-950/20 items-center">
                <div className="col-span-4 text-xs text-right text-amber-700 dark:text-amber-400">
                  Aconto {aconto.invoice_number}
                </div>
                <div className="text-xs font-medium text-right text-amber-700 dark:text-amber-400">
                  -{formatCurrency(aconto.total ?? 0)}
                </div>
                <div />
              </div>
            ))}
            {linkedAcontos.length > 0 && (
              <div className="grid grid-cols-[3fr_1fr_1.2fr_0.8fr_1fr_28px] gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 items-center border-t-2 border-gray-300">
                <div className="col-span-4 text-xs font-semibold text-right text-gray-700">Amount Due</div>
                <div className="text-sm font-bold text-right">{formatCurrency(amountDue)}</div>
                <div />
              </div>
            )}
          </div>
        </div>

        {/* Aconto deduction linking (only for non-aconto final invoices) */}
        {!edited.is_aconto && (
          <div>
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
              Deduct Aconto Invoices
            </Label>
            {availableAcontos.length === 0 ? (
              <p className="text-xs text-gray-400 italic">
                No aconto invoices found for this project or recipient. Mark an invoice as &quot;Aconto invoice&quot; first.
              </p>
            ) : (
              <div className="space-y-1.5 border rounded p-3">
                {availableAcontos.map(aconto => (
                  <label key={aconto.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={linkedAcontoIds.includes(aconto.id)}
                      onCheckedChange={checked => {
                        const newIds = checked
                          ? [...linkedAcontoIds, aconto.id]
                          : linkedAcontoIds.filter(id => id !== aconto.id);
                        handleChange('aconto_invoice_ids', newIds);
                      }}
                      className="h-3.5 w-3.5"
                    />
                    <span className="text-xs">
                      {aconto.invoice_number}
                      {aconto.total != null && (
                        <span className="text-gray-500 ml-1">— {formatCurrency(aconto.total)}</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Attachments */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Attachments</Label>
            <button
              type="button"
              onClick={() => triggerUpload(null)}
              disabled={uploading}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 disabled:opacity-50"
            >
              <Paperclip className="h-3 w-3" />
              {uploading ? 'Uploading…' : 'Attach to invoice'}
            </button>
          </div>

          {attachments.length === 0 && (
            <div className="text-xs text-gray-400 italic">No attachments yet</div>
          )}

          {/* Invoice-level */}
          {attachments.filter(a => !a.label).map(att => (
            <div key={att.id} className="mb-1">
              <AttachmentRow att={att} onDownload={handleDownloadAttachment} onDelete={handleDeleteAttachment} />
            </div>
          ))}

          {/* Item-level */}
          {attachments.filter(a => !!a.label).length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Item attachments</div>
              {attachments.filter(a => !!a.label).map(att => (
                <AttachmentRow key={att.id} att={att} onDownload={handleDownloadAttachment} onDelete={handleDeleteAttachment} showLabel />
              ))}
            </div>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls,.csv"
          className="hidden"
          onChange={handleFileSelected}
        />

      </div>
    </div>
  );
}
