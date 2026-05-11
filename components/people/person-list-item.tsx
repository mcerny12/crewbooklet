'use client';

import { useState } from 'react';
import type { Person } from '@/lib/types/models';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Phone, MapPin, Briefcase } from 'lucide-react';
import { JobCategoryColors } from '@/lib/types/models';
import { useJobTypesStore } from '@/lib/stores/job-types-store';
import { PersonDetailDrawer } from './person-detail-drawer';

interface PersonListItemProps {
  person: Person;
}

export function PersonListItem({ person }: PersonListItemProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const getCategoryForJob = useJobTypesStore(s => s.getCategoryForJob);
  const primaryJob = person.jobs[0];
  const jobCategory = primaryJob ? getCategoryForJob(primaryJob) : null;

  return (
    <>
      <div
        className="cursor-pointer p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900"
        onClick={() => setIsDetailOpen(true)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{person.name}</h3>

            {/* Contact Info */}
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
              {person.email && (
                <div className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {person.email}
                </div>
              )}
              {person.mobile_phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {person.mobile_phone}
                </div>
              )}
              {person.address?.city && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {person.address.city}
                  {person.address.country && `, ${person.address.country}`}
                </div>
              )}
            </div>

            {/* Jobs */}
            {person.jobs.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {person.jobs.slice(0, 3).map((job, index) => (
                  <Badge key={index} variant="secondary">
                    {job}
                  </Badge>
                ))}
                {person.jobs.length > 3 && (
                  <Badge variant="outline">+{person.jobs.length - 3} more</Badge>
                )}
              </div>
            )}
          </div>

          {/* Category Indicator */}
          {jobCategory && (
            <div className="ml-4">
              <Briefcase className="h-5 w-5 text-gray-400" />
            </div>
          )}
        </div>
      </div>

      <PersonDetailDrawer
        person={person}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
    </>
  );
}
