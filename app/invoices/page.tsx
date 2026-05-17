'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { MainLayout } from '@/components/layout/main-layout';
import { useInvoiceStore } from '@/lib/stores/invoice-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Plus, Search } from 'lucide-react';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { useIsMobile } from '@/lib/hooks/use-media-query';
import { MobilePageHeader } from '@/components/layout/mobile-page-header';
import { MobileDesktopOnlyPlaceholder } from '@/components/mobile/mobile-desktop-only-placeholder';
import { CompactInvoiceListItem } from '@/components/invoices/compact-invoice-list-item';
import { AddInvoiceDialog } from '@/components/invoices/add-invoice-dialog';
import { InvoiceDetailPanel } from '@/components/invoices/invoice-detail-panel';
import type { Invoice } from '@/lib/types/models';

function ListHeader() {
  const t = useTranslations('invoices.columns');
  const cols = ['number', 'recipient', 'date', 'total', 'status'] as const;
  return (
    <div
      aria-hidden
      className="sticky top-0 z-10 hidden md:grid items-center gap-3 bg-muted/60 px-5 py-2.5 border-b backdrop-blur-sm"
      style={{ gridTemplateColumns: '1.5fr 2fr 1fr 1fr 1fr' }}
    >
      {cols.map((col, i) => (
        <div
          key={col}
          className={`text-[11px] font-semibold text-muted-foreground uppercase tracking-wide ${i === 3 ? 'text-right' : ''}`}
        >
          {t(col)}
        </div>
      ))}
    </div>
  );
}

export default function InvoicesPage() {
  const t = useTranslations('invoices');
  const tCommon = useTranslations('common');
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const { canCreate } = usePermissions();

  const invoices = useInvoiceStore(state => state.invoices);
  const isLoading = useInvoiceStore(state => state.isLoading);
  const fetchInvoices = useInvoiceStore(state => state.fetchInvoices);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const filtered = invoices.filter(inv =>
    inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.recipient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.reference?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedInvoiceId = selectedInvoice?.id ?? null;

  const handleSelect = (inv: Invoice) => {
    setSelectedInvoice(prev => prev?.id === inv.id ? null : inv);
  };

  const handleCreated = (inv: Invoice) => {
    setSelectedInvoice(inv);
  };

  if (isMobile) {
    return (
      <MainLayout>
        <MobilePageHeader title={t('title')} />
        <MobileDesktopOnlyPlaceholder
          title={t('title')}
          description={t('searchInvoices')}
          actionHref="/"
          actionLabel={tCommon('back')}
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex h-full flex-col">
        <PageHeader
          title={t('title')}
          subtitle={invoices.length > 0 ? t('count', { count: invoices.length }) : undefined}
          search={
            !selectedInvoice ? (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  placeholder={t('searchInvoices')}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                  aria-label={t('searchInvoices')}
                />
              </div>
            ) : undefined
          }
          actions={
            canCreate ? (
              <Button onClick={() => setIsAddDialogOpen(true)} size="sm" className="h-9 gap-1.5">
                <Plus className="h-4 w-4" aria-hidden />
                {t('newInvoice')}
              </Button>
            ) : undefined
          }
        />

        {selectedInvoice ? (
          <div className="flex-1 overflow-hidden">
            <InvoiceDetailPanel
              invoice={selectedInvoice}
              onClose={() => setSelectedInvoice(null)}
              onDeleted={() => setSelectedInvoice(null)}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto min-h-0">
            {isLoading ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">{tCommon('loading')}</div>
            ) : filtered.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center gap-3">
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? t('noInvoicesMatch') : t('noInvoicesYet')}
                </p>
                {!searchQuery && canCreate && (
                  <Button variant="outline" size="sm" onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                    {t('addFirstInvoice')}
                  </Button>
                )}
              </div>
            ) : (
              <>
                <ListHeader />
                {filtered.map(inv => (
                  <CompactInvoiceListItem
                    key={inv.id}
                    invoice={inv}
                    onSelect={handleSelect}
                    isSelected={selectedInvoiceId === inv.id}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <AddInvoiceDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onCreated={handleCreated}
      />
    </MainLayout>
  );
}
