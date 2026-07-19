'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { format, parseISO } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { X, Printer, Trash2, Info, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { cn } from '@/lib/utils';
import { TimesheetWeekGrid } from './timesheet-week-grid';
import { TimesheetEstimatePanel } from './timesheet-estimate-panel';
import { useTimesheetsStore } from '@/lib/stores/timesheets-store';
import { useProjectsStore } from '@/lib/stores/projects-store';
import { HOME_BASE_DEFAULT } from '@/lib/timesheets/ruleset';
import type { Timesheet, TimesheetEntry, CustomRulesOverride } from '@/lib/timesheets/types';

const DEBOUNCE_MS = 1000;

interface Props {
  timesheet: Timesheet;
  onClose: () => void;
  onDeleted: () => void;
}

function formatWeekHeader(weekStart: string, dateLocale: typeof de, weekAbbr: string): string {
  try {
    const monday = parseISO(weekStart);
    return `${weekAbbr} ${format(monday, 'w', { locale: dateLocale })} — ${format(monday, 'd. MMMM yyyy', { locale: dateLocale })}`;
  } catch {
    return weekStart;
  }
}

// ─── Custom-mode settings panel (Bug #1) ────────────────────────────────────

const TV_FFS_DEFAULTS = {
  dailyOtStartH: 10,
  dailyOtBand1Pct: 25,
  dailyOtBand2Pct: 50,
  weeklyOtThresholdH: 50,
  weeklyOtBand1EndH: 55,
  weeklyOtBand1Pct: 25,
  weeklyOtBand2Pct: 50,
  nightEnabled: true,
  nightPct: 25,
  saturdayEnabled: true,
  saturdayPct: 25,
  sundayEnabled: true,
  sundayPct: 75,
  holidayEnabled: true,
  holidayPct: 100,
};

type NumericKey = keyof Omit<CustomRulesOverride, 'nightEnabled' | 'saturdayEnabled' | 'sundayEnabled' | 'holidayEnabled' | 'homeBase'>;
type BoolKey = 'nightEnabled' | 'saturdayEnabled' | 'sundayEnabled' | 'holidayEnabled';

interface CustomRulesPanelProps {
  rules: CustomRulesOverride;
  perDiemFullCents: number;
  perDiemPartialCents: number;
  onRulesChange: (overrides: CustomRulesOverride) => void;
  onPerDiemFullChange: (cents: number) => void;
  onPerDiemPartialChange: (cents: number) => void;
}

function CustomRulesPanel({
  rules,
  perDiemFullCents,
  perDiemPartialCents,
  onRulesChange,
  onPerDiemFullChange,
  onPerDiemPartialChange,
}: CustomRulesPanelProps) {
  const t = useTranslations('timesheets.customRules');
  const tFields = useTranslations('timesheets.fields');
  const [isExpanded, setIsExpanded] = useState(true);

  // Local state gives instant feedback instead of waiting on the parent's
  // debounced (1000ms + network) save to round-trip back down as a prop.
  const [localRules, setLocalRules] = useState<CustomRulesOverride>(rules);
  // Raw text per numeric field while it's being edited, so an in-progress
  // (or momentarily empty) keystroke is never silently rejected and snapped
  // back to the last committed value.
  const [draftText, setDraftText] = useState<Partial<Record<NumericKey, string>>>({});

  function isDefault(key: keyof typeof TV_FFS_DEFAULTS): boolean {
    return localRules[key as keyof CustomRulesOverride] === undefined;
  }

  function val<K extends keyof typeof TV_FFS_DEFAULTS>(key: K): (typeof TV_FFS_DEFAULTS)[K] {
    const override = localRules[key as keyof CustomRulesOverride];
    return (override !== undefined ? override : TV_FFS_DEFAULTS[key]) as (typeof TV_FFS_DEFAULTS)[K];
  }

  function displayText(key: NumericKey): string {
    return draftText[key] ?? String(val(key));
  }

  function commitNum(key: NumericKey, raw: string, toInt = false) {
    setDraftText(prev => ({ ...prev, [key]: raw }));
    const parsed = toInt ? parseInt(raw, 10) : parseFloat(raw.replace(',', '.'));
    if (!isNaN(parsed)) {
      const next = { ...localRules, [key]: parsed };
      setLocalRules(next);
      onRulesChange(next);
    }
  }

  function blurNum(key: NumericKey) {
    // Drop the in-progress draft so display falls back to the last committed value.
    setDraftText(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function setBool(key: BoolKey, value: boolean) {
    const next = { ...localRules, [key]: value };
    setLocalRules(next);
    onRulesChange(next);
  }

  function setHomeBase(value: string) {
    const next = { ...localRules, homeBase: value || undefined };
    setLocalRules(next);
    onRulesChange(next);
  }

  const fieldCn = 'h-7 text-xs border border-border/60 rounded px-1.5 w-20 text-right';
  const overriddenBadge = (
    <span className="ml-1 text-[10px] text-primary font-semibold">↑</span>
  );

  return (
    <div className="rounded-md border border-primary/20 bg-primary/5 p-2 space-y-2">
      <button
        type="button"
        onClick={() => setIsExpanded(v => !v)}
        className="flex w-full items-center gap-1.5 text-xs text-primary font-semibold"
      >
        <Info className="h-3.5 w-3.5 shrink-0" />
        <span>{t('title')}</span>
        <span className="text-[10px] font-normal text-muted-foreground">
          {t('legend')}
        </span>
        <ChevronDown className={cn('ml-auto h-3.5 w-3.5 shrink-0 transition-transform', !isExpanded && '-rotate-90')} />
      </button>

      {isExpanded && (
        <>
          {/* OT daily */}
          <div>
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              {t('dailyOtSectionTitle')}
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              <label className="flex flex-col gap-0.5">
                <span className="text-muted-foreground">
                  {t('otStartHour')} {!isDefault('dailyOtStartH') && overriddenBadge}
                </span>
                <Input
                  type="number" min="1" max="24" step="1"
                  value={displayText('dailyOtStartH')}
                  onChange={e => commitNum('dailyOtStartH', e.target.value, true)}
                  onBlur={() => blurNum('dailyOtStartH')}
                  className={cn(fieldCn, !isDefault('dailyOtStartH') && 'border-primary/50')}
                />
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="text-muted-foreground">
                  {t('band1Pct')} {!isDefault('dailyOtBand1Pct') && overriddenBadge}
                </span>
                <Input
                  type="number" min="0" max="500" step="5"
                  value={displayText('dailyOtBand1Pct')}
                  onChange={e => commitNum('dailyOtBand1Pct', e.target.value)}
                  onBlur={() => blurNum('dailyOtBand1Pct')}
                  className={cn(fieldCn, !isDefault('dailyOtBand1Pct') && 'border-primary/50')}
                />
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="text-muted-foreground">
                  {t('band2Pct')} {!isDefault('dailyOtBand2Pct') && overriddenBadge}
                </span>
                <Input
                  type="number" min="0" max="500" step="5"
                  value={displayText('dailyOtBand2Pct')}
                  onChange={e => commitNum('dailyOtBand2Pct', e.target.value)}
                  onBlur={() => blurNum('dailyOtBand2Pct')}
                  className={cn(fieldCn, !isDefault('dailyOtBand2Pct') && 'border-primary/50')}
                />
              </label>
            </div>
          </div>

          {/* OT weekly */}
          <div>
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              {t('weeklyOtSectionTitle')}
            </div>
            <div className="grid grid-cols-4 gap-1.5 text-xs">
              <label className="flex flex-col gap-0.5">
                <span className="text-muted-foreground">
                  {t('weeklyThresholdH')} {!isDefault('weeklyOtThresholdH') && overriddenBadge}
                </span>
                <Input
                  type="number" min="1" step="1"
                  value={displayText('weeklyOtThresholdH')}
                  onChange={e => commitNum('weeklyOtThresholdH', e.target.value, true)}
                  onBlur={() => blurNum('weeklyOtThresholdH')}
                  className={cn(fieldCn, !isDefault('weeklyOtThresholdH') && 'border-primary/50')}
                />
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="text-muted-foreground">
                  {t('band1EndH')} {!isDefault('weeklyOtBand1EndH') && overriddenBadge}
                </span>
                <Input
                  type="number" min="1" step="1"
                  value={displayText('weeklyOtBand1EndH')}
                  onChange={e => commitNum('weeklyOtBand1EndH', e.target.value, true)}
                  onBlur={() => blurNum('weeklyOtBand1EndH')}
                  className={cn(fieldCn, !isDefault('weeklyOtBand1EndH') && 'border-primary/50')}
                />
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="text-muted-foreground">
                  {t('band1Pct')} {!isDefault('weeklyOtBand1Pct') && overriddenBadge}
                </span>
                <Input
                  type="number" min="0" max="500" step="5"
                  value={displayText('weeklyOtBand1Pct')}
                  onChange={e => commitNum('weeklyOtBand1Pct', e.target.value)}
                  onBlur={() => blurNum('weeklyOtBand1Pct')}
                  className={cn(fieldCn, !isDefault('weeklyOtBand1Pct') && 'border-primary/50')}
                />
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="text-muted-foreground">
                  {t('band2Pct')} {!isDefault('weeklyOtBand2Pct') && overriddenBadge}
                </span>
                <Input
                  type="number" min="0" max="500" step="5"
                  value={displayText('weeklyOtBand2Pct')}
                  onChange={e => commitNum('weeklyOtBand2Pct', e.target.value)}
                  onBlur={() => blurNum('weeklyOtBand2Pct')}
                  className={cn(fieldCn, !isDefault('weeklyOtBand2Pct') && 'border-primary/50')}
                />
              </label>
            </div>
          </div>

          {/* Surcharges */}
          <div>
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              {t('surchargesSectionTitle')}
            </div>
            <div className="grid grid-cols-4 gap-1.5 text-xs">
              {/* Night */}
              <div className="flex flex-col gap-0.5">
                <label className="flex items-center gap-1 text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={val('nightEnabled')}
                    onChange={e => setBool('nightEnabled', e.target.checked)}
                    className="h-3.5 w-3.5 accent-primary"
                  />
                  {t('night')} {!isDefault('nightEnabled') && overriddenBadge}
                </label>
                <Input
                  type="number" min="0" max="500" step="5"
                  value={displayText('nightPct')}
                  onChange={e => commitNum('nightPct', e.target.value)}
                  onBlur={() => blurNum('nightPct')}
                  disabled={!val('nightEnabled')}
                  className={cn(fieldCn, !isDefault('nightPct') && 'border-primary/50')}
                  title={t('nightPctTitle')}
                />
              </div>
              {/* Saturday */}
              <div className="flex flex-col gap-0.5">
                <label className="flex items-center gap-1 text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={val('saturdayEnabled')}
                    onChange={e => setBool('saturdayEnabled', e.target.checked)}
                    className="h-3.5 w-3.5 accent-primary"
                  />
                  {t('saturday')} {!isDefault('saturdayEnabled') && overriddenBadge}
                </label>
                <Input
                  type="number" min="0" max="500" step="5"
                  value={displayText('saturdayPct')}
                  onChange={e => commitNum('saturdayPct', e.target.value)}
                  onBlur={() => blurNum('saturdayPct')}
                  disabled={!val('saturdayEnabled')}
                  className={cn(fieldCn, !isDefault('saturdayPct') && 'border-primary/50')}
                  title={t('saturdayPctTitle')}
                />
              </div>
              {/* Sunday */}
              <div className="flex flex-col gap-0.5">
                <label className="flex items-center gap-1 text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={val('sundayEnabled')}
                    onChange={e => setBool('sundayEnabled', e.target.checked)}
                    className="h-3.5 w-3.5 accent-primary"
                  />
                  {t('sunday')} {!isDefault('sundayEnabled') && overriddenBadge}
                </label>
                <Input
                  type="number" min="0" max="500" step="5"
                  value={displayText('sundayPct')}
                  onChange={e => commitNum('sundayPct', e.target.value)}
                  onBlur={() => blurNum('sundayPct')}
                  disabled={!val('sundayEnabled')}
                  className={cn(fieldCn, !isDefault('sundayPct') && 'border-primary/50')}
                  title={t('sundayPctTitle')}
                />
              </div>
              {/* Holiday */}
              <div className="flex flex-col gap-0.5">
                <label className="flex items-center gap-1 text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={val('holidayEnabled')}
                    onChange={e => setBool('holidayEnabled', e.target.checked)}
                    className="h-3.5 w-3.5 accent-primary"
                  />
                  {t('holiday')} {!isDefault('holidayEnabled') && overriddenBadge}
                </label>
                <Input
                  type="number" min="0" max="500" step="5"
                  value={displayText('holidayPct')}
                  onChange={e => commitNum('holidayPct', e.target.value)}
                  onBlur={() => blurNum('holidayPct')}
                  disabled={!val('holidayEnabled')}
                  className={cn(fieldCn, !isDefault('holidayPct') && 'border-primary/50')}
                  title={t('holidayPctTitle')}
                />
              </div>
            </div>
          </div>

          {/* Per diem amounts + home base */}
          <div>
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              {t('perDiemSectionTitle')}
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              <label className="flex flex-col gap-0.5">
                <span className="text-muted-foreground">{tFields('perDiemFullDay')}</span>
                <Input
                  type="text" inputMode="decimal"
                  defaultValue={(perDiemFullCents / 100).toFixed(2)}
                  onBlur={e => {
                    const cents = Math.round(parseFloat(e.target.value.replace(',', '.')) * 100) || 0;
                    onPerDiemFullChange(cents);
                  }}
                  className={fieldCn}
                />
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="text-muted-foreground">{tFields('perDiemPartialDay')}</span>
                <Input
                  type="text" inputMode="decimal"
                  defaultValue={(perDiemPartialCents / 100).toFixed(2)}
                  onBlur={e => {
                    const cents = Math.round(parseFloat(e.target.value.replace(',', '.')) * 100) || 0;
                    onPerDiemPartialChange(cents);
                  }}
                  className={fieldCn}
                />
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="text-muted-foreground">
                  {t('homeBase')} {localRules.homeBase !== undefined && overriddenBadge}
                </span>
                <Input
                  type="text"
                  value={localRules.homeBase ?? HOME_BASE_DEFAULT}
                  onChange={e => setHomeBase(e.target.value)}
                  className={cn(
                    'h-7 text-xs border border-border/60 rounded px-1.5 w-full',
                    localRules.homeBase !== undefined && 'border-primary/50'
                  )}
                  placeholder={HOME_BASE_DEFAULT}
                />
              </label>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main detail panel ───────────────────────────────────────────────────────

export function TimesheetDetailPanel({ timesheet, onClose, onDeleted }: Props) {
  const t = useTranslations('timesheets');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const dateLocale = locale === 'de' ? de : enUS;

  const entries = useTimesheetsStore(s => s.entries);
  const isLoadingEntries = useTimesheetsStore(s => s.isLoadingEntries);
  const upsertEntry = useTimesheetsStore(s => s.upsertEntry);
  const updateTimesheet = useTimesheetsStore(s => s.updateTimesheet);
  const deleteTimesheet = useTimesheetsStore(s => s.deleteTimesheet);
  const projects = useProjectsStore(s => s.projects);
  const fetchProjects = useProjectsStore(s => s.fetchProjects);

  useEffect(() => {
    if (projects.length === 0) fetchProjects();
  }, [projects.length, fetchProjects]);

  // Local entry state for debounced saves
  const [localEntries, setLocalEntries] = useState<Partial<TimesheetEntry>[]>([]);
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    setLocalEntries(entries);
  }, [entries]);

  // Header fields — debounced auto-save
  const [personName, setPersonName] = useState(timesheet.person_name);
  const [positionTitle, setPositionTitle] = useState(timesheet.position_title);
  const [department, setDepartment] = useState(timesheet.department);
  const [weeklyRateStr, setWeeklyRateStr] = useState(
    timesheet.weekly_rate_cents > 0
      ? (timesheet.weekly_rate_cents / 100).toFixed(2)
      : ''
  );

  const headerSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleHeaderSave(overrides: Partial<Timesheet>) {
    if (headerSaveTimer.current) clearTimeout(headerSaveTimer.current);
    headerSaveTimer.current = setTimeout(() => {
      updateTimesheet(timesheet.id, overrides);
    }, DEBOUNCE_MS);
  }

  // Custom rules — debounced
  const customRulesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function scheduleCustomRulesSave(rules: CustomRulesOverride) {
    if (customRulesTimer.current) clearTimeout(customRulesTimer.current);
    customRulesTimer.current = setTimeout(() => {
      updateTimesheet(timesheet.id, { custom_rules: rules });
    }, DEBOUNCE_MS);
  }

  const handleEntryChange = useCallback(
    (date: string, field: keyof TimesheetEntry, value: unknown) => {
      setLocalEntries(prev => {
        const idx = prev.findIndex(e => e.entry_date === date);
        const updated = { ...(idx >= 0 ? prev[idx] : { entry_date: date, timesheet_id: timesheet.id }), [field]: value };
        const next = idx >= 0 ? prev.map((e, i) => (i === idx ? updated : e)) : [...prev, updated];
        return next;
      });

      // Debounce per-date saves
      if (debounceTimers.current[date]) clearTimeout(debounceTimers.current[date]);
      debounceTimers.current[date] = setTimeout(async () => {
        setLocalEntries(prev => {
          const entry = prev.find(e => e.entry_date === date);
          if (entry) {
            upsertEntry({
              timesheet_id: timesheet.id,
              entry_date: date,
              work_start: entry.work_start ?? null,
              work_end: entry.work_end ?? null,
              break_minutes: entry.break_minutes ?? 0,
              travel_to_minutes: entry.travel_to_minutes ?? 0,
              travel_back_minutes: entry.travel_back_minutes ?? 0,
              travel_qualifies: entry.travel_qualifies ?? false,
              place_of_work: entry.place_of_work ?? null,
              bundesland: entry.bundesland ?? null,
              per_diem_type: entry.per_diem_type ?? 'auto',
              notes: entry.notes ?? null,
              daily_minimum_override: entry.daily_minimum_override ?? null,
            });
          }
          return prev;
        });
      }, DEBOUNCE_MS);
    },
    [timesheet.id, upsertEntry]
  );

  async function handleDelete() {
    if (!window.confirm(t('deleteConfirm') + '\n\n' + t('deleteConfirmHint'))) return;
    await deleteTimesheet(timesheet.id);
    onDeleted();
  }

  function handlePrint() {
    window.open(`/timesheets/${timesheet.id}/print`, '_blank');
  }

  // Merge local entries over store entries for display
  const displayEntries: TimesheetEntry[] = localEntries as TimesheetEntry[];

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b bg-muted/30">
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold">{formatWeekHeader(timesheet.week_start, dateLocale, t('weekAbbr'))}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {timesheet.person_name || '—'}
            {timesheet.position_title ? ` · ${timesheet.position_title}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handlePrint} className="h-8 gap-1.5 text-xs">
            <Printer className="h-3.5 w-3.5" />
            {t('exportPdf')}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDelete} className="h-8 text-destructive hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto min-h-0 px-5 py-4 space-y-5">

        {/* Basic info fields */}
        <div className="section-card">
          <div className="section-card-header">{t('general')}</div>
          <div className="section-card-body space-y-3 detail-form-fields">
            <div className="space-y-1">
              <Label className="text-xs">{t('fields.project')}</Label>
              <SearchableSelect
                options={projects.map(p => ({ id: p.id, label: p.name, sublabel: p.project_number }))}
                value={timesheet.project_id}
                onChange={v => updateTimesheet(timesheet.id, { project_id: v })}
                placeholder={`${tCommon('search')}…`}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t('fields.personName')}</Label>
                <Input
                  value={personName}
                  onChange={e => {
                    setPersonName(e.target.value);
                    scheduleHeaderSave({ person_name: e.target.value });
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('fields.positionTitle')}</Label>
                <Input
                  value={positionTitle}
                  onChange={e => {
                    setPositionTitle(e.target.value);
                    scheduleHeaderSave({ position_title: e.target.value });
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('fields.department')}</Label>
                <Input
                  value={department}
                  onChange={e => {
                    setDepartment(e.target.value);
                    scheduleHeaderSave({ department: e.target.value });
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t('fields.weeklyRate')}</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={weeklyRateStr}
                  onChange={e => {
                    setWeeklyRateStr(e.target.value);
                    const cents = Math.round(parseFloat(e.target.value.replace(',', '.')) * 100) || 0;
                    scheduleHeaderSave({ weekly_rate_cents: cents });
                  }}
                  placeholder="2053.00"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('fields.calcMode')}</Label>
                <Select
                  value={timesheet.calc_mode}
                  onValueChange={v => updateTimesheet(timesheet.id, { calc_mode: v as 'full_tarif' | 'custom_tarif' })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_tarif">{t('calcMode.full_tarif')}</SelectItem>
                    <SelectItem value="custom_tarif">{t('calcMode.custom_tarif')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('fields.rateType')}</Label>
                <Select
                  value={timesheet.rate_type}
                  onValueChange={v => updateTimesheet(timesheet.id, { rate_type: v as 'standard' | 'reduced' })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">{t('rateType.standard')}</SelectItem>
                    <SelectItem value="reduced">{t('rateType.reduced')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Per diem + daily minimum checkboxes (Bug #4: these read from the store-fresh prop) */}
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={timesheet.per_diem_enabled}
                  onChange={e => updateTimesheet(timesheet.id, { per_diem_enabled: e.target.checked })}
                  className="h-4 w-4 accent-primary"
                />
                {t('fields.perDiemEnabled')}
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={timesheet.daily_minimum_8h}
                  onChange={e => updateTimesheet(timesheet.id, { daily_minimum_8h: e.target.checked })}
                  className="h-4 w-4 accent-primary"
                />
                {t('fields.dailyMinimum8h')}
              </label>
            </div>

            {/* Custom-mode settings panel (Bug #1): only visible when custom_tarif is selected */}
            {timesheet.calc_mode === 'custom_tarif' && (
              <CustomRulesPanel
                key={timesheet.id}
                rules={timesheet.custom_rules ?? {}}
                perDiemFullCents={timesheet.per_diem_full_day_cents}
                perDiemPartialCents={timesheet.per_diem_partial_day_cents}
                onRulesChange={rules => scheduleCustomRulesSave(rules)}
                onPerDiemFullChange={cents =>
                  updateTimesheet(timesheet.id, { per_diem_full_day_cents: cents })
                }
                onPerDiemPartialChange={cents =>
                  updateTimesheet(timesheet.id, { per_diem_partial_day_cents: cents })
                }
              />
            )}
          </div>
        </div>

        {/* Week grid */}
        <div className="section-card">
          <div className="section-card-header">{t('pdf.weeklyHours')}</div>
          <div className="section-card-body p-0">
            <TimesheetWeekGrid
              timesheet={timesheet}
              entries={displayEntries}
              onEntryChange={handleEntryChange}
              isLoading={isLoadingEntries}
            />
          </div>
        </div>

        {/* Pay estimate — only visible to owner (already filtered by RLS) and admins */}
        <TimesheetEstimatePanel
          timesheet={timesheet}
          entries={displayEntries}
        />
      </div>
    </div>
  );
}
