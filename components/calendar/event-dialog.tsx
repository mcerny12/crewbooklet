'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import type { CalendarEvent, ProjectCalendar, EventStatus } from '@/lib/types/models';
import { format } from 'date-fns';

interface Props {
  open: boolean;
  event?: CalendarEvent | null;
  initialSlot?: { start: Date; end: Date } | null;
  defaultCalendarId?: string | null;
  calendars: (ProjectCalendar & { projectName: string })[];
  onClose: () => void;
  onSave: (data: Omit<CalendarEvent, 'id' | 'created_at'>) => Promise<void>;
  onUpdate: (id: string, data: Partial<CalendarEvent>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  try { return format(new Date(iso), "yyyy-MM-dd'T'HH:mm"); } catch { return ''; }
}

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  try { return format(new Date(iso), 'yyyy-MM-dd'); } catch { return ''; }
}

export function EventDialog({ open, event, initialSlot, defaultCalendarId, calendars, onClose, onSave, onUpdate, onDelete }: Props) {
  const [title, setTitle]           = useState('');
  const [calendarId, setCalendarId] = useState('');
  const [isAllDay, setIsAllDay]     = useState(false);
  const [startDate, setStartDate]   = useState('');
  const [endDate, setEndDate]       = useState('');
  const [location, setLocation]     = useState('');
  const [notes, setNotes]           = useState('');
  const [status, setStatus]         = useState<EventStatus>('confirmed' as EventStatus);
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    if (!open) return;
    if (event) {
      setTitle(event.title);
      setCalendarId(event.calendar_id);
      setIsAllDay(event.is_all_day);
      setStartDate(event.is_all_day ? toDateInput(event.start_date) : toDatetimeLocal(event.start_date));
      setEndDate(event.is_all_day ? toDateInput(event.end_date) : toDatetimeLocal(event.end_date));
      setLocation(event.location ?? '');
      setNotes(event.notes ?? '');
      setStatus(event.status);
    } else {
      setTitle('');
      setCalendarId(defaultCalendarId ?? calendars[0]?.id ?? '');
      setIsAllDay(false);
      const s = initialSlot?.start ?? new Date();
      const e = initialSlot?.end   ?? new Date(s.getTime() + 60 * 60 * 1000);
      setStartDate(format(s, "yyyy-MM-dd'T'HH:mm"));
      setEndDate(format(e,   "yyyy-MM-dd'T'HH:mm"));
      setLocation('');
      setNotes('');
      setStatus('confirmed' as EventStatus);
    }
  }, [open, event, initialSlot, defaultCalendarId, calendars]);

  const handleSave = async () => {
    if (!title.trim() || !calendarId) return;
    setSaving(true);
    try {
      const toISO = (d: string) => isAllDay ? new Date(d).toISOString() : new Date(d).toISOString();
      const payload = {
        calendar_id: calendarId,
        title: title.trim(),
        start_date: toISO(startDate),
        end_date:   toISO(endDate),
        is_all_day: isAllDay,
        location:   location || null,
        notes:      notes || null,
        status,
      };
      if (event) {
        await onUpdate(event.id, payload);
      } else {
        await onSave(payload);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!event || !onDelete) return;
    if (!confirm(`Delete "${event.title}"?`)) return;
    await onDelete(event.id);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">{event ? 'Edit Event' : 'New Event'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-[10px] text-gray-500">Title</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Event title"
              className="h-7 text-xs mt-0.5"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
            />
          </div>

          <div>
            <Label className="text-[10px] text-gray-500">Calendar</Label>
            <Select value={calendarId} onValueChange={setCalendarId}>
              <SelectTrigger className="h-7 text-xs mt-0.5">
                <SelectValue placeholder="Select calendar" />
              </SelectTrigger>
              <SelectContent>
                {calendars.map(c => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full inline-block" style={{ background: c.color }} />
                      {c.projectName} — {c.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allday"
              checked={isAllDay}
              onChange={e => setIsAllDay(e.target.checked)}
              className="h-3 w-3"
            />
            <Label htmlFor="allday" className="text-xs cursor-pointer">All day</Label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-gray-500">Start</Label>
              <Input
                type={isAllDay ? 'date' : 'datetime-local'}
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="h-7 text-xs mt-0.5"
              />
            </div>
            <div>
              <Label className="text-[10px] text-gray-500">End</Label>
              <Input
                type={isAllDay ? 'date' : 'datetime-local'}
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="h-7 text-xs mt-0.5"
              />
            </div>
          </div>

          <div>
            <Label className="text-[10px] text-gray-500">Location</Label>
            <Input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Optional"
              className="h-7 text-xs mt-0.5"
            />
          </div>

          <div>
            <Label className="text-[10px] text-gray-500">Notes</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optional"
              className="text-xs min-h-16 mt-0.5"
            />
          </div>

          <div>
            <Label className="text-[10px] text-gray-500">Status</Label>
            <Select value={status} onValueChange={v => setStatus(v as EventStatus)}>
              <SelectTrigger className="h-7 text-xs mt-0.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="confirmed" className="text-xs">Confirmed</SelectItem>
                <SelectItem value="tentative" className="text-xs">Tentative</SelectItem>
                <SelectItem value="cancelled" className="text-xs">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between pt-1">
            {event && onDelete ? (
              <Button variant="ghost" size="sm" onClick={handleDelete} className="text-red-600 hover:text-red-700 h-7 text-xs gap-1">
                <Trash2 className="h-3 w-3" />Delete
              </Button>
            ) : <div />}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose} className="h-7 text-xs" disabled={saving}>Cancel</Button>
              <Button size="sm" onClick={handleSave} className="h-7 text-xs" disabled={saving || !title.trim()}>
                {saving ? 'Saving…' : event ? 'Save' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
