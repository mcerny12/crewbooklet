'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { format, startOfWeek, parseISO } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { useTimesheetsStore } from '@/lib/stores/timesheets-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useProjectsStore } from '@/lib/stores/projects-store';
import type { CustomRulesOverride, Timesheet } from '@/lib/timesheets/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (sheet: Timesheet) => void;
}

function mondayOfWeek(dateStr: string): string {
  try {
    const d = parseISO(dateStr);
    const monday = startOfWeek(d, { weekStartsOn: 1 });
    return format(monday, 'yyyy-MM-dd');
  } catch {
    return dateStr;
  }
}

export function AddTimesheetDialog({ open, onOpenChange, onCreated }: Props) {
  const t = useTranslations('timesheets');
  const tCommon = useTranslations('common');
  const session = useAuthStore(s => s.session);
  const addTimesheet = useTimesheetsStore(s => s.addTimesheet);
  const loadTimesheetsByProject = useTimesheetsStore(s => s.loadTimesheetsByProject);
  const projects = useProjectsStore(s => s.projects);
  const fetchProjects = useProjectsStore(s => s.fetchProjects);

  useEffect(() => {
    if (projects.length === 0) fetchProjects();
  }, [projects.length, fetchProjects]);

  const todayMonday = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const [weekStart, setWeekStart] = useState(todayMonday);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [personName, setPersonName] = useState('');
  const [positionTitle, setPositionTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [weeklyRate, setWeeklyRate] = useState('');
  const [calcMode, setCalcMode] = useState<'full_tarif' | 'custom_tarif'>('full_tarif');
  const [rateType, setRateType] = useState<'standard' | 'reduced'>('standard');
  const [isSaving, setIsSaving] = useState(false);

  // Settings not exposed as their own inputs here — carried through from either
  // the hardcoded defaults or a copied sibling timesheet (see handleCopyFrom).
  const [dailyMinimum8h, setDailyMinimum8h] = useState(true);
  const [perDiemEnabled, setPerDiemEnabled] = useState(true);
  const [perDiemFullDayCents, setPerDiemFullDayCents] = useState(2800);
  const [perDiemPartialDayCents, setPerDiemPartialDayCents] = useState(1400);
  const [customRules, setCustomRules] = useState<CustomRulesOverride | null>(null);

  // "Copy settings from" — other timesheets already on the selected project,
  // so entering a new week for a project doesn't mean re-entering the same
  // rate/rules from scratch every time. A one-time copy, not a live link —
  // every field stays independently editable afterward.
  const [siblingTimesheets, setSiblingTimesheets] = useState<Timesheet[]>([]);
  const [copyFromId, setCopyFromId] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setSiblingTimesheets([]);
      setCopyFromId(null);
      return;
    }
    loadTimesheetsByProject(projectId).then(setSiblingTimesheets);
    setCopyFromId(null);
  }, [projectId, loadTimesheetsByProject]);

  function handleCopyFrom(id: string | null) {
    setCopyFromId(id);
    const source = siblingTimesheets.find(ts => ts.id === id);
    if (!source) return;
    setWeeklyRate(source.weekly_rate_cents > 0 ? (source.weekly_rate_cents / 100).toFixed(2) : '');
    setCalcMode(source.calc_mode);
    setRateType(source.rate_type);
    setDailyMinimum8h(source.daily_minimum_8h);
    setPerDiemEnabled(source.per_diem_enabled);
    setPerDiemFullDayCents(source.per_diem_full_day_cents);
    setPerDiemPartialDayCents(source.per_diem_partial_day_cents);
    setCustomRules(source.custom_rules);
  }

  async function handleCreate() {
    if (!session.userId) return;
    setIsSaving(true);
    try {
      const rateCents = Math.round(parseFloat(weeklyRate.replace(',', '.')) * 100) || 0;
      const created = await addTimesheet({
        user_id: session.userId,
        project_id: projectId,
        week_start: mondayOfWeek(weekStart),
        status: 'draft',
        person_name: personName,
        position_title: positionTitle,
        department,
        calc_mode: calcMode,
        rate_type: rateType,
        weekly_rate_cents: rateCents,
        daily_minimum_8h: dailyMinimum8h,
        per_diem_enabled: perDiemEnabled,
        per_diem_full_day_cents: perDiemFullDayCents,
        per_diem_partial_day_cents: perDiemPartialDayCents,
        custom_rules: customRules,
      });
      if (created) {
        onCreated(created);
        onOpenChange(false);
        // reset
        setWeekStart(todayMonday);
        setProjectId(null);
        setPersonName('');
        setPositionTitle('');
        setDepartment('');
        setWeeklyRate('');
        setCalcMode('full_tarif');
        setRateType('standard');
        setDailyMinimum8h(true);
        setPerDiemEnabled(true);
        setPerDiemFullDayCents(2800);
        setPerDiemPartialDayCents(1400);
        setCustomRules(null);
        setSiblingTimesheets([]);
        setCopyFromId(null);
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('newTimesheet')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>{t('fields.weekStart')}</Label>
            <Input
              type="date"
              value={weekStart}
              onChange={e => setWeekStart(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t('fields.project')}</Label>
            <SearchableSelect
              options={projects.map(p => ({ id: p.id, label: p.name, sublabel: p.project_number }))}
              value={projectId}
              onChange={setProjectId}
              placeholder={`${tCommon('search')}…`}
            />
          </div>

          {siblingTimesheets.length > 0 && (
            <div className="space-y-1.5">
              <Label>{t('fields.copySettingsFrom')}</Label>
              <SearchableSelect
                options={siblingTimesheets.map(ts => ({
                  id: ts.id,
                  label: ts.person_name || t('fields.personName'),
                  sublabel: format(parseISO(ts.week_start), 'd MMM yyyy'),
                }))}
                value={copyFromId}
                onChange={handleCopyFrom}
                placeholder={t('fields.copySettingsFromPlaceholder')}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>{t('fields.personName')}</Label>
            <Input
              value={personName}
              onChange={e => setPersonName(e.target.value)}
              placeholder={t('fields.personNamePlaceholder')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('fields.positionTitle')}</Label>
              <Input
                value={positionTitle}
                onChange={e => setPositionTitle(e.target.value)}
                placeholder={t('fields.positionTitlePlaceholder')}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('fields.department')}</Label>
              <Input
                value={department}
                onChange={e => setDepartment(e.target.value)}
                placeholder={t('fields.departmentPlaceholder')}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t('fields.calcMode')}</Label>
            <Select value={calcMode} onValueChange={v => setCalcMode(v as typeof calcMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full_tarif">{t('calcMode.full_tarif')}</SelectItem>
                <SelectItem value="custom_tarif">{t('calcMode.custom_tarif')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{t('fields.rateType')}</Label>
            <Select value={rateType} onValueChange={v => setRateType(v as typeof rateType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">{t('rateType.standard')}</SelectItem>
                <SelectItem value="reduced">{t('rateType.reduced')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{t('fields.weeklyRate')}</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={weeklyRate}
              onChange={e => setWeeklyRate(e.target.value)}
              placeholder="2053.00"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon('cancel')}
          </Button>
          <Button onClick={handleCreate} disabled={isSaving || !personName.trim()}>
            {isSaving ? tCommon('saving') : tCommon('create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
