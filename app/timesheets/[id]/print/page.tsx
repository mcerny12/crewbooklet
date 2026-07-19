'use client';

// Timesheet print page — reproduces the paper "Stundenzettel / Time Sheet" template.
// Columns 1-8 (day/date/travel/work-time/break/place) are filled in from the
// timesheet data. Columns 9-11 (Std. gesamt / Überstunden / Überstunden-
// Nachtzuschläge) are boxed "ACCOUNTING USE ONLY" on the original paper form and
// are printed as blank cells here by design — no pay figures, rates, or OT/
// premium calculations are ever rendered on this page. The pay estimate is
// visible exclusively in the detail panel.
//
// Triggered via window.open('/timesheets/[id]/print', '_blank') from the detail panel.

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { format, parseISO, addDays } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { SupabaseService } from '@/lib/services/supabase-service';
import type { Timesheet, TimesheetEntry } from '@/lib/timesheets/types';
import type { Project } from '@/lib/types/models';

function parseHHMM(t: string | null): string {
  if (!t) return '';
  return t.slice(0, 5);
}

export default function TimesheetPrintPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations('timesheets');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const dateLocale = locale === 'de' ? de : enUS;
  const [timesheet, setTimesheet] = useState<Timesheet | null>(null);
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      SupabaseService.fetchTimesheet(id),
      SupabaseService.fetchTimesheetEntries(id),
    ]).then(([ts, ents]) => {
      setTimesheet(ts);
      setEntries(ents);
      if (ts?.project_id) {
        SupabaseService.fetchProject(ts.project_id).then(setProject);
      }
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

  return (
    <div className="print-page" style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#000', width: '100%', maxWidth: '277mm', margin: '0 auto', padding: '10mm' }}>
      {/* Header: project name (stands in for a fixed company brand) + document title, accounting box top-right */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div>
          {project?.name && (
            <div style={{ fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase' }}>{project.name}</div>
          )}
          <div style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase' }}>{t('pdf.pageTitle')}</div>
        </div>
        <div style={{ border: '1px solid #000', padding: '6px 10px', minWidth: '200px' }}>
          <div style={{ fontSize: '9px', fontWeight: 'bold', marginBottom: '6px' }}>{t('pdf.accountingUseOnly')}:</div>
          <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', rowGap: '10px', fontSize: '9px' }}>
            <span>{t('pdf.coding')}</span>
            <span style={{ borderBottom: '1px solid #000' }} />
            <span>{t('pdf.euro')}</span>
            <span style={{ borderBottom: '1px solid #000' }} />
          </div>
        </div>
      </div>

      {/* Person / position / department + week */}
      <div style={{ marginBottom: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px', fontSize: '10px' }}>
        <div><span style={{ color: '#666' }}>{t('fields.personName')}: </span><strong>{timesheet.person_name || ''}</strong></div>
        <div>
          <span style={{ color: '#666' }}>{t('week')}: </span>
          <strong>
            {format(monday, 'd. MMM', { locale: dateLocale })} – {format(weekEnd, 'd. MMM yyyy', { locale: dateLocale })}
            {' '}({t('weekAbbr')} {format(monday, 'w', { locale: dateLocale })})
          </strong>
        </div>
        <div><span style={{ color: '#666' }}>{t('pdf.position')}: </span>{timesheet.position_title || ''}</div>
        <div><span style={{ color: '#666' }}>{t('fields.department')}: </span>{timesheet.department || ''}</div>
      </div>

      {/* Time table — 14 physical columns matching the template's numbering 1-11 (col. 11 has 4 sub-columns) */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f0f0f0' }}>
            <th style={numStyle}>1</th>
            <th style={numStyle}>2</th>
            <th style={numStyle}>3</th>
            <th style={numStyle}>4</th>
            <th style={numStyle}>5</th>
            <th style={numStyle}>6</th>
            <th style={numStyle}>7</th>
            <th style={numStyle}>8</th>
            <th style={numStyle}>9</th>
            <th style={numStyle}>10</th>
            <th style={numStyle} colSpan={4}>11</th>
          </tr>
          <tr style={{ backgroundColor: '#f0f0f0' }}>
            <th style={thStyle} rowSpan={2}>{t('day.day')}</th>
            <th style={thStyle} rowSpan={2}>{t('pdf.date')}</th>
            <th style={thStyle} rowSpan={2}>{t('day.travelTo')}</th>
            <th style={thStyle} colSpan={2}>{t('pdf.workedHeader')}</th>
            <th style={thStyle} rowSpan={2}>{t('day.break')}</th>
            <th style={thStyle} rowSpan={2}>{t('day.travelBack')}</th>
            <th style={{ ...thStyle, minWidth: '90px' }} rowSpan={2}>{t('day.placeOfWork')}</th>
            <th style={thStyle} rowSpan={2}>{t('pdf.stdGesamt')}</th>
            <th style={thStyle} rowSpan={2}>{t('pdf.overtimeCol')}</th>
            <th style={thStyle} colSpan={4}>{t('pdf.premiumsCol')}</th>
          </tr>
          <tr style={{ backgroundColor: '#f0f0f0' }}>
            <th style={subThStyle}>{t('pdf.inLabel')}</th>
            <th style={subThStyle}>{t('pdf.outLabel')}</th>
            <th style={subThStyle}>%</th>
            <th style={subThStyle}>%</th>
            <th style={subThStyle}>%</th>
            <th style={subThStyle}></th>
          </tr>
        </thead>
        <tbody>
          {days.map(({ label, dayOfMonth, entry }, idx) => {
            const isWeekend = idx >= 5;
            return (
              <tr key={dayOfMonth} style={{ backgroundColor: isWeekend ? '#f9f9f9' : '#fff' }}>
                <td style={tdStyle}><strong>{label}</strong></td>
                <td style={tdStyle}>{dayOfMonth}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{entry?.travel_qualifies ? entry.travel_to_minutes || '' : ''}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{parseHHMM(entry?.work_start ?? null)}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{parseHHMM(entry?.work_end ?? null)}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{entry?.break_minutes || ''}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{entry?.travel_qualifies ? entry.travel_back_minutes || '' : ''}</td>
                <td style={tdStyle}>{entry?.place_of_work || ''}</td>
                {/* Columns 9-11: accounting use only — intentionally blank */}
                <td style={tdStyle}></td>
                <td style={tdStyle}></td>
                <td style={tdStyle}></td>
                <td style={tdStyle}></td>
                <td style={tdStyle}></td>
                <td style={tdStyle}></td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ backgroundColor: '#e8e8e8', fontWeight: 'bold' }}>
            <td colSpan={8} style={{ ...tdStyle, textAlign: 'right' }}>{t('pdf.totalPayableHours')}</td>
            <td style={tdStyle}></td>
            <td style={tdStyle}></td>
            <td style={tdStyle} colSpan={4}></td>
          </tr>
        </tfoot>
      </table>

      {/* Signature block */}
      <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', gap: '30px' }}>
          <div style={{ width: '160px' }}>
            <div style={{ borderTop: '1px solid #000', paddingTop: '4px', fontSize: '9px' }}>{t('pdf.signatureEmployee')}</div>
          </div>
          <div style={{ width: '160px' }}>
            <div style={{ borderTop: '1px solid #000', paddingTop: '4px', fontSize: '9px' }}>{t('pdf.signatureHod')}</div>
            <div style={{ fontSize: '8px', fontWeight: 'bold', marginTop: '2px' }}>Production</div>
          </div>
        </div>
        <div style={{ fontSize: '8px', fontWeight: 'bold' }}>Accounting</div>
      </div>

      <style>{`
        @media print {
          @page { size: landscape; margin: 12mm; }
          body { margin: 0; }
          .print-page { max-width: 100%; padding: 0; }
        }
      `}</style>
    </div>
  );
}

const numStyle: React.CSSProperties = {
  padding: '2px 4px',
  textAlign: 'center',
  fontWeight: 'bold',
  fontSize: '8px',
  border: '1px solid #ccc',
};

const thStyle: React.CSSProperties = {
  padding: '4px 6px',
  textAlign: 'left',
  fontWeight: 'bold',
  fontSize: '8px',
  border: '1px solid #ccc',
};

const subThStyle: React.CSSProperties = {
  padding: '3px 4px',
  textAlign: 'center',
  fontWeight: 'bold',
  fontSize: '8px',
  border: '1px solid #ccc',
};

const tdStyle: React.CSSProperties = {
  padding: '5px 6px',
  border: '1px solid #ddd',
  fontSize: '9px',
};
