import { describe, expect, it } from 'vitest';
import { mapEventToCycle, getCycleLetter, parseKey } from './cycleEngine';

describe('mapEventToCycle', () => {
  const cycleStartDate = '2026-04-06'; // Monday, Week A

  it('maps weekly events to all cycle weeks on the same day', () => {
    const result = mapEventToCycle('RRULE:FREQ=WEEKLY;INTERVAL=1', '2026-04-08T09:00:00', cycleStartDate);
    expect(result).toEqual({
      recurrence: 'weekly',
      slots: [
        { week: 'A', day: 'Wed' },
        { week: 'B', day: 'Wed' },
        { week: 'C', day: 'Wed' },
      ],
    });
  });

  it('maps three-week events to one specific cycle week', () => {
    const result = mapEventToCycle('RRULE:FREQ=WEEKLY;INTERVAL=3', '2026-04-20T10:00:00', cycleStartDate);
    expect(result).toEqual({
      recurrence: 'three-weekly',
      slots: [{ week: 'C', day: 'Mon' }],
    });
  });

  it('maps bi-weekly events to one specific cycle week', () => {
    const result = mapEventToCycle('RRULE:FREQ=WEEKLY;INTERVAL=2', '2026-04-13T12:00:00', cycleStartDate);
    expect(result).toEqual({
      recurrence: 'biweekly',
      slots: [{ week: 'B', day: 'Mon' }],
    });
  });

  it('rejects monthly and yearly rules', () => {
    expect(mapEventToCycle('RRULE:FREQ=MONTHLY;INTERVAL=1', '2026-04-08T09:00:00', cycleStartDate)).toBeNull();
    expect(mapEventToCycle('RRULE:FREQ=YEARLY;INTERVAL=1', '2026-04-08T09:00:00', cycleStartDate)).toBeNull();
  });

  it('keeps Monday boundary aligned to cycle weeks', () => {
    expect(getCycleLetter(parseKey('2026-04-06'), parseKey(cycleStartDate))).toBe('A');
    expect(getCycleLetter(parseKey('2026-04-13'), parseKey(cycleStartDate))).toBe('B');
    expect(getCycleLetter(parseKey('2026-04-20'), parseKey(cycleStartDate))).toBe('C');
    expect(getCycleLetter(parseKey('2026-04-27'), parseKey(cycleStartDate))).toBe('A');
  });
});
