/**
 * Supabase Service
 * TypeScript version of Swift SupabaseService
 * Handles all database operations
 */

import { supabase } from '@/lib/supabase/client';
import type {
  Person,
  Organization,
  Project,
  ProjectAssignment,
  AdvancedSearchCriteria,
  AdvancedSearchResults,
  PersonSearchResult,
  OrganizationSearchResult,
  ProjectSearchResult,
  Invoice,
  InvoiceItem,
  InvoiceAttachment,
  InvoiceEvent,
  InvoiceEventType,
  InvoiceAcontoApplication,
  ProjectCalendar,
  CalendarEvent,
} from '@/lib/types/models';
import { InvoiceDocumentType, InvoiceItemType, InvoiceStatus } from '@/lib/types/models';
import { calculateInvoiceTotals } from '@/lib/invoice/totals';

// Accounting tolerance for cent-level rounding when reconciling computed vs stored totals.
const TOTAL_RECONCILE_TOLERANCE = 0.01;

function sumItemTotals(items: ReadonlyArray<{ total: number }>): number {
  return items.reduce((sum, it) => sum + (it.total ?? 0), 0);
}

export class SupabaseService {
  // MARK: - Person Operations

  static async fetchPeople(): Promise<Person[]> {
    const { data, error } = await supabase
      .from('people')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching people:', error);
      throw error;
    }

    return data || [];
  }

  static async fetchPerson(id: string): Promise<Person | null> {
    const { data, error } = await supabase
      .from('people')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching person:', error);
      return null;
    }

    return data;
  }

  static async addPerson(person: Partial<Person>): Promise<Person | null> {
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;

    const { data, error } = await supabase
      .from('people')
      .insert([{ ...person, user_id: userId }])
      .select()
      .single();

    if (error) {
      console.error('Error adding person:', error);
      throw error;
    }

    return data;
  }

  static async updatePerson(id: string, updates: Partial<Person>): Promise<Person | null> {
    // Remove user_id from updates to prevent RLS issues
    const { user_id: _uid1, ...cleanUpdates } = updates as Record<string, unknown>;

    const { data, error } = await supabase
      .from('people')
      .update(cleanUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating person:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Update payload:', cleanUpdates);
      console.error('Person ID:', id);
      throw error;
    }

    return data;
  }

  static async deletePerson(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('people')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting person:', error);
      throw error;
    }

    return true;
  }

  static async searchPeople(query: string): Promise<Person[]> {
    if (!query.trim()) {
      return this.fetchPeople();
    }

    const { data, error } = await supabase
      .from('people')
      .select('*')
      .or(`name.ilike.%${query}%,email.ilike.%${query}%,address->>city.ilike.%${query}%`)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error searching people:', error);
      throw error;
    }

    return data || [];
  }

  // MARK: - Organization Operations

  static async fetchOrganizations(): Promise<Organization[]> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching organizations:', error);
      throw error;
    }

    return data || [];
  }

  static async fetchOrganization(id: string): Promise<Organization | null> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching organization:', error);
      return null;
    }

    return data;
  }

  static async addOrganization(organization: Partial<Organization>): Promise<Organization | null> {
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;

    // Only include columns that exist in the DB schema
    const payload = {
      user_id: userId,
      name: organization.name,
      contact_email: organization.contact_email ?? null,
      contact_phone: organization.contact_phone ?? null,
      street: organization.street ?? null,
      street2: organization.street2 ?? null,
      zip: organization.zip ?? null,
      city: organization.city ?? null,
      country: organization.country ?? null,
      jobs: organization.jobs ?? [],
      notes: organization.notes ?? null,
    };

    const { data, error } = await supabase
      .from('organizations')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('addOrganization error:', error.code, error.message, error.details, error.hint);
      throw error;
    }

    return data;
  }

  static async updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization | null> {
    // Remove fields that don't exist as DB columns
    const { user_id: _uid2, website: _w, financial_details: _fd, ...cleanUpdates } = updates as Record<string, unknown>;

    const { data, error } = await supabase
      .from('organizations')
      .update(cleanUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating organization:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Update payload:', cleanUpdates);
      console.error('Organization ID:', id);
      throw error;
    }

    return data;
  }

  static async deleteOrganization(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting organization:', error);
      throw error;
    }

    return true;
  }

  // MARK: - Project Operations

  static async fetchProjects(): Promise<Project[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('creation_date', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }

    return data || [];
  }

  static async fetchProject(id: string): Promise<Project | null> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching project:', error);
      return null;
    }

    return data;
  }

  static async getNextProjectNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const yearPrefix = `${currentYear}-`;
    const { data: existingProjects } = await supabase
      .from('projects')
      .select('project_number')
      .like('project_number', `${yearPrefix}%`)
      .order('project_number', { ascending: false })
      .limit(1);
    let nextNumber = 1;
    if (existingProjects && existingProjects.length > 0) {
      const lastNumber = existingProjects[0].project_number.split('-')[1];
      nextNumber = parseInt(lastNumber || '0') + 1;
    }
    return `${yearPrefix}${String(nextNumber).padStart(2, '0')}`;
  }

  static async addProject(project: Partial<Project>): Promise<Project | null> {
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;

    // Generate project number in format YYYY-XX
    const currentYear = new Date().getFullYear();
    const yearPrefix = `${currentYear}-`;

    // Get existing projects for this year
    const { data: existingProjects } = await supabase
      .from('projects')
      .select('project_number')
      .like('project_number', `${yearPrefix}%`)
      .order('project_number', { ascending: false })
      .limit(1);

    let nextNumber = 1;
    if (existingProjects && existingProjects.length > 0) {
      const lastNumber = existingProjects[0].project_number.split('-')[1];
      nextNumber = parseInt(lastNumber || '0') + 1;
    }

    const projectNumber = `${yearPrefix}${String(nextNumber).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('projects')
      .insert([{ ...project, user_id: userId, project_number: projectNumber }])
      .select()
      .single();

    if (error) {
      console.error('Error adding project:', error);
      throw error;
    }

    return data;
  }

  static async updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
    // Remove user_id and project_number from updates to prevent RLS issues
    const { user_id: _uid3, project_number: _pn, ...cleanUpdates } = updates as Record<string, unknown>;

    const { data, error } = await supabase
      .from('projects')
      .update(cleanUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating project:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Update payload:', cleanUpdates);
      console.error('Project ID:', id);
      throw error;
    }

    return data;
  }

  static async deleteProject(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting project:', error);
      throw error;
    }

    return true;
  }

  // MARK: - Project Assignment Operations

  static async fetchProjectAssignments(projectId: string): Promise<ProjectAssignment[]> {
    const { data, error } = await supabase
      .from('project_assignments')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching project assignments:', error);
      throw error;
    }

    return data || [];
  }

  static async fetchProjectAssignmentsByPerson(personId: string): Promise<ProjectAssignment[]> {
    const { data, error } = await supabase
      .from('project_assignments')
      .select('*')
      .eq('person_id', personId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching project assignments by person:', error);
      throw error;
    }

    return data || [];
  }

  static async addProjectAssignment(assignment: Partial<ProjectAssignment>): Promise<ProjectAssignment | null> {
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;

    // Only include organization_id and notes when they have values —
    // these columns are added by migration-2026-03-19.sql and may not
    // exist yet. Omitting them when null keeps inserts compatible with
    // pre-migration schemas.
    const { organization_id, notes, ...base } = assignment as Record<string, unknown>;
    const payload: Record<string, unknown> = { ...base, user_id: userId };
    if (organization_id != null) payload.organization_id = organization_id;
    if (notes != null) payload.notes = notes;

    const { data, error } = await supabase
      .from('project_assignments')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('Error adding project assignment:', error.message, '| code:', error.code, '| details:', error.details, '| hint:', error.hint);
      throw error;
    }

    return data;
  }

  static async updateProjectAssignment(id: string, updates: Partial<ProjectAssignment>): Promise<ProjectAssignment | null> {
    // Remove user_id from updates to prevent RLS issues
    const { user_id: _uid4, ...cleanUpdates } = updates as Record<string, unknown>;

    const { data, error } = await supabase
      .from('project_assignments')
      .update(cleanUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating project assignment:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Update payload:', cleanUpdates);
      console.error('Assignment ID:', id);
      throw error;
    }

    return data;
  }

  static async deleteProjectAssignment(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('project_assignments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting project assignment:', error);
      throw error;
    }

    return true;
  }

  // MARK: - Authentication

  static async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Error signing in:', error);
      throw error;
    }

    return data;
  }

  static async signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  static async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      console.error('Error getting current user:', error);
      return null;
    }

    return user;
  }

  static async getCurrentSession() {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Error getting session:', error);
      return null;
    }

    return session;
  }

  // MARK: - Job Types

  static async fetchJobTypes(): Promise<{ id: string; name: string; category: string; sort_order: number }[]> {
    const { data, error } = await supabase
      .from('job_types')
      .select('id, name, category, sort_order')
      .order('sort_order', { ascending: true });
    if (error) { console.error('fetchJobTypes:', error); return []; }
    return data ?? [];
  }

  static async addJobType(name: string, category: string, sort_order: number): Promise<void> {
    const { error } = await supabase.from('job_types').insert([{ name, category, sort_order }]);
    if (error) throw error;
  }

  static async updateJobType(id: string, updates: { name?: string; category?: string; sort_order?: number }): Promise<void> {
    const { error } = await supabase.from('job_types').update(updates).eq('id', id);
    if (error) throw error;
  }

  static async deleteJobType(id: string): Promise<void> {
    const { error } = await supabase.from('job_types').delete().eq('id', id);
    if (error) throw error;
  }

  // MARK: - Real-time Subscriptions

  static subscribeToPeople(callback: (payload: Record<string, unknown>) => void) {
    return supabase
      .channel('people_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'people' }, callback)
      .subscribe();
  }

  static subscribeToProjects(callback: (payload: Record<string, unknown>) => void) {
    return supabase
      .channel('projects_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, callback)
      .subscribe();
  }

  static subscribeToOrganizations(callback: (payload: Record<string, unknown>) => void) {
    return supabase
      .channel('organizations_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'organizations' }, callback)
      .subscribe();
  }

  // MARK: - Invoice Operations

  static async fetchInvoices(): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, items:invoice_items!invoice_items_invoice_id_fkey(*)')
      .order('invoice_number', { ascending: false });

    if (error) {
      console.error('Error fetching invoices:', error);
      throw error;
    }

    return data || [];
  }

  static async fetchInvoice(id: string): Promise<Invoice | null> {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, items:invoice_items!invoice_items_invoice_id_fkey(*), aconto_applications:invoice_aconto_applications!invoice_aconto_applications_invoice_id_fkey(*)')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching invoice:', error);
      return null;
    }

    return data;
  }

  static async fetchInvoicesByIds(ids: string[]): Promise<Invoice[]> {
    if (!ids.length) return [];
    const { data, error } = await supabase
      .from('invoices')
      .select('id, invoice_number, total, is_aconto')
      .in('id', ids);
    if (error) return [];
    return (data ?? []) as Invoice[];
  }

  static async getNextInvoiceNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `INV${currentYear}-`;
    const { data: existingInvoices } = await supabase
      .from('invoices')
      .select('invoice_number')
      .like('invoice_number', `${prefix}%`)
      .order('invoice_number', { ascending: false })
      .limit(1);
    let nextNumber = 1;
    if (existingInvoices && existingInvoices.length > 0) {
      const lastPart = existingInvoices[0].invoice_number.split('-').pop();
      nextNumber = parseInt(lastPart || '0') + 1;
    }
    return `${prefix}${String(nextNumber).padStart(3, '0')}`;
  }

  static async addInvoice(invoice: Partial<Invoice>): Promise<Invoice | null> {
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;
    const {
      items: _items,
      aconto_applications: _acontoApps,
      ...invoiceData
    } = invoice as Record<string, unknown>;

    const { data, error } = await supabase
      .from('invoices')
      .insert([{ ...invoiceData, user_id: userId }])
      .select()
      .single();

    if (error) {
      console.error('Error adding invoice:', error);
      throw error;
    }

    return data;
  }

  static async updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice | null> {
    const {
      user_id: _uid5,
      items: _items2,
      aconto_applications: _acontoApps2,
      ...cleanUpdates
    } = updates as Record<string, unknown>;

    const { data, error } = await supabase
      .from('invoices')
      .update(cleanUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating invoice:', error);
      throw error;
    }

    return data;
  }

  static async deleteInvoice(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting invoice:', error);
      throw error;
    }

    return true;
  }

  // MARK: - Invoice Item Operations

  static async addInvoiceItem(item: Omit<InvoiceItem, 'id'>): Promise<InvoiceItem | null> {
    const { data, error } = await supabase
      .from('invoice_items')
      .insert([item])
      .select()
      .single();

    if (error) {
      console.error('Error adding invoice item:', error);
      throw error;
    }

    return data;
  }

  static async updateInvoiceItem(id: string, updates: Partial<InvoiceItem>): Promise<InvoiceItem | null> {
    const { data, error } = await supabase
      .from('invoice_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating invoice item:', error);
      throw error;
    }

    return data;
  }

  static async deleteInvoiceItem(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('invoice_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting invoice item:', error);
      throw error;
    }

    return true;
  }

  // MARK: - Invoice Attachment Operations

  static async fetchInvoiceAttachments(invoiceId: string): Promise<InvoiceAttachment[]> {
    const { data, error } = await supabase
      .from('invoice_attachments')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  static async uploadInvoiceAttachment(
    invoiceId: string,
    file: File,
    label?: string | null
  ): Promise<InvoiceAttachment> {
    const ext = file.name.split('.').pop() ?? 'bin';
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const path = `${invoiceId}/${uniqueName}`;

    const { error: uploadError } = await supabase.storage
      .from('invoice-attachments')
      .upload(path, file);
    if (uploadError) throw uploadError;

    const { data, error } = await supabase
      .from('invoice_attachments')
      .insert({ invoice_id: invoiceId, label: label ?? null, file_name: file.name, file_path: path, file_size: file.size, mime_type: file.type })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async getAttachmentDownloadUrl(filePath: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from('invoice-attachments')
      .createSignedUrl(filePath, 3600);
    if (error) throw error;
    return data.signedUrl;
  }

  static async deleteInvoiceAttachment(id: string, filePath: string): Promise<void> {
    await supabase.storage.from('invoice-attachments').remove([filePath]);
    const { error } = await supabase.from('invoice_attachments').delete().eq('id', id);
    if (error) throw error;
  }

  static async replaceInvoiceItems(invoiceId: string, items: Omit<InvoiceItem, 'id'>[]): Promise<InvoiceItem[]> {
    // Delete existing items
    await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId);

    if (items.length === 0) return [];

    // PostgREST bulk insert normalises columns across rows: any field absent
    // from one row but present on another is sent as explicit NULL. If a
    // caller mixes DB-loaded rows (which carry item_type / source_invoice_id)
    // with a freshly-added row that omits them, the omitted fields land in
    // the database as NULL and the NOT NULL constraint on item_type rejects
    // the entire INSERT — wiping the items (DELETE already ran). Normalise
    // every row to the same shape with safe defaults.
    const normalised = items.map(it => ({
      invoice_id: it.invoice_id,
      sort_order: it.sort_order,
      description: it.description ?? '',
      sub_description: it.sub_description ?? null,
      quantity: it.quantity,
      unit_price: it.unit_price,
      tax_rate: it.tax_rate,
      total: it.total,
      item_type: it.item_type ?? InvoiceItemType.Service,
      source_invoice_id: it.source_invoice_id ?? null,
    }));

    const { data, error } = await supabase
      .from('invoice_items')
      .insert(normalised)
      .select();

    if (error) {
      console.error('Error replacing invoice items:', error);
      throw error;
    }

    return data || [];
  }

  // MARK: - Invoice Aconto Applications
  //
  // An aconto application is "this final/revision invoice deducts that earlier aconto invoice".
  // Source of truth for deduction amounts (snapshotted at apply-time so display stays stable
  // even if the source aconto invoice is later edited).

  static async fetchInvoiceAcontoApplications(invoiceId: string): Promise<InvoiceAcontoApplication[]> {
    const { data, error } = await supabase
      .from('invoice_aconto_applications')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) {
      console.error('Error fetching aconto applications:', error);
      return [];
    }
    return data ?? [];
  }

  /**
   * Snapshot a source aconto invoice and link it as a deduction on the given target invoice.
   * Defaults applied_amount/gross_amount/net_amount to the source's current total (gross).
   * Throws if the same source is already applied to this target.
   */
  static async applyAcontoToInvoice(params: {
    invoiceId: string;
    sourceInvoiceId: string;
    label?: string;
    appliedAmount?: number;
    sortOrder?: number;
  }): Promise<InvoiceAcontoApplication> {
    const source = await SupabaseService.fetchInvoice(params.sourceInvoiceId);
    if (!source) throw new Error('Source aconto invoice not found');
    if (source.id === params.invoiceId) {
      throw new Error('An invoice cannot deduct itself as an aconto.');
    }

    const gross = source.total ?? 0;
    const applied = params.appliedAmount ?? gross;

    const { data, error } = await supabase
      .from('invoice_aconto_applications')
      .insert({
        invoice_id: params.invoiceId,
        source_invoice_id: source.id,
        source_invoice_number: source.invoice_number,
        source_invoice_date: source.date ?? null,
        label: params.label ?? 'Aconto',
        net_amount: gross,
        tax_amount: null,
        gross_amount: gross,
        applied_amount: applied,
        sort_order: params.sortOrder ?? 0,
      })
      .select()
      .single();

    if (error) {
      // 23505 = unique_violation (uq_invoice_aconto_applications_invoice_source).
      if ((error as { code?: string }).code === '23505') {
        throw new Error(
          `Aconto invoice ${source.invoice_number} is already applied to this invoice.`
        );
      }
      console.error('Error applying aconto:', error);
      throw error;
    }
    return data;
  }

  static async updateAcontoApplication(
    id: string,
    updates: Partial<Pick<InvoiceAcontoApplication, 'applied_amount' | 'label' | 'sort_order'>>
  ): Promise<InvoiceAcontoApplication | null> {
    const { data, error } = await supabase
      .from('invoice_aconto_applications')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('Error updating aconto application:', error);
      throw error;
    }
    return data;
  }

  static async removeAcontoApplication(id: string): Promise<void> {
    const { error } = await supabase
      .from('invoice_aconto_applications')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('Error removing aconto application:', error);
      throw error;
    }
  }

  /**
   * Copy snapshot rows (not foreign-key clones) from one invoice to another.
   * Used when a revision is created from an original invoice: the revision inherits
   * the same applied acontos, with the same snapshot values.
   */
  static async copyAppliedAcontosToInvoice(
    sourceInvoiceId: string,
    targetInvoiceId: string
  ): Promise<InvoiceAcontoApplication[]> {
    const existing = await SupabaseService.fetchInvoiceAcontoApplications(sourceInvoiceId);
    if (existing.length === 0) return [];
    const rows = existing.map(app => ({
      invoice_id: targetInvoiceId,
      source_invoice_id: app.source_invoice_id ?? null,
      source_invoice_number: app.source_invoice_number,
      source_invoice_date: app.source_invoice_date ?? null,
      label: app.label,
      net_amount: app.net_amount,
      tax_amount: app.tax_amount ?? null,
      gross_amount: app.gross_amount,
      applied_amount: app.applied_amount,
      sort_order: app.sort_order,
    }));
    const { data, error } = await supabase
      .from('invoice_aconto_applications')
      .insert(rows)
      .select();
    if (error) {
      console.error('Error copying aconto applications:', error);
      throw error;
    }
    return data ?? [];
  }

  // MARK: - Invoice Storno / Revision

  private static stripRevSuffix(invoiceNumber: string): string {
    return invoiceNumber.replace(/-rev(-\d{2})?$/, '');
  }

  static async getNextStornoInvoiceNumber(originalNumber: string): Promise<string> {
    const base = `${originalNumber}-storno`;
    const { data } = await supabase
      .from('invoices')
      .select('invoice_number')
      .like('invoice_number', `${base}%`);
    const existing = new Set((data ?? []).map(r => r.invoice_number as string));
    if (!existing.has(base)) return base;
    for (let i = 1; i < 100; i++) {
      const candidate = `${base}-${String(i).padStart(2, '0')}`;
      if (!existing.has(candidate)) return candidate;
    }
    throw new Error('Too many storno numbers for ' + originalNumber);
  }

  static async getNextRevisionInvoiceNumber(
    originalNumber: string
  ): Promise<{ number: string; sequence: number }> {
    const root = SupabaseService.stripRevSuffix(originalNumber);
    const { data } = await supabase
      .from('invoices')
      .select('invoice_number')
      .like('invoice_number', `${root}-rev%`);
    const existing = new Set(
      (data ?? [])
        .map(r => r.invoice_number as string)
        .filter(n => /-rev(-\d{2})?$/.test(n))
    );
    const first = `${root}-rev`;
    if (!existing.has(first)) return { number: first, sequence: 0 };
    for (let i = 1; i < 100; i++) {
      const candidate = `${root}-rev-${String(i).padStart(2, '0')}`;
      if (!existing.has(candidate)) return { number: candidate, sequence: i };
    }
    throw new Error('Too many revision numbers for ' + originalNumber);
  }

  static async logInvoiceEvent(event: {
    invoice_id: string;
    related_invoice_id?: string | null;
    event_type: InvoiceEventType;
    reason?: string | null;
    payload?: Record<string, unknown> | null;
  }): Promise<void> {
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id ?? null;
    const { error } = await supabase
      .from('invoice_events')
      .insert({
        invoice_id: event.invoice_id,
        related_invoice_id: event.related_invoice_id ?? null,
        event_type: event.event_type,
        reason: event.reason ?? null,
        payload: event.payload ?? null,
        user_id: userId,
      });
    if (error) {
      // Audit log failure must not break the user-facing flow.
      console.error('[invoice_events] insert failed:', error);
    }
  }

  static async fetchInvoiceEvents(invoiceId: string): Promise<InvoiceEvent[]> {
    const { data, error } = await supabase
      .from('invoice_events')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: true });
    if (error) {
      console.error('Error fetching invoice events:', error);
      return [];
    }
    return data ?? [];
  }

  private static copyInvoiceHeader(source: Invoice): Partial<Invoice> {
    return {
      project_id: source.project_id ?? null,
      recipient_name: source.recipient_name ?? null,
      recipient_contact: source.recipient_contact ?? null,
      recipient_street: source.recipient_street ?? null,
      recipient_zip: source.recipient_zip ?? null,
      recipient_city: source.recipient_city ?? null,
      recipient_country: source.recipient_country ?? null,
      sender_name: source.sender_name ?? null,
      sender_address_line: source.sender_address_line ?? null,
      sender_phone: source.sender_phone ?? null,
      sender_email: source.sender_email ?? null,
      service_period_start: source.service_period_start ?? null,
      service_period_end: source.service_period_end ?? null,
      uid_recipient: source.uid_recipient ?? null,
      greeting: source.greeting ?? null,
      intro: source.intro ?? null,
      footer_notes: source.footer_notes ?? null,
      bank_recipient: source.bank_recipient ?? null,
      iban: source.iban ?? null,
      bic: source.bic ?? null,
      // Inherit the issued document language. Storno/revision PDFs must render
      // in the same language as the corrected/original invoice — switching
      // the app locale must not retroactively change the language of an issued
      // document chain.
      document_language: source.document_language ?? null,
    };
  }

  /**
   * Build the line items that fully reverse a source invoice on its Stornorechnung.
   *
   * - Service / expense / other line items are mirrored with negated quantity and total
   *   (so the storno PDF shows minus the original positions).
   * - Each aconto application on the source becomes a positive `correction_reversal`
   *   line on the storno (so the previously-deducted aconto is added back).
   *
   * Invariant: sum(storno items) === -(source.total).
   */
  private static buildStornoLineItems(
    source: Invoice,
    stornoInvoiceId: string
  ): Omit<InvoiceItem, 'id'>[] {
    const negated: Omit<InvoiceItem, 'id'>[] = (source.items ?? []).map(it => ({
      invoice_id: stornoInvoiceId,
      sort_order: it.sort_order,
      description: it.description,
      sub_description: it.sub_description ?? null,
      quantity: -it.quantity,
      unit_price: it.unit_price,
      tax_rate: it.tax_rate,
      total: -it.total,
      item_type: it.item_type ?? InvoiceItemType.Service,
      source_invoice_id: it.source_invoice_id ?? null,
    }));

    const apps = source.aconto_applications ?? [];
    const baseSort = negated.reduce((max, it) => Math.max(max, it.sort_order), -1) + 1;
    const acontoReversals: Omit<InvoiceItem, 'id'>[] = apps.map((app, idx) => ({
      invoice_id: stornoInvoiceId,
      sort_order: baseSort + idx,
      description: `Aufhebung des Abzugs aus Aconto-Rechnung ${app.source_invoice_number}`,
      sub_description: app.source_invoice_date
        ? `vom ${app.source_invoice_date}`
        : null,
      quantity: 1,
      unit_price: app.applied_amount,
      tax_rate: 0,
      total: app.applied_amount,
      item_type: InvoiceItemType.CorrectionReversal,
      source_invoice_id: app.source_invoice_id ?? null,
    }));

    return [...negated, ...acontoReversals];
  }

  /**
   * Create a Stornorechnung that fully reverses the given invoice.
   * Marks the original as Cancelled and links the documents. Does NOT create
   * a revision invoice — for that, use createStornoAndRevision.
   *
   * Note: this storno reverses ONLY the selected invoice. Any earlier aconto
   * invoices linked via aconto_applications are NOT cancelled here — their own
   * invoices remain valid. The storno carries an explicit `correction_reversal`
   * line per applied aconto so the storno math reconciles to `-(source.total)`.
   */
  static async createInvoiceStorno(params: {
    invoiceId: string;
    documentLabel?: string | null;
    reason?: string | null;
    stornoDate?: string | null;
  }): Promise<Invoice> {
    const source = await SupabaseService.fetchInvoice(params.invoiceId);
    if (!source) throw new Error('Invoice not found');
    if (source.status === InvoiceStatus.Draft) {
      throw new Error('Draft invoices cannot be cancelled — edit or delete instead.');
    }
    if (source.status === InvoiceStatus.Cancelled || source.status === InvoiceStatus.Corrected) {
      throw new Error('This invoice has already been cancelled or corrected.');
    }
    if (source.storno_invoice_id) {
      throw new Error('A Stornorechnung already exists for this invoice.');
    }

    const rootOriginalId = source.original_invoice_id ?? source.id;
    const stornoNumber = await SupabaseService.getNextStornoInvoiceNumber(source.invoice_number);
    const stornoDate = params.stornoDate ?? new Date().toISOString().slice(0, 10);

    // Build items first, then derive total from them so the stored total
    // can never drift from what the PDF/UI renders. The invariant compares
    // sum(storno items) against -(source's actual final amount = subtotal
    // − applied acontos), not -(source.total): `invoices.total` stores the
    // line-item subtotal, while the financial amount that must zero-sum is
    // what the PDF prints (subtotal − acontoSum).
    const stornoItemsTemplate = SupabaseService.buildStornoLineItems(source, '');
    const stornoTotal = sumItemTotals(stornoItemsTemplate);
    const sourceFinal = calculateInvoiceTotals(
      source.items,
      source.aconto_applications,
      source.document_type
    ).total;
    const expectedTotal = -sourceFinal;
    if (Math.abs(stornoTotal - expectedTotal) > TOTAL_RECONCILE_TOLERANCE) {
      throw new Error(
        `Storno total mismatch for invoice ${source.invoice_number}: ` +
        `computed ${stornoTotal.toFixed(2)} but expected ${expectedTotal.toFixed(2)} ` +
        `(source final ${sourceFinal.toFixed(2)}). ` +
        `Refusing to create a storno whose items do not zero-sum the original.`
      );
    }

    const stornoPayload: Partial<Invoice> = {
      ...SupabaseService.copyInvoiceHeader(source),
      invoice_number: stornoNumber,
      status: InvoiceStatus.Sent,
      document_type: InvoiceDocumentType.StornoInvoice,
      original_invoice_id: rootOriginalId,
      corrects_invoice_id: source.id,
      pdf_document_label: params.documentLabel ?? 'Stornorechnung',
      storno_reason: params.reason ?? null,
      storno_date: stornoDate,
      date: stornoDate,
      due_date: stornoDate,
      reference: source.invoice_number,
      is_aconto: false,
      aconto_invoice_ids: [],
      total: stornoTotal,
    };

    const stornoInvoice = await SupabaseService.addInvoice(stornoPayload);
    if (!stornoInvoice) throw new Error('Failed to create Stornorechnung');

    try {
      const items = stornoItemsTemplate.map(it => ({ ...it, invoice_id: stornoInvoice.id }));
      await SupabaseService.replaceInvoiceItems(stornoInvoice.id, items);

      await SupabaseService.updateInvoice(source.id, {
        status: InvoiceStatus.Cancelled,
        storno_invoice_id: stornoInvoice.id,
      });

      await SupabaseService.logInvoiceEvent({
        invoice_id: source.id,
        related_invoice_id: stornoInvoice.id,
        event_type: 'invoice_storno_created',
        reason: params.reason ?? null,
      });
      await SupabaseService.logInvoiceEvent({
        invoice_id: source.id,
        event_type: 'invoice_cancelled',
        reason: params.reason ?? null,
      });

      return stornoInvoice;
    } catch (err) {
      try { await SupabaseService.deleteInvoice(stornoInvoice.id); } catch { /* best effort */ }
      throw err;
    }
  }

  /**
   * Create a Stornorechnung AND a revision-draft invoice copied from the original.
   * The original is marked Corrected. The revision is left as RevisionDraft so the
   * user can adapt line items before sending.
   */
  static async createStornoAndRevision(params: {
    invoiceId: string;
    documentLabel?: string | null;
    reason?: string | null;
    stornoDate?: string | null;
  }): Promise<{ storno: Invoice; revision: Invoice }> {
    const source = await SupabaseService.fetchInvoice(params.invoiceId);
    if (!source) throw new Error('Invoice not found');
    if (source.status === InvoiceStatus.Draft) {
      throw new Error('Draft invoices cannot be cancelled — edit them directly.');
    }
    if (source.status === InvoiceStatus.Cancelled || source.status === InvoiceStatus.Corrected) {
      throw new Error('This invoice has already been cancelled or corrected.');
    }
    if (source.storno_invoice_id) {
      throw new Error('A Stornorechnung already exists for this invoice.');
    }

    // Refuse to revise a source whose line items did not load. Without this
    // guard the revision would be created with zero items but inherit the
    // applied aconto deductions, producing a PDF whose only positions are
    // negative — a blank, negative-total document. Hard-fail and surface so
    // the caller can fix the data instead of silently corrupting the chain.
    const sourceItemCount = (source.items ?? []).length;
    const sourceAppCount = (source.aconto_applications ?? []).length;
    if (sourceItemCount === 0 && sourceAppCount > 0) {
      throw new Error(
        `Cannot create revision of ${source.invoice_number}: the original ` +
        `has applied aconto deductions but no line items loaded. ` +
        `Reload the invoice and try again; if the problem persists, the ` +
        `source invoice may be missing its positions in the database.`
      );
    }

    const rootOriginalId = source.original_invoice_id ?? source.id;
    const stornoNumber = await SupabaseService.getNextStornoInvoiceNumber(source.invoice_number);
    const { number: revisionNumber, sequence: revisionSequence } =
      await SupabaseService.getNextRevisionInvoiceNumber(source.invoice_number);
    const stornoDate = params.stornoDate ?? new Date().toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);

    // Build storno items first, recompute total from them, and assert the
    // zero-sum invariant against the source's actual final amount (subtotal
    // − applied acontos), not -(source.total) — see createInvoiceStorno
    // for the rationale.
    const stornoItemsTemplate = SupabaseService.buildStornoLineItems(source, '');
    const stornoTotal = sumItemTotals(stornoItemsTemplate);
    const sourceFinal = calculateInvoiceTotals(
      source.items,
      source.aconto_applications,
      source.document_type
    ).total;
    const expectedStornoTotal = -sourceFinal;
    if (Math.abs(stornoTotal - expectedStornoTotal) > TOTAL_RECONCILE_TOLERANCE) {
      throw new Error(
        `Storno total mismatch for invoice ${source.invoice_number}: ` +
        `computed ${stornoTotal.toFixed(2)} but expected ${expectedStornoTotal.toFixed(2)} ` +
        `(source final ${sourceFinal.toFixed(2)}). ` +
        `Refusing to create a storno whose items do not zero-sum the original.`
      );
    }

    // 1. Create Stornorechnung
    const stornoPayload: Partial<Invoice> = {
      ...SupabaseService.copyInvoiceHeader(source),
      invoice_number: stornoNumber,
      status: InvoiceStatus.Sent,
      document_type: InvoiceDocumentType.StornoInvoice,
      original_invoice_id: rootOriginalId,
      corrects_invoice_id: source.id,
      pdf_document_label: params.documentLabel ?? 'Stornorechnung',
      storno_reason: params.reason ?? null,
      storno_date: stornoDate,
      date: stornoDate,
      due_date: stornoDate,
      reference: source.invoice_number,
      is_aconto: false,
      aconto_invoice_ids: [],
      total: stornoTotal,
    };
    const storno = await SupabaseService.addInvoice(stornoPayload);
    if (!storno) throw new Error('Failed to create Stornorechnung');

    let revision: Invoice | null = null;
    try {
      const stornoItems = stornoItemsTemplate.map(it => ({ ...it, invoice_id: storno.id }));
      await SupabaseService.replaceInvoiceItems(storno.id, stornoItems);

      // 2. Create revision-draft invoice with positive line items copied.
      // Revision is a value-preserving copy of the source: same items, same
      // applied acontos (copied below via copyAppliedAcontosToInvoice).
      // `invoices.total` stores the line-item subtotal — the final figure is
      // derived at render time — so revision.total mirrors source.total.
      const revisionPayload: Partial<Invoice> = {
        ...SupabaseService.copyInvoiceHeader(source),
        invoice_number: revisionNumber,
        status: InvoiceStatus.RevisionDraft,
        document_type: InvoiceDocumentType.RevisionInvoice,
        original_invoice_id: rootOriginalId,
        revision_of_invoice_id: source.id,
        revision_sequence: revisionSequence,
        date: today,
        due_date: source.due_date ?? null,
        reference: source.invoice_number,
        is_aconto: source.is_aconto ?? false,
        aconto_invoice_ids: source.aconto_invoice_ids ?? [],
        total: source.total ?? 0,
      };
      revision = await SupabaseService.addInvoice(revisionPayload);
      if (!revision) throw new Error('Failed to create revision invoice');

      const revisionItems: Omit<InvoiceItem, 'id'>[] = (source.items ?? []).map(it => ({
        invoice_id: revision!.id,
        sort_order: it.sort_order,
        description: it.description,
        sub_description: it.sub_description ?? null,
        quantity: it.quantity,
        unit_price: it.unit_price,
        tax_rate: it.tax_rate,
        total: it.total,
        item_type: it.item_type ?? InvoiceItemType.Service,
        source_invoice_id: it.source_invoice_id ?? null,
      }));
      await SupabaseService.replaceInvoiceItems(revision.id, revisionItems);

      // Copy applied aconto deductions onto the revision so it inherits the
      // same financial picture as the original until the user edits it.
      await SupabaseService.copyAppliedAcontosToInvoice(source.id, revision.id);

      // 3. Mark original as Corrected and link both new docs
      await SupabaseService.updateInvoice(source.id, {
        status: InvoiceStatus.Corrected,
        storno_invoice_id: storno.id,
        replaced_by_invoice_id: revision.id,
      });

      // 4. Audit log
      await SupabaseService.logInvoiceEvent({
        invoice_id: source.id,
        related_invoice_id: storno.id,
        event_type: 'invoice_storno_created',
        reason: params.reason ?? null,
      });
      await SupabaseService.logInvoiceEvent({
        invoice_id: source.id,
        related_invoice_id: revision.id,
        event_type: 'invoice_revision_created',
        reason: params.reason ?? null,
      });
      await SupabaseService.logInvoiceEvent({
        invoice_id: source.id,
        related_invoice_id: revision.id,
        event_type: 'invoice_replaced_by_revision',
        reason: params.reason ?? null,
      });

      return { storno, revision };
    } catch (err) {
      try { if (revision) await SupabaseService.deleteInvoice(revision.id); } catch { /* best effort */ }
      try { await SupabaseService.deleteInvoice(storno.id); } catch { /* best effort */ }
      throw err;
    }
  }

  // MARK: - Calendar Operations

  private static calErr(context: string, error: unknown): Error {
    const msg = (error as { message?: string })?.message ?? String(error);
    console.error(`[SupabaseService] ${context}:`, error);
    return new Error(`${context}: ${msg}`);
  }

  static async fetchCalendarsForProject(projectId: string): Promise<ProjectCalendar[]> {
    const { data, error } = await supabase
      .from('project_calendars')
      .select('*, events:calendar_events(*)')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true });
    if (error) throw this.calErr('fetchCalendarsForProject', error);
    return data || [];
  }

  static async fetchAllCalendars(): Promise<ProjectCalendar[]> {
    const { data, error } = await supabase
      .from('project_calendars')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw this.calErr('fetchAllCalendars', error);
    return data || [];
  }

  static async createCalendar(projectId: string, name: string, color: string, sortOrder: number): Promise<ProjectCalendar> {
    const { data, error } = await supabase
      .from('project_calendars')
      .insert({ project_id: projectId, name, color, sort_order: sortOrder })
      .select()
      .single();
    if (error) throw this.calErr('createCalendar', error);
    return data;
  }

  static async updateCalendar(id: string, updates: Partial<ProjectCalendar>): Promise<ProjectCalendar> {
    const { data, error } = await supabase
      .from('project_calendars')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw this.calErr('updateCalendar', error);
    return data;
  }

  static async deleteCalendar(id: string): Promise<void> {
    const { error } = await supabase.from('project_calendars').delete().eq('id', id);
    if (error) throw this.calErr('deleteCalendar', error);
  }

  static async fetchAllEvents(): Promise<CalendarEvent[]> {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .order('start_date', { ascending: true });
    if (error) throw this.calErr('fetchAllEvents', error);
    return data || [];
  }

  static async fetchEventsForCalendar(calendarId: string): Promise<CalendarEvent[]> {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('calendar_id', calendarId)
      .order('start_date', { ascending: true });
    if (error) throw this.calErr('fetchEventsForCalendar', error);
    return data || [];
  }

  static async createEvent(event: Omit<CalendarEvent, 'id' | 'created_at'>): Promise<CalendarEvent> {
    const { data, error } = await supabase
      .from('calendar_events')
      .insert(event)
      .select()
      .single();
    if (error) throw this.calErr('createEvent', error);
    return data;
  }

  static async updateEvent(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const { data, error } = await supabase
      .from('calendar_events')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw this.calErr('updateEvent', error);
    return data;
  }

  static async deleteEvent(id: string): Promise<void> {
    const { error } = await supabase.from('calendar_events').delete().eq('id', id);
    if (error) throw this.calErr('deleteEvent', error);
  }

  // ICS feed: fetch calendar + events by share_token (public)
  static async fetchCalendarByShareToken(token: string): Promise<{ calendar: ProjectCalendar; events: CalendarEvent[] } | null> {
    const { data: calendar, error } = await supabase
      .from('project_calendars')
      .select('*')
      .eq('share_token', token)
      .single();
    if (error || !calendar) return null;
    const { data: events } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('calendar_id', calendar.id)
      .order('start_date', { ascending: true });
    return { calendar, events: events || [] };
  }
}
