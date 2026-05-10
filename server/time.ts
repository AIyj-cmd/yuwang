export type PeriodRange = {
  start: string;
  end: string;
};

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(date.getDate() + days);
  return next;
};

export const getTodayRange = (now = new Date()): PeriodRange => {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = addDays(start, 1);
  return { start: start.toISOString(), end: end.toISOString() };
};

export const getWeekRange = (now = new Date()): PeriodRange => {
  const day = now.getDay() || 7;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - day + 1);
  const end = addDays(start, 7);
  return { start: start.toISOString(), end: end.toISOString() };
};

export const getMonthRange = (now = new Date()): PeriodRange => {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start: start.toISOString(), end: end.toISOString() };
};

export const getSeasonRange = (now = new Date()): PeriodRange => {
  const seasonStartMonth = Math.floor(now.getMonth() / 3) * 3;
  const start = new Date(now.getFullYear(), seasonStartMonth, 1);
  const end = new Date(now.getFullYear(), seasonStartMonth + 3, 1);
  return { start: start.toISOString(), end: end.toISOString() };
};
