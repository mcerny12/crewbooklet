import { create } from 'zustand';
import type { ProjectCalendar, CalendarEvent } from '@/lib/types/models';
import { SupabaseService } from '@/lib/services/supabase-service';

interface CalendarState {
  calendars: ProjectCalendar[];
  events: CalendarEvent[];
  isLoading: boolean;
  error: string | null;

  fetchAll: () => Promise<void>;
  createCalendar: (projectId: string, name: string, color: string, sortOrder: number) => Promise<ProjectCalendar>;
  updateCalendar: (id: string, updates: Partial<ProjectCalendar>) => Promise<void>;
  deleteCalendar: (id: string) => Promise<void>;
  createEvent: (event: Omit<CalendarEvent, 'id' | 'created_at'>) => Promise<CalendarEvent>;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  calendars: [],
  events: [],
  isLoading: false,
  error: null,

  fetchAll: async () => {
    set({ isLoading: true });
    try {
      const [calendars, events] = await Promise.all([
        SupabaseService.fetchAllCalendars(),
        SupabaseService.fetchAllEvents(),
      ]);
      set({ calendars, events, isLoading: false, error: null });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? String(err);
      console.error('Calendar fetchAll failed:', msg, err);
      set({ isLoading: false, error: msg });
    }
  },

  createCalendar: async (projectId, name, color, sortOrder) => {
    const cal = await SupabaseService.createCalendar(projectId, name, color, sortOrder);
    set(s => ({ calendars: [...s.calendars, cal] }));
    return cal;
  },

  updateCalendar: async (id, updates) => {
    const updated = await SupabaseService.updateCalendar(id, updates);
    set(s => ({ calendars: s.calendars.map(c => c.id === id ? updated : c) }));
  },

  deleteCalendar: async (id) => {
    await SupabaseService.deleteCalendar(id);
    set(s => ({
      calendars: s.calendars.filter(c => c.id !== id),
      events: s.events.filter(e => e.calendar_id !== id),
    }));
  },

  createEvent: async (event) => {
    const created = await SupabaseService.createEvent(event);
    set(s => ({ events: [...s.events, created] }));
    return created;
  },

  updateEvent: async (id, updates) => {
    const updated = await SupabaseService.updateEvent(id, updates);
    set(s => ({ events: s.events.map(e => e.id === id ? updated : e) }));
  },

  deleteEvent: async (id) => {
    await SupabaseService.deleteEvent(id);
    set(s => ({ events: s.events.filter(e => e.id !== id) }));
  },
}));
