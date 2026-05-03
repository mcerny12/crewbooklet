'use client';

import { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface ResizableBottomPaneProps {
  onClose: () => void;
  children: ReactNode;
}

export function ResizableBottomPane({ onClose, children }: ResizableBottomPaneProps) {
  return (
    <div className="h-1/2 shrink-0 flex flex-col border-t bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
      {/* Separator bar — clicking it closes the pane */}
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 flex items-center justify-center h-5 border-b border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors w-full"
        title="Close detail pane"
      >
        <ChevronDown className="h-3 w-3 text-gray-400" />
      </button>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
