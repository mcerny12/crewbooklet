/**
 * Projects Store
 * Manages project state
 */

import { create } from 'zustand';
import type { Project } from '@/lib/types/models';
import { SupabaseService } from '@/lib/services/supabase-service';

interface ProjectsState {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  selectedProject: Project | null;

  fetchProjects: () => Promise<void>;
  addProject: (project: Partial<Project>) => Promise<Project | null>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setSelectedProject: (project: Project | null) => void;
  setSearchQuery: (query: string) => void;
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: [],
  isLoading: false,
  error: null,
  searchQuery: '',
  selectedProject: null,

  fetchProjects: async () => {
    try {
      set({ isLoading: true, error: null });
      console.log('Fetching projects from Supabase...');
      const projects = await SupabaseService.fetchProjects();
      console.log('Fetched projects:', projects.length, 'records');
      set({ projects, isLoading: false });
    } catch (error) {
      console.error('Error fetching projects:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch projects',
        isLoading: false
      });
    }
  },

  addProject: async (project: Partial<Project>) => {
    try {
      set({ isLoading: true, error: null });
      const newProject = await SupabaseService.addProject(project);

      if (newProject) {
        set(state => ({
          projects: [newProject, ...state.projects],
          isLoading: false,
        }));
      }

      return newProject;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to add project',
        isLoading: false
      });
      return null;
    }
  },

  updateProject: async (id: string, updates: Partial<Project>) => {
    try {
      const updatedProject = await SupabaseService.updateProject(id, updates);

      if (updatedProject) {
        set(state => ({
          projects: state.projects.map(p => p.id === id ? updatedProject : p),
          selectedProject: state.selectedProject?.id === id ? updatedProject : state.selectedProject,
        }));
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update project',
      });
    }
  },

  deleteProject: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      await SupabaseService.deleteProject(id);

      set(state => ({
        projects: state.projects.filter(p => p.id !== id),
        selectedProject: state.selectedProject?.id === id ? null : state.selectedProject,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete project',
        isLoading: false
      });
    }
  },

  setSelectedProject: (project: Project | null) => {
    set({ selectedProject: project });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },
}));
