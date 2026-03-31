/**
 * Invoice Store
 * Manages invoice state
 */

import { create } from 'zustand';
import type { Invoice, InvoiceItem } from '@/lib/types/models';
import { SupabaseService } from '@/lib/services/supabase-service';

interface InvoiceState {
  invoices: Invoice[];
  isLoading: boolean;
  error: string | null;

  fetchInvoices: () => Promise<void>;
  addInvoice: (invoice: Partial<Invoice>) => Promise<Invoice | null>;
  updateInvoice: (id: string, updates: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  replaceItems: (invoiceId: string, items: Omit<InvoiceItem, 'id'>[]) => Promise<InvoiceItem[]>;
}

export const useInvoiceStore = create<InvoiceState>((set, get) => ({
  invoices: [],
  isLoading: false,
  error: null,

  fetchInvoices: async () => {
    try {
      set({ isLoading: true, error: null });
      const invoices = await SupabaseService.fetchInvoices();
      set({ invoices, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch invoices',
        isLoading: false,
      });
    }
  },

  addInvoice: async (invoice: Partial<Invoice>) => {
    try {
      const newInvoice = await SupabaseService.addInvoice(invoice);
      if (newInvoice) {
        set(state => ({ invoices: [newInvoice, ...state.invoices] }));
      }
      return newInvoice;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to add invoice' });
      return null;
    }
  },

  updateInvoice: async (id: string, updates: Partial<Invoice>) => {
    try {
      const updated = await SupabaseService.updateInvoice(id, updates);
      if (updated) {
        set(state => ({
          invoices: state.invoices.map(inv => inv.id === id ? { ...inv, ...updated } : inv),
        }));
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update invoice' });
    }
  },

  deleteInvoice: async (id: string) => {
    try {
      await SupabaseService.deleteInvoice(id);
      set(state => ({ invoices: state.invoices.filter(inv => inv.id !== id) }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete invoice' });
    }
  },

  replaceItems: async (invoiceId: string, items: Omit<InvoiceItem, 'id'>[]) => {
    const newItems = await SupabaseService.replaceInvoiceItems(invoiceId, items);
    set(state => ({
      invoices: state.invoices.map(inv =>
        inv.id === invoiceId ? { ...inv, items: newItems } : inv
      ),
    }));
    return newItems;
  },
}));
