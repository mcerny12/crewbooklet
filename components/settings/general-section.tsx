'use client';

import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserSettings } from '@/lib/hooks/use-user-settings';
import type { AppLanguage } from '@/lib/types/models';

export function GeneralSection() {
  const t = useTranslations('settings');
  const { appLanguage, setAppLanguage, isLoading } = useUserSettings();

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-5 space-y-4 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold">{t('appLanguage.label')}</h3>
          <p className="text-xs text-muted-foreground mt-1">{t('appLanguage.helper')}</p>
        </div>
        <div className="max-w-xs">
          <Label htmlFor="settings-app-language" className="sr-only">{t('appLanguage.label')}</Label>
          <Select
            value={appLanguage}
            onValueChange={(v) => setAppLanguage(v as AppLanguage)}
            disabled={isLoading}
          >
            <SelectTrigger id="settings-app-language" className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="de" className="text-sm">{t('appLanguage.options.de')}</SelectItem>
              <SelectItem value="en" className="text-sm">{t('appLanguage.options.en')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
