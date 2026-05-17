'use client';

import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Person } from '@/lib/types/models';
import { isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';

interface BirthdayCalendarProps {
  people: Person[];
}

export function BirthdayCalendar({ people }: BirthdayCalendarProps) {
  const t = useTranslations('dashboard');
  const tCalendar = useTranslations('calendar');
  const format = useFormatter();
  const locale = useLocale();

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startDayOfWeek = getDay(monthStart);
  const paddingDays = Array(startDayOfWeek).fill(null);
  const allDays = [...paddingDays, ...daysInMonth];

  const weekdayNames = (() => {
    const base = new Date(2024, 0, 7); // a Sunday
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(base.getFullYear(), base.getMonth(), base.getDate() + i)));
  })();

  const hasBirthdayOnDay = (day: Date) => {
    return people.some(person => {
      if (!person.date_of_birth) return false;
      const dob = new Date(person.date_of_birth);
      return dob.getMonth() === day.getMonth() && dob.getDate() === day.getDate();
    });
  };

  const upcomingBirthdays = people
    .filter(person => {
      if (!person.date_of_birth) return false;
      const dob = new Date(person.date_of_birth);
      return dob.getMonth() === now.getMonth();
    })
    .map(person => ({
      person,
      date: new Date(now.getFullYear(), new Date(person.date_of_birth!).getMonth(), new Date(person.date_of_birth!).getDate())
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 3);

  return (
    <Card>
      <CardHeader className="p-3">
        <CardTitle className="text-sm font-semibold">{t('birthdays')}</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="mb-2">
          <p className="text-xs font-semibold text-center mb-1">
            {format.dateTime(now, { month: 'long', year: 'numeric' })}
          </p>

          <div className="grid grid-cols-7 gap-0.5 text-center text-xs mb-1">
            {weekdayNames.map((day, i) => (
              <div key={i} className="font-semibold text-gray-500 text-[10px]">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center">
            {allDays.map((day, i) => (
              <div key={i} className="aspect-square flex flex-col items-center justify-center text-[10px]">
                {day ? (
                  <>
                    <span className={`${isSameDay(day, now) ? 'bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center' : ''}`}>
                      {format.dateTime(day, { day: 'numeric' })}
                    </span>
                    {hasBirthdayOnDay(day) && <span className="text-[10px]">🎂</span>}
                  </>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-2">
          {upcomingBirthdays.length === 0 ? (
            <p className="text-xs text-gray-500 text-center">{t('noUpcomingBirthdays')}</p>
          ) : (
            <div className="space-y-1">
              {upcomingBirthdays.map(({ person, date }) => (
                <div key={person.id} className="flex items-center gap-1.5 text-xs">
                  <span className="text-sm">🎂</span>
                  <span className="font-medium truncate">{person.name}</span>
                  <span className="text-gray-500 text-xs">
                    {isSameDay(date, now) ? tCalendar('today') : format.dateTime(date, { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
