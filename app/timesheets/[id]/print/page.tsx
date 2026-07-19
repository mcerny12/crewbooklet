'use client';

// Timesheet print/PDF page.
// Does NOT include any pay figures, rates, or accounting columns — only working time.
// The pay estimate is visible exclusively in the detail panel (never in PDF).
//
// Triggered via window.open('/timesheets/[id]/print', '_blank') from the detail panel.

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { format, parseISO, addDays } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { SupabaseService } from '@/lib/services/supabase-service';
import type { Timesheet, TimesheetEntry } from '@/lib/timesheets/types';

function parseHHMM(t: string | null): string {
  if (!t) return '—';
  return t.slice(0, 5);
}

function rawMinutes(entry: TimesheetEntry): number {
  if (!entry.work_start || !entry.work_end) return 0;
  const [sh, sm] = entry.work_start.split(':').map(Number);
  const [eh, em] = entry.work_end.split(':').map(Number);
  const start = sh * 60 + sm;
  const end = eh < sh ? (eh + 24) * 60 + em : eh * 60 + em;
  return Math.max(0, end - start - entry.break_minutes);
}

function formatMinutes(min: number): string {
  if (min === 0) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}:00` : `${h}:${String(m).padStart(2, '0')}`;
}

export default function TimesheetPrintPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations('timesheets');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const dateLocale = locale === 'de' ? de : enUS;
  const [timesheet, setTimesheet] = useState<Timesheet | null>(null);
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      SupabaseService.fetchTimesheet(id),
      SupabaseService.fetchTimesheetEntries(id),
    ]).then(([ts, ents]) => {
      setTimesheet(ts);
      setEntries(ents);
    });
  }, [id]);

  useEffect(() => {
    if (timesheet) {
      document.title = `${t('pdf.pageTitle')} – ${timesheet.person_name}`;
      // Trigger print dialog automatically after render
      const timer = setTimeout(() => window.print(), 500);
      return () => clearTimeout(timer);
    }
  }, [timesheet, t]);

  if (!timesheet) {
    return <div className="p-8 text-sm text-gray-500">{tCommon('loading')}</div>;
  }

  const monday = parseISO(timesheet.week_start);
  const weekEnd = addDays(monday, 6);
  const dayLabels = [
    t('day.monday'), t('day.tuesday'), t('day.wednesday'), t('day.thursday'),
    t('day.friday'), t('day.saturday'), t('day.sunday'),
  ];

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = format(addDays(monday, i), 'yyyy-MM-dd');
    const entry = entries.find(e => e.entry_date === date);
    return { date, label: dayLabels[i], dayOfMonth: format(addDays(monday, i), 'dd.MM.'), entry };
  });

  const totalMinutes = days.reduce((s, d) => s + (d.entry ? rawMinutes(d.entry) : 0), 0);
  const totalTravelMinutes = days.reduce((s, d) => {
    if (!d.entry?.travel_qualifies) return s;
    return s + d.entry.travel_to_minutes + d.entry.travel_back_minutes;
  }, 0);

  return (
    <div className="print-page" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#000', maxWidth: '700px', margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px', borderBottom: '2px solid #000', paddingBottom: '10px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, textTransform: 'uppercase' }}>{t('pdf.pageTitle')}</h1>
        <div style={{ marginTop: '6px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
          <div>
            <span style={{ color: '#666' }}>{t('fields.personName')}: </span>
            <strong>{timesheet.person_name || '—'}</strong>
          </div>
          <div>
            <span style={{ color: '#666' }}>{t('week')}: </span>
            <strong>
              {format(monday, 'd. MMM', { locale: dateLocale })} – {format(weekEnd, 'd. MMM yyyy', { locale: dateLocale })}
              {' '}({t('weekAbbr')} {format(monday, 'w', { locale: dateLocale })})
            </strong>
          </div>
          {timesheet.position_title && (
            <div>
              <span style={{ color: '#666' }}>{t('pdf.position')}: </span>
              {timesheet.position_title}
            </div>
          )}
          {timesheet.department && (
            <div>
              <span style={{ color: '#666' }}>{t('fields.department')}: </span>
              {timesheet.department}
            </div>
          )}
        </div>
      </div>

      {/* Time table — NO pay figures (columns 9-11 from template excluded) */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f0f0f0' }}>
            <th style={thStyle}>{t('day.day')}</th>
            <th style={thStyle}>{t('pdf.date')}</th>
            <th style={thStyle}>{t('day.workStart')}</th>
            <th style={thStyle}>{t('day.workEnd')}</th>
            <th style={thStyle}>{t('day.break')}</th>
            <th style={thStyle}>{t('day.travelTo')}</th>
            <th style={thStyle}>{t('day.travelBack')}</th>
            <th style={thStyle}>{t('pdf.netHours')}</th>
            <th style={{ ...thStyle, minWidth: '100px' }}>{t('day.placeOfWork')}</th>
          </tr>
        </thead>
        <tbody>
          {days.map(({ label, dayOfMonth, entry }, idx) => {
            const net = entry ? rawMinutes(entry) : 0;
            const isWeekend = idx >= 5;
            return (
              <tr key={dayOfMonth} style={{ backgroundColor: isWeekend ? '#f9f9f9' : '#fff' }}>
                <td style={tdStyle}><strong>{label}</strong></td>
                <td style={tdStyle}>{dayOfMonth}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{parseHHMM(entry?.work_start ?? null)}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{parseHHMM(entry?.work_end ?? null)}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{entry?.break_minutes || '—'}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{entry?.travel_qualifies ? entry.travel_to_minutes || '—' : '—'}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{entry?.travel_qualifies ? entry.travel_back_minutes || '—' : '—'}</td>
                <td style={{ ...tdStyle, textAlign: 'center', fontWeight: net > 0 ? 'bold' : 'normal' }}>
                  {formatMinutes(net)}
                </td>
                <td style={tdStyle}>{entry?.place_of_work || ''}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ backgroundColor: '#e8e8e8', fontWeight: 'bold' }}>
            <td colSpan={7} style={{ ...tdStyle, textAlign: 'right' }}>{t('pdf.sum')}:</td>
            <td style={{ ...tdStyle, textAlign: 'center' }}>{formatMinutes(totalMinutes)}</td>
            <td style={tdStyle}></td>
          </tr>
        </tfoot>
      </table>

      {/* Travel summary (if any) */}
      {totalTravelMinutes > 0 && (
        <div style={{ marginBottom: '12px', fontSize: '10px', color: '#555' }}>
          {t('pdf.totalTravelTime', { minutes: formatMinutes(totalTravelMinutes) })}
        </div>
      )}

      {/* Signature block */}
      <div style={{ marginTop: '40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        <div>
          <div style={{ borderTop: '1px solid #000', paddingTop: '4px', color: '#666' }}>
            {t('pdf.signatureContractor')}
          </div>
        </div>
        <div>
          <div style={{ borderTop: '1px solid #000', paddingTop: '4px', color: '#666' }}>
            {t('pdf.signatureClient')}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { margin: 15mm; }
          body { margin: 0; }
          .print-page { max-width: 100%; padding: 0; }
        }
      `}</style>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '6px 8px',
  textAlign: 'left',
  fontWeight: 'bold',
  fontSize: '10px',
  border: '1px solid #ccc',
};

const tdStyle: React.CSSProperties = {
  padding: '5px 8px',
  border: '1px solid #ddd',
  fontSize: '10px',
};
