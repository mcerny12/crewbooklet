/**
 * Organizations Store
 * Manages organization state
 */

import { create } from 'zustand';
import type { Organization } from '@/lib/types/models';
import { OrgRole } from '@/lib/types/models';
import { SupabaseService } from '@/lib/services/supabase-service';

interface OrganizationsState {
  organizations: Organization[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  selectedOrganization: Organization | null;

  fetchOrganizations: () => Promise<void>;
  addOrganization: (organization: Partial<Organization>) => Promise<Organization | null>;
  updateOrganization: (id: string, updates: Partial<Organization>) => Promise<void>;
  deleteOrganization: (id: string) => Promise<void>;
  setSelectedOrganization: (organization: Organization | null) => void;
  setSearchQuery: (query: string) => void;
  /** Returns an error message string on failure, null on success. */
  setOrganizationRole: (orgId: string, role: OrgRole, parentId: string | null) => Promise<string | null>;
}

export const useOrganizationsStore = create<OrganizationsState>((set, get) => ({
  organizations: [],
  isLoading: false,
  error: null,
  searchQuery: '',
  selectedOrganization: null,

  fetchOrganizations: async () => {
    try {
      set({ isLoading: true, error: null });
      console.log('Fetching organizations from Supabase...');
      const organizations = await SupabaseService.fetchOrganizations();
      console.log('Fetched organizations:', organizations.length, 'records');
      set({ organizations, isLoading: false });
    } catch (error) {
      console.error('Error fetching organizations:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch organizations',
        isLoading: false
      });
    }
  },

  addOrganization: async (organization: Partial<Organization>) => {
    try {
      const newOrganization = await SupabaseService.addOrganization(organization);

      if (newOrganization) {
        set(state => ({
          organizations: [...state.organizations, newOrganization].sort((a, b) => a.name.localeCompare(b.name)),
        }));
      }

      return newOrganization;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to add organization' });
      return null;
    }
  },

  updateOrganization: async (id: string, updates: Partial<Organization>) => {
    try {
      const updatedOrganization = await SupabaseService.updateOrganization(id, updates);

      if (updatedOrganization) {
        set(state => ({
          organizations: state.organizations.map(o => o.id === id ? updatedOrganization : o),
          selectedOrganization: state.selectedOrganization?.id === id ? updatedOrganization : state.selectedOrganization,
        }));
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update organization' });
    }
  },

  deleteOrganization: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      await SupabaseService.deleteOrganization(id);

      set(state => ({
        organizations: state.organizations.filter(o => o.id !== id),
        selectedOrganization: state.selectedOrganization?.id === id ? null : state.selectedOrganization,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete organization',
        isLoading: false
      });
    }
  },

  setSelectedOrganization: (organization: Organization | null) => {
    set({ selectedOrganization: organization });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setOrganizationRole: async (orgId, role, parentId) => {
    try {
      const updated = await SupabaseService.setOrganizationRole(orgId, role, parentId);
      set(state => ({
        organizations: state.organizations.map(o => o.id === updated.id ? updated : o),
        selectedOrganization: state.selectedOrganization?.id === updated.id ? updated : state.selectedOrganization,
      }));
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : 'Failed to update organization role';
    }
  },
}));
