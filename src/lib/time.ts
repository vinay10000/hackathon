import { differenceInCalendarDays, format, parseISO } from 'date-fns';

export function toDateKey(value: Date | string) {
  const date = typeof value === 'string' ? parseISO(value) : value;
  return format(date, 'yyyy-MM-dd');
}

export function daysBetween(startDate: string, endDate: string) {
  return differenceInCalendarDays(parseISO(endDate), parseISO(startDate));
}
