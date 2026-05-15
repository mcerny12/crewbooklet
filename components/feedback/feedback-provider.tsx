'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { FeedbackItem, FeedbackTarget } from './element-inspector';
import { FeedbackOverlay } from './feedback-overlay';

const STORAGE_KEY = 'cb_feedback_items_v1';

function loadInitialItems(): FeedbackItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed as FeedbackItem[];
  } catch {
    // ignore
  }
  return [];
}

interface FeedbackContextValue {
  isActive: boolean;
  setActive: (active: boolean) => void;
  items: FeedbackItem[];
  addItem: (input: Omit<FeedbackItem, 'id' | 'uuid' | 'timestamp'>) => void;
  clearItems: () => void;
  selectedTarget: FeedbackTarget | null;
  setSelectedTarget: (t: FeedbackTarget | null) => void;
}

const FeedbackCtx = createContext<FeedbackContextValue | null>(null);

export function useFeedback(): FeedbackContextValue {
  const ctx = useContext(FeedbackCtx);
  if (!ctx) throw new Error('useFeedback must be used within FeedbackProvider');
  return ctx;
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setActive] = useState(false);
  const [items, setItems] = useState<FeedbackItem[]>(loadInitialItems);
  const [selectedTarget, setSelectedTarget] = useState<FeedbackTarget | null>(null);
  const hasPersistedOnce = useRef(false);

  useEffect(() => {
    if (!hasPersistedOnce.current) {
      hasPersistedOnce.current = true;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items]);

  const addItem = useCallback(
    (input: Omit<FeedbackItem, 'id' | 'uuid' | 'timestamp'>) => {
      setItems((prev) => {
        const next: FeedbackItem = {
          ...input,
          id: `FB-${(prev.length + 1).toString().padStart(3, '0')}`,
          uuid: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        };
        return [...prev, next];
      });
    },
    []
  );

  const clearItems = useCallback(() => {
    setItems([]);
  }, []);

  const value = useMemo<FeedbackContextValue>(
    () => ({
      isActive,
      setActive,
      items,
      addItem,
      clearItems,
      selectedTarget,
      setSelectedTarget,
    }),
    [isActive, items, addItem, clearItems, selectedTarget]
  );

  return (
    <FeedbackCtx.Provider value={value}>
      {children}
      <FeedbackOverlay />
    </FeedbackCtx.Provider>
  );
}
