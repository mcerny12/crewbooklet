'use client';

import { format } from 'date-fns';

interface EntryMetadataProps {
  createdAt: string;
  updatedAt: string;
  userId?: string | null;
}

export function EntryMetadata({ createdAt, updatedAt, userId }: EntryMetadataProps) {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy \'at\' h:mm a');
    } catch {
      return dateString;
    }
  };

  const isModified = new Date(updatedAt).getTime() > new Date(createdAt).getTime() + 1000; // Allow 1 sec buffer

  return (
    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
      <div className="flex items-center gap-2">
        <span className="font-medium">Created:</span>
        <span>{formatDate(createdAt)}</span>
        {userId && <span className="text-gray-400">• User: {userId.slice(0, 8)}</span>}
      </div>
      {isModified && (
        <div className="flex items-center gap-2">
          <span className="font-medium">Updated:</span>
          <span>{formatDate(updatedAt)}</span>
        </div>
      )}
    </div>
  );
}
