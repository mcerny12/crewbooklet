/**
 * People Store
 * Manages people/crew member state
 */

import { create } from 'zustand';
import type { Person } from '@/lib/types/models';
import { SupabaseService } from '@/lib/services/supabase-service';

interface PeopleState {
  people: Person[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  selectedPerson: Person | null;

  fetchPeople: () => Promise<void>;
  addPerson: (person: Partial<Person>) => Promise<Person | null>;
  updatePerson: (id: string, updates: Partial<Person>) => Promise<void>;
  deletePerson: (id: string) => Promise<void>;
  searchPeople: (query: string) => Promise<void>;
  setSelectedPerson: (person: Person | null) => void;
  setSearchQuery: (query: string) => void;
}

export const usePeopleStore = create<PeopleState>((set, get) => ({
  people: [],
  isLoading: false,
  error: null,
  searchQuery: '',
  selectedPerson: null,

  fetchPeople: async () => {
    try {
      set({ isLoading: true, error: null });
      console.log('Fetching people from Supabase...');
      const people = await SupabaseService.fetchPeople();
      console.log('Fetched people:', people.length, 'records');
      set({ people, isLoading: false });
    } catch (error) {
      console.error('Error fetching people:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch people',
        isLoading: false
      });
    }
  },

  addPerson: async (person: Partial<Person>) => {
    try {
      set({ isLoading: true, error: null });
      const newPerson = await SupabaseService.addPerson(person);

      if (newPerson) {
        set(state => ({
          people: [...state.people, newPerson].sort((a, b) => a.name.localeCompare(b.name)),
          isLoading: false,
        }));
      }

      return newPerson;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to add person',
        isLoading: false
      });
      return null;
    }
  },

  updatePerson: async (id: string, updates: Partial<Person>) => {
    try {
      const updatedPerson = await SupabaseService.updatePerson(id, updates);

      if (updatedPerson) {
        set(state => ({
          people: state.people.map(p => p.id === id ? updatedPerson : p),
          selectedPerson: state.selectedPerson?.id === id ? updatedPerson : state.selectedPerson,
        }));
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update person' });
    }
  },

  deletePerson: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      await SupabaseService.deletePerson(id);

      set(state => ({
        people: state.people.filter(p => p.id !== id),
        selectedPerson: state.selectedPerson?.id === id ? null : state.selectedPerson,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete person',
        isLoading: false
      });
    }
  },

  searchPeople: async (query: string) => {
    try {
      set({ isLoading: true, error: null, searchQuery: query });
      const people = await SupabaseService.searchPeople(query);
      set({ people, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to search people',
        isLoading: false
      });
    }
  },

  setSelectedPerson: (person: Person | null) => {
    set({ selectedPerson: person });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },
}));
