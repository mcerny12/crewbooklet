'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useFeedback } from './feedback-provider';
import { extractTarget, isSensitiveElement } from './element-inspector';
import { downloadFeedbackXML } from './export-feedback';
import { FeedbackDialog } from './feedback-dialog';

const OVERLAY_CLASS = 'cb-feedback-overlay';

interface HighlightBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function FeedbackOverlay() {
  const { available, isActive, setActive, items, clearItems, selectedTarget, setSelectedTarget } = useFeedback();
  const [highlight, setHighlight] = useState<HighlightBox | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  const isOverlayElement = useCallback((el: Element | null): boolean => {
    if (!el) return false;
    return !!el.closest(`.${OVERLAY_CLASS}`);
  }, []);

  useEffect(() => {
    if (!available || !isActive) return;

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target || isOverlayElement(target)) {
        setHighlight(null);
        return;
      }
      const rect = target.getBoundingClientRect();
      setHighlight({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    };

    const onMouseOut = () => {
      setHighlight(null);
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target || isOverlayElement(target)) return;
      e.preventDefault();
      e.stopPropagation();
      if (isSensitiveElement(target)) {
        alert('Cannot select sensitive elements');
        return;
      }
      setSelectedTarget(extractTarget(target));
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedTarget(null);
        setActive(false);
      }
    };

    document.addEventListener('mouseover', onMouseOver, true);
    document.addEventListener('mouseout', onMouseOut, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mouseover', onMouseOver, true);
      document.removeEventListener('mouseout', onMouseOut, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [available, isActive, isOverlayElement, setActive, setSelectedTarget]);

  useEffect(() => {
    if (!available) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'f' && e.key !== 'F') return;
      const ae = document.activeElement;
      if (ae) {
        const tag = ae.tagName;
        const editable = (ae as HTMLElement).isContentEditable;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || editable) return;
      }
      setActive(!isActive);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [available, isActive, setActive]);

  if (!available) return null;

  const handleExport = () => {
    if (items.length === 0) {
      alert('No feedback items to export.');
      return;
    }
    downloadFeedbackXML(items);
  };

  const handleClear = () => {
    if (items.length === 0) return;
    if (window.confirm('Clear all feedback?')) {
      clearItems();
    }
  };

  return (
    <>
      {isActive && highlight && (
        <div
          className={cn(OVERLAY_CLASS, 'pointer-events-none fixed')}
          style={{
            top: highlight.top,
            left: highlight.left,
            width: highlight.width,
            height: highlight.height,
            outline: '2px solid #2563eb',
            background: 'rgba(37,99,235,0.08)',
            zIndex: 9998,
          }}
        />
      )}

      <div
        ref={toolbarRef}
        className={cn(
          OVERLAY_CLASS,
          'fixed bottom-4 right-4 z-9999 flex items-center gap-2 rounded-xl border bg-card p-2 shadow-lg'
        )}
      >
        <button
          type="button"
          onClick={() => {
            setActive(!isActive);
            setSelectedTarget(null);
          }}
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
            isActive
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted text-foreground hover:bg-muted/80'
          )}
        >
          Feedback Mode: {isActive ? 'ON' : 'OFF'}
        </button>
        <span className="text-xs text-muted-foreground tabular-nums">
          {items.length} item{items.length === 1 ? '' : 's'}
        </span>
        <button
          type="button"
          onClick={handleExport}
          className="rounded-lg border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
        >
          Export XML
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="rounded-lg border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
        >
          Clear
        </button>
      </div>

      {selectedTarget && <FeedbackDialog />}
    </>
  );
}
