'use client';

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Printer } from 'lucide-react';
import type { Project, ProjectCalendar } from '@/lib/types/models';
import { format } from 'date-fns';

interface Props {
  open: boolean;
  calendars: (ProjectCalendar & { projectName: string })[];
  projects: Project[];
  currentDate: Date;
  onClose: () => void;
}

export function PrintDialog({ open, calendars, projects, currentDate, onClose }: Props) {
  const defaultMonth = format(currentDate, 'yyyy-MM');

  const [month, setMonth]       = useState(defaultMonth);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(calendars.map(c => c.id)));

  // Reset defaults when opened
  const handleOpenChange = (v: boolean) => {
    if (v) {
      setMonth(format(currentDate, 'yyyy-MM'));
      setSelected(new Set(calendars.map(c => c.id)));
    }
    if (!v) onClose();
  };

  const toggleCalendar = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const toggleProject = (projectId: string, cals: ProjectCalendar[]) => {
    const projectCalIds = cals.map(c => c.id);
    const allSelected = projectCalIds.every(id => selected.has(id));
    setSelected(prev => {
      const next = new Set(prev);
      if (allSelected) {
        projectCalIds.forEach(id => next.delete(id));
      } else {
        projectCalIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const handlePrint = () => {
    if (selected.size === 0) return;
    const params = new URLSearchParams({
      month,
      calendars: [...selected].join(','),
    });
    window.open(`/calendar/print?${params}`, '_blank');
    onClose();
  };

  // Group calendars by project
  const grouped = useMemo(() => {
    return projects
      .map(p => ({
        project: p,
        cals: calendars.filter(c => c.project_id === p.id),
      }))
      .filter(g => g.cals.length > 0);
  }, [projects, calendars]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <Printer className="h-4 w-4" />Print Calendar
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-[10px] text-gray-500">Month</Label>
            <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="h-7 text-xs mt-0.5" />
          </div>

          <div>
            <Label className="text-[10px] text-gray-500 mb-1.5 block">Calendars to include</Label>
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {grouped.map(({ project, cals }) => {
                const allSel = cals.every(c => selected.has(c.id));
                const someSel = cals.some(c => selected.has(c.id));
                return (
                  <div key={project.id}>
                    <label className="flex items-center gap-2 cursor-pointer py-0.5 hover:bg-gray-50 dark:hover:bg-gray-800 px-1 rounded">
                      <input
                        type="checkbox"
                        checked={allSel}
                        ref={el => { if (el) el.indeterminate = !allSel && someSel; }}
                        onChange={() => toggleProject(project.id, cals)}
                        className="h-3 w-3"
                      />
                      <span className="text-xs font-medium truncate">{project.name}</span>
                    </label>
                    <div className="ml-5 space-y-0.5">
                      {cals.map(cal => (
                        <label key={cal.id} className="flex items-center gap-2 cursor-pointer py-0.5 hover:bg-gray-50 dark:hover:bg-gray-800 px-1 rounded">
                          <input
                            type="checkbox"
                            checked={selected.has(cal.id)}
                            onChange={() => toggleCalendar(cal.id)}
                            className="h-3 w-3"
                          />
                          <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: cal.color }} />
                          <span className="text-xs truncate">{cal.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onClose} className="h-7 text-xs">Cancel</Button>
            <Button size="sm" onClick={handlePrint} disabled={selected.size === 0} className="h-7 text-xs gap-1">
              <Printer className="h-3 w-3" />Open Print Preview
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
