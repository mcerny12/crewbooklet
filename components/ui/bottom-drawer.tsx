'use client';

import { ReactNode, useState, useRef, useEffect, useCallback } from 'react';
import { X, GripHorizontal } from 'lucide-react';

interface BottomDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  title?: string;
}

export function BottomDrawer({ open, onOpenChange, children, title }: BottomDrawerProps) {
  const [height, setHeight] = useState(55); // Default 55vh
  const [isDragging, setIsDragging] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const currentMouseYRef = useRef(0);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    e.preventDefault();
    currentMouseYRef.current = e.clientY;

    // Calculate and update immediately - no RAF needed for direct DOM manipulation
    const deltaY = startYRef.current - currentMouseYRef.current;
    const deltaVh = (deltaY / viewportHeightRef.current) * 100;
    const newHeight = Math.min(Math.max(startHeightRef.current + deltaVh, 20), 85);

    // Update DOM directly during drag
    if (drawerRef.current) {
      drawerRef.current.style.height = `${newHeight}vh`;
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    // Update React state only when drag ends
    if (drawerRef.current) {
      const finalHeight = parseFloat(drawerRef.current.style.height);
      if (!isNaN(finalHeight)) {
        setHeight(finalHeight);
      }
    }

    setIsDragging(false);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startYRef.current = e.clientY;
    startHeightRef.current = height;
    viewportHeightRef.current = window.innerHeight; // Cache viewport height
    e.preventDefault();
  };

  // Add/remove mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';

      // Add will-change hint for better performance
      if (drawerRef.current) {
        drawerRef.current.style.willChange = 'height';
      }
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      // Remove will-change hint when done
      if (drawerRef.current) {
        drawerRef.current.style.willChange = '';
      }
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (drawerRef.current) {
        drawerRef.current.style.willChange = '';
      }
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-end pointer-events-none">
      {/* Semi-transparent backdrop */}
      <div
        className="absolute inset-0 bg-black/30 pointer-events-auto"
        onClick={() => onOpenChange(false)}
      />

      {/* Drawer content */}
      <div
        ref={drawerRef}
        className="relative w-full bg-white dark:bg-gray-900 rounded-t-lg shadow-2xl border-t border-gray-200 dark:border-gray-800 animate-in slide-in-from-bottom duration-200 pointer-events-auto flex flex-col"
        style={{ height: `${height}vh` }}
      >
        {/* Resize handle */}
        <div
          className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-blue-500/20 active:bg-blue-500/30 flex items-center justify-center group touch-none select-none"
          onMouseDown={handleMouseDown}
          style={{ touchAction: 'none' }}
        >
          <div className="absolute top-1 bg-gray-300 dark:bg-gray-600 rounded-full w-12 h-1 group-hover:bg-blue-500 transition-colors pointer-events-none" />
        </div>

        {/* Drawer header - more compact */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 mt-2 shrink-0">
          {title && (
            <h2 className="text-sm font-semibold">{title}</h2>
          )}
          <button
            onClick={() => onOpenChange(false)}
            className="ml-auto p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Drawer body - flex column to layout tabs and content */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
}
