'use client';

import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  colorClass?: string;
  onClick?: () => void;
}

export function StatCard({ title, value, icon: Icon, colorClass = 'text-blue-600', onClick }: StatCardProps) {
  return (
    <Card
      className={onClick ? 'cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]' : ''}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {title}
            </p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className={`${colorClass}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
