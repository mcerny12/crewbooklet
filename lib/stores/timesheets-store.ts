import { create } from 'zustand';
import { SupabaseService } from '@/lib/services/supabase-service';
import type { Timesheet, TimesheetEntry, ProjectTimesheetDefaults } from '@/lib/timesheets/types';

interface TimesheetsState {
  timesheets: Timesheet[];
  selectedTimesheet: Timesheet | null;
  entries: TimesheetEntry[]; // entries for selectedTimesheet
  entriesByTimesheetId: Record<string, TimesheetEntry[]>; // batch-loaded, for the overview's pay-at-a-glance
  isLoading: boolean;
  isLoadingEntries: boolean;
  isLoadingAllEntries: boolean;
  error: string | null;

  // Actions
  loadTimesheets: () => Promise<void>;
  loadTimesheetsByProject: (projectId: string) => Promise<Timesheet[]>;
  loadAllEntriesForTimesheets: (timesheetIds: string[]) => Promise<void>;
  selectTimesheet: (sheet: Timesheet | null) => void;
  loadEntries: (timesheetId: string) => Promise<void>;
  addTimesheet: (
    sheet: Omit<Timesheet, 'id' | 'created_at' | 'updated_at'>
  ) => Promise<Timesheet | null>;
  updateTimesheet: (id: string, updates: Partial<Timesheet>) => Promise<void>;
  deleteTimesheet: (id: string) => Promise<void>;
  upsertEntry: (
    entry: Omit<TimesheetEntry, 'id' | 'created_at' | 'updated_at'>
  ) => Promise<TimesheetEntry | null>;
  deleteEntry: (id: string, entryDate: string) => Promise<void>;
}

export const useTimesheetsStore = create<TimesheetsState>((set, get) => ({
  timesheets: [],
  selectedTimesheet: null,
  entries: [],
  entriesByTimesheetId: {},
  isLoading: false,
  isLoadingEntries: false,
  isLoadingAllEntries: false,
  error: null,

  loadTimesheets: async () => {
    set({ isLoading: true, error: null });
    try {
      const timesheets = await SupabaseService.fetchTimesheets();
      set({ timesheets, isLoading: false });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  loadTimesheetsByProject: async (projectId: string) => {
    const sheets = await SupabaseService.fetchTimesheetsByProject(projectId);
    return sheets;
  },

  loadAllEntriesForTimesheets: async (timesheetIds: string[]) => {
    set({ isLoadingAllEntries: true });
    try {
      const entries = await SupabaseService.fetchTimesheetEntriesForTimesheets(timesheetIds);
      const grouped: Record<string, TimesheetEntry[]> = {};
      for (const e of entries) {
        (grouped[e.timesheet_id] ??= []).push(e);
      }
      set({ entriesByTimesheetId: grouped, isLoadingAllEntries: false });
    } catch {
      set({ isLoadingAllEntries: false });
    }
  },

  selectTimesheet: (sheet) => {
    set({ selectedTimesheet: sheet, entries: [] });
    if (sheet) get().loadEntries(sheet.id);
  },

  loadEntries: async (timesheetId: string) => {
    set({ isLoadingEntries: true });
    try {
      const entries = await SupabaseService.fetchTimesheetEntries(timesheetId);
      set({ entries, isLoadingEntries: false });
    } catch {
      set({ isLoadingEntries: false });
    }
  },

  addTimesheet: async (sheet) => {
    const created = await SupabaseService.addTimesheet(sheet);
    if (created) {
      set((s) => ({ timesheets: [created, ...s.timesheets] }));
    }
    return created;
  },

  updateTimesheet: async (id, updates) => {
    const updated = await SupabaseService.updateTimesheet(id, updates);
    if (!updated) return;
    set((s) => ({
      timesheets: s.timesheets.map((t) => (t.id === id ? updated : t)),
      selectedTimesheet: s.selectedTimesheet?.id === id ? updated : s.selectedTimesheet,
    }));
  },

  deleteTimesheet: async (id) => {
    await SupabaseService.deleteTimesheet(id);
    set((s) => ({
      timesheets: s.timesheets.filter((t) => t.id !== id),
      selectedTimesheet: s.selectedTimesheet?.id === id ? null : s.selectedTimesheet,
      entries: s.selectedTimesheet?.id === id ? [] : s.entries,
    }));
  },

  upsertEntry: async (entry) => {
    const upserted = await SupabaseService.upsertTimesheetEntry(entry);
    if (!upserted) return null;
    set((s) => {
      const exists = s.entries.some((e) => e.entry_date === upserted.entry_date);
      return {
        entries: exists
          ? s.entries.map((e) => (e.entry_date === upserted.entry_date ? upserted : e))
          : [...s.entries, upserted].sort((a, b) => a.entry_date.localeCompare(b.entry_date)),
      };
    });
    return upserted;
  },

  deleteEntry: async (id, entryDate) => {
    await SupabaseService.deleteTimesheetEntry(id);
    set((s) => ({ entries: s.entries.filter((e) => e.entry_date !== entryDate) }));
  },
}));

// Separate hook for project timesheet defaults (not persisted in global store)
export async function loadProjectTimesheetDefaults(
  projectId: string
): Promise<ProjectTimesheetDefaults | null> {
  return SupabaseService.fetchProjectTimesheetDefaults(projectId);
}

export async function saveProjectTimesheetDefaults(
  defaults: Partial<ProjectTimesheetDefaults> & { project_id: string }
): Promise<ProjectTimesheetDefaults | null> {
  return SupabaseService.upsertProjectTimesheetDefaults(defaults);
}
