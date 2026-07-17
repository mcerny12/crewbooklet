'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { X, Printer, Trash2 } from 'lucide-react';
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
import { TimesheetWeekGrid } from './timesheet-week-grid';
import { TimesheetEstimatePanel } from './timesheet-estimate-panel';
import { useTimesheetsStore } from '@/lib/stores/timesheets-store';
import type { Timesheet, TimesheetEntry } from '@/lib/timesheets/types';

const DEBOUNCE_MS = 1000;

interface Props {
  timesheet: Timesheet;
  onClose: () => void;
  onDeleted: () => void;
}

function formatWeekHeader(weekStart: string): string {
  try {
    const monday = parseISO(weekStart);
    return format(monday, "'KW' w — d. MMMM yyyy", { locale: de });
  } catch {
    return weekStart;
  }
}

export function TimesheetDetailPanel({ timesheet, onClose, onDeleted }: Props) {
  const t = useTranslations('timesheets');
  const tCommon = useTranslations('common');

  const entries = useTimesheetsStore(s => s.entries);
  const isLoadingEntries = useTimesheetsStore(s => s.isLoadingEntries);
  const upsertEntry = useTimesheetsStore(s => s.upsertEntry);
  const updateTimesheet = useTimesheetsStore(s => s.updateTimesheet);
  const deleteTimesheet = useTimesheetsStore(s => s.deleteTimesheet);

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
          <h2 className="text-sm font-semibold">{formatWeekHeader(timesheet.week_start)}</h2>
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
          <div className="section-card-header">Allgemein</div>
          <div className="section-card-body space-y-3 detail-form-fields">
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

            {/* Per diem settings */}
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
          </div>
        </div>

        {/* Week grid */}
        <div className="section-card">
          <div className="section-card-header">Wochenstunden</div>
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
