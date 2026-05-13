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

  const isModified = new Date(updatedAt).getTime() > new Date(createdAt).getTime() + 1000;

  return (
    <div className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight flex flex-wrap items-center gap-x-1.5">
      <span>Created {formatDate(createdAt)}</span>
      {isModified && (
        <>
          <span aria-hidden>·</span>
          <span>Updated {formatDate(updatedAt)}</span>
        </>
      )}
      {userId && (
        <>
          <span aria-hidden>·</span>
          <span>{userId.slice(0, 8)}</span>
        </>
      )}
    </div>
  );
}
