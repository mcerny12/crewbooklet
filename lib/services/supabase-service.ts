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
  ProjectCalendar,
  CalendarEvent,
} from '@/lib/types/models';

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
    const { user_id: _uid2, website: _w, financial_details: _fd, documents: _docs, ...cleanUpdates } = updates as Record<string, unknown>;

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
      .select('*, items:invoice_items(*)')
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
      .select('*, items:invoice_items(*)')
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
    const prefix = `CERNY-INV${currentYear}-`;
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
    const { items: _items, ...invoiceData } = invoice as Record<string, unknown>;

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
    const { user_id: _uid5, items: _items2, ...cleanUpdates } = updates as Record<string, unknown>;

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

    const { data, error } = await supabase
      .from('invoice_items')
      .insert(items)
      .select();

    if (error) {
      console.error('Error replacing invoice items:', error);
      throw error;
    }

    return data || [];
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
