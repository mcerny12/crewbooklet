'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Briefcase, Cake, Receipt } from 'lucide-react';
import {
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  getDay,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfToday,
} from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useInvoiceStore } from '@/lib/stores/invoice-store';
import type { Person, Project } from '@/lib/types/models';
import { InvoiceDocumentType, InvoiceStatus, ProjectStatus } from '@/lib/types/models';

type Category = 'projects' | 'birthdays' | 'invoices';

const ALL_CATEGORIES: Category[] = ['projects', 'birthdays', 'invoices'];
const STORAGE_KEY = 'cb_dashboard_upcoming_filters_v1';

const CATEGORY_META: Record<
  Category,
  { icon: typeof Briefcase; bgClass: string; dotClass: string; ringClass: string }
> = {
  projects:  { icon: Briefcase, bgClass: 'bg-emerald-50 text-emerald-600', dotClass: 'bg-emerald-500', ringClass: 'ring-emerald-500' },
  birthdays: { icon: Cake,      bgClass: 'bg-pink-50 text-pink-600',       dotClass: 'bg-pink-500',    ringClass: 'ring-pink-500' },
  invoices:  { icon: Receipt,   bgClass: 'bg-amber-50 text-amber-600',     dotClass: 'bg-amber-500',   ringClass: 'ring-amber-500' },
};

const CATEGORY_LABEL_KEY: Record<Category, 'categoryProjects' | 'categoryBirthdays' | 'categoryInvoices'> = {
  projects: 'categoryProjects',
  birthdays: 'categoryBirthdays',
  invoices: 'categoryInvoices',
};

interface DayItem {
  id: string;
  date: Date;
  category: Category;
  title: string;
  subtitle?: string;
  href?: string;
  overdue?: boolean;
}

function loadFilters(): Set<Category> {
  if (typeof window === 'undefined') return new Set(ALL_CATEGORIES);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set(ALL_CATEGORIES);
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((x): x is Category => ALL_CATEGORIES.includes(x as Category)));
    }
  } catch {
    // ignore
  }
  return new Set(ALL_CATEGORIES);
}

export function UpcomingEvents({ people, projects }: { people: Person[]; projects: Project[] }) {
  const t = useTranslations('dashboard');
  const format = useFormatter();
  const locale = useLocale();
  const router = useRouter();

  const invoices = useInvoiceStore(s => s.invoices);
  const fetchInvoices = useInvoiceStore(s => s.fetchInvoices);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const [filters, setFilters] = useState<Set<Category>>(() => loadFilters());
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(filters)));
    } catch {
      // ignore
    }
  }, [filters]);

  const today = startOfToday();
  const [selectedDay, setSelectedDay] = useState<Date>(today);

  const toggle = (c: Category) =>
    setFilters(prev => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });

  const allItems = useMemo<DayItem[]>(() => {
    const activeProjectIds = new Set(
      projects
        .filter(p => p.status === ProjectStatus.Production || p.status === ProjectStatus.Budget)
        .map(p => p.id)
    );

    const out: DayItem[] = [];

    if (filters.has('projects')) {
      for (const p of projects) {
        if (!activeProjectIds.has(p.id)) continue;
        if (p.start_date) {
          const d = new Date(p.start_date);
          if (d >= today) {
            out.push({
              id: `project-start-${p.id}`,
              date: d,
              category: 'projects',
              title: p.name,
              subtitle: t('projectStarts'),
              href: `/projects?id=${p.id}`,
            });
          }
        }
        if (p.end_date) {
          const d = new Date(p.end_date);
          if (d >= today) {
            out.push({
              id: `project-end-${p.id}`,
              date: d,
              category: 'projects',
              title: p.name,
              subtitle: t('projectEnds'),
              href: `/projects?id=${p.id}`,
            });
          }
        }
      }
    }

    if (filters.has('birthdays')) {
      for (const person of people) {
        if (!person.date_of_birth) continue;
        const dob = new Date(person.date_of_birth);
        const thisYear = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
        if (thisYear < today) thisYear.setFullYear(thisYear.getFullYear() + 1);
        out.push({
          id: `birthday-${person.id}`,
          date: thisYear,
          category: 'birthdays',
          title: person.name,
          href: `/people?id=${person.id}`,
        });
      }
    }

    if (filters.has('invoices')) {
      for (const inv of invoices) {
        if (!inv.due_date) continue;
        // Currently-collectible invoices only: skip storno docs, skip drafts/paid/cancelled,
        // skip anything superseded by a later revision.
        if (inv.document_type === InvoiceDocumentType.StornoInvoice) continue;
        if (inv.replaced_by_invoice_id) continue;
        if (inv.status !== InvoiceStatus.Sent && inv.status !== InvoiceStatus.Overdue) continue;

        const d = new Date(inv.due_date);
        const overdue = d < today;
        out.push({
          id: `invoice-${inv.id}`,
          date: d,
          category: 'invoices',
          title: inv.recipient_name || inv.invoice_number || inv.id.slice(0, 8),
          subtitle: overdue ? t('overdue') : t('invoiceDue'),
          href: `/invoices?id=${inv.id}`,
          overdue,
        });
      }
    }

    out.sort((a, b) => a.date.getTime() - b.date.getTime());
    return out;
  }, [filters, projects, people, invoices, t, today]);

  // Mini calendar grid for the current month.
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const paddingDays = Array(getDay(monthStart)).fill(null);
  const gridCells: (Date | null)[] = [...paddingDays, ...daysInMonth];

  const weekdayNames = useMemo(() => {
    const base = new Date(2024, 0, 7); // a Sunday
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
    return Array.from({ length: 7 }, (_, i) =>
      fmt.format(new Date(base.getFullYear(), base.getMonth(), base.getDate() + i))
    );
  }, [locale]);

  const categoriesByDay = useMemo(() => {
    const m = new Map<string, Set<Category>>();
    for (const item of allItems) {
      if (!isSameMonth(item.date, today)) continue;
      const key = item.date.toDateString();
      let set = m.get(key);
      if (!set) {
        set = new Set();
        m.set(key, set);
      }
      set.add(item.category);
    }
    return m;
  }, [allItems, today]);

  const selectedDayItems = useMemo(
    () => allItems.filter(item => isSameDay(item.date, selectedDay)),
    [allItems, selectedDay]
  );

  const overdueInvoices = useMemo(
    () => (filters.has('invoices') ? allItems.filter(item => item.overdue) : []),
    [allItems, filters]
  );

  const dayLabel = (d: Date): string => {
    const diff = differenceInCalendarDays(d, today);
    if (diff === 0) return t('today');
    if (diff === 1) return t('tomorrow');
    return format.dateTime(d, { weekday: 'long', day: 'numeric', month: 'short' });
  };

  return (
    <Card>
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-sm font-semibold">{t('upcomingEvents')}</CardTitle>
        <div className="flex flex-wrap gap-1 pt-1">
          {ALL_CATEGORIES.map(c => {
            const active = filters.has(c);
            const meta = CATEGORY_META[c];
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggle(c)}
                aria-pressed={active}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors',
                  active
                    ? cn('border-transparent', meta.bgClass)
                    : 'border-border text-muted-foreground hover:bg-muted'
                )}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    active ? meta.dotClass : 'bg-muted-foreground/40'
                  )}
                />
                {t(CATEGORY_LABEL_KEY[c])}
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="p-3 pt-1 space-y-3">
        {/* Mini calendar grid */}
        <div>
          <p className="text-xs font-semibold text-center mb-1">
            {format.dateTime(today, { month: 'long', year: 'numeric' })}
          </p>
          <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] mb-1">
            {weekdayNames.map((day, i) => (
              <div key={i} className="font-semibold text-muted-foreground">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {gridCells.map((day, i) => {
              if (!day) return <div key={i} className="aspect-square" />;
              const dayCats = categoriesByDay.get(day.toDateString());
              const isToday = isSameDay(day, today);
              const isSelected = isSameDay(day, selectedDay);
              const hasItems = !!dayCats && dayCats.size > 0;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    'aspect-square flex flex-col items-center justify-center rounded-md text-[10px] transition-colors',
                    isSelected
                      ? 'bg-primary/10 ring-1 ring-primary'
                      : hasItems
                        ? 'hover:bg-muted'
                        : 'hover:bg-muted/50 text-muted-foreground',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-full',
                      isToday && !isSelected && 'bg-blue-500 text-white',
                    )}
                  >
                    {format.dateTime(day, { day: 'numeric' })}
                  </span>
                  {hasItems && (
                    <span className="mt-0.5 flex gap-0.5">
                      {ALL_CATEGORIES.filter(c => dayCats!.has(c)).map(c => (
                        <span
                          key={c}
                          className={cn('h-1 w-1 rounded-full', CATEGORY_META[c].dotClass)}
                        />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail frame for the selected day */}
        <div className="border-t pt-2">
          <p className="text-[11px] font-semibold text-muted-foreground mb-1">
            {dayLabel(selectedDay)}
          </p>
          {selectedDayItems.length === 0 ? (
            <p className="py-1 text-center text-[11px] text-muted-foreground">
              {t('noUpcomingEvents')}
            </p>
          ) : (
            <ul className="space-y-0.5">
              {selectedDayItems.map(item => {
                const meta = CATEGORY_META[item.category];
                const Icon = meta.icon;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => item.href && router.push(item.href)}
                      disabled={!item.href}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md py-1 px-1 text-left',
                        item.href && 'hover:bg-muted/40'
                      )}
                    >
                      <span
                        className={cn(
                          'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                          meta.bgClass
                        )}
                      >
                        <Icon className="h-3 w-3" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium">{item.title}</span>
                        {item.subtitle && (
                          <span
                            className={cn(
                              'block truncate text-[10px]',
                              item.overdue ? 'text-red-600' : 'text-muted-foreground'
                            )}
                          >
                            {item.subtitle}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Overdue invoices always visible — they need attention regardless of selected day */}
        {overdueInvoices.length > 0 && (
          <div className="border-t pt-2">
            <p className="text-[11px] font-semibold text-red-600 mb-1">{t('overdue')}</p>
            <ul className="space-y-0.5">
              {overdueInvoices.slice(0, 3).map(item => {
                const meta = CATEGORY_META[item.category];
                const Icon = meta.icon;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => item.href && router.push(item.href)}
                      className="flex w-full items-center gap-2 rounded-md py-1 px-1 text-left hover:bg-muted/40"
                    >
                      <span
                        className={cn(
                          'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                          meta.bgClass
                        )}
                      >
                        <Icon className="h-3 w-3" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium">{item.title}</span>
                        <span className="block truncate text-[10px] text-red-600">
                          {format.dateTime(item.date, { day: 'numeric', month: 'short' })}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
