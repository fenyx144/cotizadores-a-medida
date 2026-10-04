/**
 * Utilidad para pintar un calendario mensual (lunes a domingo).
 * Devuelve semanas con días; los días de otros meses vienen marcados.
 */
export interface CalendarDay {
  key: string; // YYYY-MM-DD
  day: number;
  inMonth: boolean;
}

export function monthGrid(year: number, month: number): CalendarDay[][] {
  // month: 1-12
  const first = new Date(year, month - 1, 1);
  const offset = (first.getDay() + 6) % 7; // lunes = 0
  const start = new Date(year, month - 1, 1 - offset);
  const weeks: CalendarDay[][] = [];
  const cursor = new Date(start);
  do {
    const week: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) {
      const pad = (n: number) => String(n).padStart(2, "0");
      week.push({
        key: `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(cursor.getDate())}`,
        day: cursor.getDate(),
        inMonth: cursor.getMonth() === month - 1,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  } while (cursor.getMonth() === month - 1);
  return weeks;
}

export const MONTH_NAMES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
