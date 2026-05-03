'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { useInvoiceStore } from '@/lib/stores/invoice-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { CompactInvoiceListItem } from '@/components/invoices/compact-invoice-list-item';
import { AddInvoiceDialog } from '@/components/invoices/add-invoice-dialog';
import { InvoiceDetailPanel } from '@/components/invoices/invoice-detail-panel';
import type { Invoice } from '@/lib/types/models';

export default function InvoicesPage() {
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

  return (
    <MainLayout>
      <div className="relative flex h-full flex-col">
        <div className="border-b px-4 py-3 shrink-0 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
              disabled={!!selectedInvoice}
            />
          </div>
          {canCreate && (
            <Button onClick={() => setIsAddDialogOpen(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New Invoice
            </Button>
          )}
        </div>

        {selectedInvoice ? (
          <div className="flex-1 overflow-hidden">
            <InvoiceDetailPanel
              invoice={selectedInvoice}
              onClose={() => setSelectedInvoice(null)}
              onDeleted={() => setSelectedInvoice(null)}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-lg text-gray-500">Loading...</div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2">
                <p className="text-lg text-gray-500">
                  {searchQuery ? 'No invoices found' : 'No invoices yet'}
                </p>
                {!searchQuery && canCreate && (
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create your first invoice
                  </Button>
                )}
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-[1.5fr_2fr_1fr_1fr_1fr] gap-3 px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b sticky top-0 z-10">
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Number</div>
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Recipient</div>
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Date</div>
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Total</div>
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Status</div>
                </div>
                {filtered.map(inv => (
                  <CompactInvoiceListItem
                    key={inv.id}
                    invoice={inv}
                    onSelect={handleSelect}
                    isSelected={selectedInvoiceId === inv.id}
                  />
                ))}
              </div>
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
