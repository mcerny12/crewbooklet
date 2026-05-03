'use client';

import { ReactNode } from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface DetailTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function DetailTabs({ tabs, activeTab, onTabChange }: DetailTabsProps) {
  return (
    <div className="flex border-b border-gray-200 dark:border-gray-800 px-2 shrink-0">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium border-b-2 transition-colors
            ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }
          `}
        >
          {tab.icon && <span className="[&_svg]:h-3 [&_svg]:w-3">{tab.icon}</span>}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
