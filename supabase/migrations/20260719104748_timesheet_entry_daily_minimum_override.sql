-- Per-day override of the timesheet-level daily_minimum_8h setting.
-- null = inherit the timesheet's default; true/false = force on/off for this day.
alter table public.timesheet_entries
  add column daily_minimum_override boolean;
