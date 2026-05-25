'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

const TOOLBAR_Z = 2147483000;
const HIGHLIGHT_Z = TOOLBAR_Z - 1;
// The intercept layer sits just below the toolbar/highlight but above every
// Radix dialog (z-50) and BottomDrawer. It captures pointer events before any
// other listener on the document can react to them — that's the only reliable
// way to keep Radix Dialog's `onPointerDownOutside` from dismissing a popup
// while the user is inspecting an element inside it.
const INTERCEPT_Z = HIGHLIGHT_Z - 1;

function useFeedbackFlagEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const check = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        setEnabled(params.get('feedback') === '1');
      } catch {
        setEnabled(false);
      }
    };
    check();
    window.addEventListener('popstate', check);
    return () => window.removeEventListener('popstate', check);
  }, []);
  return enabled;
}

export function FeedbackOverlay() {
  const flagEnabled = useFeedbackFlagEnabled();
  const { isActive, setActive, items, clearItems, selectedTarget, setSelectedTarget } = useFeedback();
  const [highlight, setHighlight] = useState<HighlightBox | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  const isOverlayElement = useCallback((el: Element | null): boolean => {
    if (!el) return false;
    return !!el.closest(`.${OVERLAY_CLASS}`);
  }, []);

  // Escape key still closes inspector / mode.
  useEffect(() => {
    if (!isActive) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedTarget(null);
        setActive(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isActive, setActive, setSelectedTarget]);

  // Block Radix DismissableLayer's document-level pointerdown listener while
  // feedback mode is on. The intercept <div> below catches the click for our
  // own React handler, but native pointerdown still bubbles through to
  // document — where Radix sees the intercept as "outside" the dialog and
  // dismisses the popup. React's stopPropagation does not stop native
  // document listeners, so we listen on `window` during the CAPTURE phase
  // (which fires before any document listener) and stop propagation there.
  useEffect(() => {
    if (!isActive) return;
    const stop = (e: Event) => {
      const t = e.target as Element | null;
      // Allow events targeted at the toolbar / FeedbackDialog through so the
      // user can still interact with feedback controls themselves.
      if (!t || isOverlayElement(t)) return;
      e.stopPropagation();
    };
    window.addEventListener('pointerdown', stop, true);
    window.addEventListener('mousedown', stop, true);
    return () => {
      window.removeEventListener('pointerdown', stop, true);
      window.removeEventListener('mousedown', stop, true);
    };
  }, [isActive, isOverlayElement]);

  // Find the real element under the cursor by briefly hiding the intercept
  // layer so elementFromPoint sees through it.
  const elementAtPoint = useCallback(
    (clientX: number, clientY: number, interceptEl: HTMLElement | null): Element | null => {
      const prev = interceptEl?.style.pointerEvents;
      if (interceptEl) interceptEl.style.pointerEvents = 'none';
      const el = document.elementFromPoint(clientX, clientY);
      if (interceptEl) interceptEl.style.pointerEvents = prev || 'auto';
      return el;
    },
    []
  );

  const interceptRef = useRef<HTMLDivElement | null>(null);

  const handleInterceptMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = elementAtPoint(e.clientX, e.clientY, interceptRef.current);
    if (!el || isOverlayElement(el)) {
      setHighlight(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    setHighlight({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
  }, [elementAtPoint, isOverlayElement]);

  const handleInterceptLeave = useCallback(() => setHighlight(null), []);

  const handleInterceptClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const el = elementAtPoint(e.clientX, e.clientY, interceptRef.current);
    if (!el || isOverlayElement(el)) return;
    if (isSensitiveElement(el)) {
      alert('Cannot select sensitive elements');
      return;
    }
    setSelectedTarget(extractTarget(el));
  }, [elementAtPoint, isOverlayElement, setSelectedTarget]);

  // Eat pointerdown / mousedown so nothing underneath (Radix DismissableLayer,
  // focus changes, native button presses) reacts before our click handler
  // runs. React's onPointerDown on the intercept layer is enough because the
  // event never reaches the document — the overlay is the topmost hit.
  const swallow = useCallback((e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  useEffect(() => {
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
  }, [isActive, setActive]);

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

  // The toolbar and highlight must sit above every other layer in the app
  // (Radix Dialog, BottomDrawer, native popups). Portal them into a dedicated
  // container appended to <body>. The host is created in a lazy useState
  // initialiser (client-only via the typeof guard) so it exists on first
  // render, and a separate effect handles attach/detach to <body>.
  const [portalNode] = useState<HTMLDivElement | null>(() => {
    if (typeof document === 'undefined') return null;
    const el = document.createElement('div');
    el.setAttribute('data-feedback-portal', '');
    el.style.position = 'fixed';
    el.style.top = '0';
    el.style.left = '0';
    el.style.width = '0';
    el.style.height = '0';
    el.style.zIndex = String(TOOLBAR_Z);
    return el;
  });
  useEffect(() => {
    if (!portalNode) return;
    document.body.appendChild(portalNode);
    return () => {
      if (portalNode.parentNode) portalNode.parentNode.removeChild(portalNode);
    };
  }, [portalNode]);

  const overlay = (
    <>
      {/* Full-viewport intercept layer. Only active in feedback mode. Hidden
          while the FeedbackDialog (target editor) is open so the user can
          actually use that form. */}
      {isActive && !selectedTarget && (
        <div
          ref={interceptRef}
          className={cn(OVERLAY_CLASS, 'fixed inset-0')}
          style={{
            zIndex: INTERCEPT_Z,
            pointerEvents: 'auto',
            background: 'transparent',
            cursor: 'crosshair',
          }}
          onPointerMove={handleInterceptMove}
          onPointerLeave={handleInterceptLeave}
          onPointerDown={swallow}
          onMouseDown={swallow}
          onClick={handleInterceptClick}
          onContextMenu={swallow}
          data-radix-focus-guard=""
        />
      )}

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
            zIndex: HIGHLIGHT_Z,
          }}
          // Radix sweeps siblings with aria-hidden when a Dialog opens; opt
          // this node out so screen readers still see the highlight overlay
          // (and so any tooling that turns aria-hidden into inert doesn't
          // disable it).
          data-radix-focus-guard=""
        />
      )}

      <div
        ref={toolbarRef}
        className={cn(
          OVERLAY_CLASS,
          'fixed bottom-4 right-4 flex items-center gap-2 rounded-xl border bg-card p-2 shadow-lg'
        )}
        style={{ zIndex: TOOLBAR_Z, pointerEvents: 'auto' }}
        data-radix-focus-guard=""
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
    </>
  );

  if (!flagEnabled && !isActive) return null;

  return (
    <>
      {portalNode && createPortal(overlay, portalNode)}
      {selectedTarget && <FeedbackDialog />}
    </>
  );
}
