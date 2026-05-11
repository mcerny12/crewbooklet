import { create } from 'zustand';
import { SupabaseService } from '@/lib/services/supabase-service';
import { JobCategory, CrewDepartment, JOB_CATEGORY_TO_DEPARTMENT } from '@/lib/types/models';

export interface JobTypeRecord {
  id: string;
  name: string;
  category: string;
  sort_order: number;
}

interface JobTypesState {
  jobTypes: JobTypeRecord[];
  isLoading: boolean;

  fetchJobTypes: () => Promise<void>;
  addJobType: (name: string, category: string) => Promise<void>;
  updateJobType: (id: string, updates: { name?: string; category?: string }) => Promise<void>;
  deleteJobType: (id: string) => Promise<void>;

  getCategoryForJob: (name: string) => string;
  getDepartmentForJob: (name: string) => CrewDepartment | null;
}

export const useJobTypesStore = create<JobTypesState>((set, get) => ({
  jobTypes: [],
  isLoading: false,

  fetchJobTypes: async () => {
    set({ isLoading: true });
    const data = await SupabaseService.fetchJobTypes();
    set({ jobTypes: data, isLoading: false });
  },

  addJobType: async (name: string, category: string) => {
    const maxOrder = get().jobTypes
      .filter(j => j.category === category)
      .reduce((m, j) => Math.max(m, j.sort_order), 0);
    await SupabaseService.addJobType(name, category, maxOrder + 1);
    await get().fetchJobTypes();
  },

  updateJobType: async (id: string, updates) => {
    await SupabaseService.updateJobType(id, updates);
    set(state => ({
      jobTypes: state.jobTypes.map(j => j.id === id ? { ...j, ...updates } : j),
    }));
  },

  deleteJobType: async (id: string) => {
    await SupabaseService.deleteJobType(id);
    set(state => ({ jobTypes: state.jobTypes.filter(j => j.id !== id) }));
  },

  getCategoryForJob: (name: string) => {
    return get().jobTypes.find(j => j.name === name)?.category ?? 'Other';
  },

  getDepartmentForJob: (name: string) => {
    const category = get().getCategoryForJob(name) as JobCategory;
    return JOB_CATEGORY_TO_DEPARTMENT[category] ?? CrewDepartment.Other;
  },
}));
