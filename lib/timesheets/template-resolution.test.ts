// Resolution order for the printed timesheet form:
//   project override ?? client organization default ?? 'default'

import { describe, it, expect } from 'vitest';
import { resolveTimesheetTemplate } from './types';

describe('resolveTimesheetTemplate', () => {
  it('falls back to the standard form when nothing is set', () => {
    expect(resolveTimesheetTemplate(null, null)).toBe('default');
    expect(resolveTimesheetTemplate(undefined, undefined)).toBe('default');
  });

  it('inherits the client organization default when the project has no override', () => {
    expect(resolveTimesheetTemplate(null, 'wbfilm')).toBe('wbfilm');
  });

  it('lets a project override its client', () => {
    expect(resolveTimesheetTemplate('default', 'wbfilm')).toBe('default');
    expect(resolveTimesheetTemplate('wbfilm', 'default')).toBe('wbfilm');
  });

  it('uses the project override when there is no client organization', () => {
    expect(resolveTimesheetTemplate('wbfilm', null)).toBe('wbfilm');
  });

  it('treats an explicit project "default" as a real override, not as unset', () => {
    // The distinction that forced projects.timesheet_template to be nullable:
    // NULL means inherit, 'default' means "this project uses the standard form
    // even though the client prefers something else".
    expect(resolveTimesheetTemplate('default', 'wbfilm')).not.toBe('wbfilm');
  });
});
