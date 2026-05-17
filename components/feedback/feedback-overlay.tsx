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

export function FeedbackOverlay() {
  const { isActive, setActive, items, clearItems, selectedTarget, setSelectedTarget } = useFeedback();
  const [highlight, setHighlight] = useState<HighlightBox | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  const isOverlayElement = useCallback((el: Element | null): boolean => {
    if (!el) return false;
    return !!el.closest(`.${OVERLAY_CLASS}`);
  }, []);

  useEffect(() => {
    if (!isActive) return;

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

    // Radix Dialog closes on pointerdown/mousedown outside its content
    // (`onPointerDownOutside`). When feedback mode is on, the user wants to
    // click elements anywhere — including outside an open dialog — without
    // closing the dialog. Swallow these events on the capture phase so
    // Radix never sees them; the `click` handler above still captures the
    // target for the inspector.
    const swallowPointer = (e: Event) => {
      const target = e.target as Element | null;
      if (!target || isOverlayElement(target)) return;
      e.preventDefault();
      e.stopPropagation();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedTarget(null);
        setActive(false);
      }
    };

    document.addEventListener('mouseover', onMouseOver, true);
    document.addEventListener('mouseout', onMouseOut, true);
    document.addEventListener('pointerdown', swallowPointer, true);
    document.addEventListener('mousedown', swallowPointer, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mouseover', onMouseOver, true);
      document.removeEventListener('mouseout', onMouseOut, true);
      document.removeEventListener('pointerdown', swallowPointer, true);
      document.removeEventListener('mousedown', swallowPointer, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isActive, isOverlayElement, setActive, setSelectedTarget]);

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
  // (Radix Dialog, BottomDrawer, native popups), and must NOT be hidden by
  // Radix's aria-hidden / inert sweeps when a Dialog opens. To guarantee
  // both, portal them into a dedicated container appended to <body>.
  //
  // Portalling directly to document.body during render races with React's
  // reconciliation when other portals (Radix Dialog) mount/unmount as
  // body children — manifests as
  //   "Failed to execute 'insertBefore'/'removeChild' on 'Node'".
  // A stable, owned container that React fully controls avoids that.
  // Create the host element in a lazy state initialiser so it exists from
  // first render and we don't have to do setState inside an effect. The
  // effect only handles attach/detach to <body>.
  const [portalNode] = useState<HTMLDivElement | null>(() => {
    if (typeof document === 'undefined') return null;
    const el = document.createElement('div');
    el.setAttribute('data-feedback-portal', '');
    // The children already use position: fixed; the wrapper just provides
    // a stable mount point that React owns and can patch without touching
    // <body>'s other children (which is what causes the
    // "insertBefore / removeChild" portal race against other portals).
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

  return (
    <>
      {portalNode && createPortal(overlay, portalNode)}
      {selectedTarget && <FeedbackDialog />}
    </>
  );
}
