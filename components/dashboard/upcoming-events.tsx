'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Briefcase, Cake, Receipt } from 'lucide-react';
import { differenceInCalendarDays, startOfToday } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useInvoiceStore } from '@/lib/stores/invoice-store';
import type { Person, Project } from '@/lib/types/models';
import { InvoiceStatus, ProjectStatus } from '@/lib/types/models';

type Category = 'projects' | 'birthdays' | 'invoices';

const ALL_CATEGORIES: Category[] = ['projects', 'birthdays', 'invoices'];
const STORAGE_KEY = 'cb_dashboard_upcoming_filters_v1';
const WINDOW_DAYS = 60;
const MAX_VISIBLE = 8;

const CATEGORY_META: Record<
  Category,
  { icon: typeof Briefcase; bgClass: string; dotClass: string }
> = {
  projects:  { icon: Briefcase, bgClass: 'bg-emerald-50 text-emerald-600', dotClass: 'bg-emerald-500' },
  birthdays: { icon: Cake,      bgClass: 'bg-pink-50 text-pink-600',       dotClass: 'bg-pink-500' },
  invoices:  { icon: Receipt,   bgClass: 'bg-amber-50 text-amber-600',     dotClass: 'bg-amber-500' },
};

const CATEGORY_LABEL_KEY: Record<Category, 'categoryProjects' | 'categoryBirthdays' | 'categoryInvoices'> = {
  projects: 'categoryProjects',
  birthdays: 'categoryBirthdays',
  invoices: 'categoryInvoices',
};

interface UpcomingItem {
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

  const toggle = (c: Category) =>
    setFilters(prev => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });

  const items = useMemo(() => {
    const today = startOfToday();
    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + WINDOW_DAYS);

    const activeProjectIds = new Set(
      projects
        .filter(p => p.status === ProjectStatus.Production || p.status === ProjectStatus.Budget)
        .map(p => p.id)
    );

    const out: UpcomingItem[] = [];

    if (filters.has('projects')) {
      for (const p of projects) {
        if (!activeProjectIds.has(p.id)) continue;
        if (p.start_date) {
          const d = new Date(p.start_date);
          if (d >= today && d <= horizon) {
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
          if (d >= today && d <= horizon) {
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
        if (thisYear <= horizon) {
          out.push({
            id: `birthday-${person.id}`,
            date: thisYear,
            category: 'birthdays',
            title: person.name,
            href: `/people?id=${person.id}`,
          });
        }
      }
    }

    if (filters.has('invoices')) {
      for (const inv of invoices) {
        if (!inv.due_date) continue;
        if (inv.status === InvoiceStatus.Paid || inv.status === InvoiceStatus.Cancelled) continue;
        const d = new Date(inv.due_date);
        const overdue = d < today;
        if (!overdue && d > horizon) continue;
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
  }, [filters, projects, people, invoices, t]);

  const visible = items.slice(0, MAX_VISIBLE);
  const overflow = items.length - visible.length;

  const dateLabel = (d: Date): string => {
    const today = startOfToday();
    const diff = differenceInCalendarDays(d, today);
    if (diff === 0) return t('today');
    if (diff === 1) return t('tomorrow');
    return format.dateTime(d, { day: 'numeric', month: 'short' });
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
      <CardContent className="p-3 pt-1">
        {visible.length === 0 ? (
          <p className="py-2 text-center text-xs text-muted-foreground">{t('noUpcomingEvents')}</p>
        ) : (
          <ul className="divide-y">
            {visible.map(item => {
              const meta = CATEGORY_META[item.category];
              const Icon = meta.icon;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => item.href && router.push(item.href)}
                    disabled={!item.href}
                    className={cn(
                      'flex w-full items-center gap-2 py-1.5 text-left rounded-md',
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
                    <span
                      className={cn(
                        'shrink-0 tabular-nums text-[11px]',
                        item.overdue ? 'text-red-600 font-medium' : 'text-muted-foreground'
                      )}
                    >
                      {dateLabel(item.date)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {overflow > 0 && (
          <p className="pt-2 text-center text-[10px] text-muted-foreground">+{overflow}</p>
        )}
      </CardContent>
    </Card>
  );
}
