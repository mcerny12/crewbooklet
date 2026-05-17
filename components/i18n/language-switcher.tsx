'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { Languages } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { writeLocaleCookie } from '@/lib/i18n/locale-cookie';
import { locales, type Locale, LOCALE_LABELS } from '@/i18n/routing';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  collapsed?: boolean;
}

export function LanguageSwitcher({ collapsed = false }: LanguageSwitcherProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations('language');
  const [pending, startTransition] = useTransition();

  const setLocale = (next: Locale) => {
    if (next === locale || pending) return;
    writeLocaleCookie(next);
    startTransition(() => {
      // Server-side `i18n/request.ts` reads the cookie at render time,
      // so a hard navigation refresh picks up the new messages.
      window.location.reload();
    });
  };

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => setLocale(locale === 'de' ? 'en' : 'de')}
            aria-label={t('switchTo')}
            title={LOCALE_LABELS[locale]}
            className="flex h-10 w-full items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <Languages className="h-5 w-5 shrink-0" aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" align="center">
          {LOCALE_LABELS[locale]}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div
      role="group"
      aria-label={t('label')}
      className="flex w-full items-center gap-1 rounded-xl border bg-background p-1"
    >
      <Languages className="ml-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      {locales.map((value) => {
        const active = value === locale;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setLocale(value)}
            aria-pressed={active}
            disabled={pending}
            className={cn(
              'flex-1 h-7 rounded-lg text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
              active
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {LOCALE_LABELS[value]}
          </button>
        );
      })}
    </div>
  );
}
