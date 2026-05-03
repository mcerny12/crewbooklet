/**
 * Project Assignments Store
 * Manages project crew assignments state
 */

import { create } from 'zustand';
import type { ProjectAssignment } from '@/lib/types/models';
import { SupabaseService } from '@/lib/services/supabase-service';

interface ProjectAssignmentsState {
  assignments: ProjectAssignment[];
  isLoading: boolean;
  error: string | null;

  fetchAssignmentsByProject: (projectId: string) => Promise<void>;
  fetchAssignmentsByPerson: (personId: string) => Promise<void>;
  addAssignment: (assignment: Partial<ProjectAssignment>) => Promise<ProjectAssignment | null>;
  updateAssignment: (id: string, updates: Partial<ProjectAssignment>) => Promise<void>;
  deleteAssignment: (id: string) => Promise<void>;
  clearAssignments: () => void;
}

export const useProjectAssignmentsStore = create<ProjectAssignmentsState>((set, get) => ({
  assignments: [],
  isLoading: false,
  error: null,

  fetchAssignmentsByProject: async (projectId: string) => {
    try {
      set({ isLoading: true, error: null });
      console.log('Fetching project assignments for project:', projectId);
      const assignments = await SupabaseService.fetchProjectAssignments(projectId);
      console.log('Fetched project assignments:', assignments.length, 'records');
      set({ assignments, isLoading: false });
    } catch (error) {
      console.error('Error fetching project assignments:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch assignments',
        isLoading: false
      });
    }
  },

  fetchAssignmentsByPerson: async (personId: string) => {
    try {
      set({ isLoading: true, error: null });
      console.log('Fetching project assignments for person:', personId);
      const assignments = await SupabaseService.fetchProjectAssignmentsByPerson(personId);
      console.log('Fetched person assignments:', assignments.length, 'records');
      set({ assignments, isLoading: false });
    } catch (error) {
      console.error('Error fetching person assignments:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch assignments',
        isLoading: false
      });
    }
  },

  addAssignment: async (assignment: Partial<ProjectAssignment>) => {
    try {
      set({ isLoading: true, error: null });
      const newAssignment = await SupabaseService.addProjectAssignment(assignment);

      if (newAssignment) {
        set(state => ({
          assignments: [...state.assignments, newAssignment],
          isLoading: false,
        }));
      }

      return newAssignment;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to add assignment',
        isLoading: false
      });
      return null;
    }
  },

  updateAssignment: async (id: string, updates: Partial<ProjectAssignment>) => {
    try {
      set({ isLoading: true, error: null });
      const updatedAssignment = await SupabaseService.updateProjectAssignment(id, updates);

      if (updatedAssignment) {
        set(state => ({
          assignments: state.assignments.map(a => a.id === id ? updatedAssignment : a),
          isLoading: false,
        }));
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update assignment',
        isLoading: false
      });
    }
  },

  deleteAssignment: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      await SupabaseService.deleteProjectAssignment(id);

      set(state => ({
        assignments: state.assignments.filter(a => a.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete assignment',
        isLoading: false
      });
    }
  },

  clearAssignments: () => {
    set({ assignments: [] });
  },
}));
