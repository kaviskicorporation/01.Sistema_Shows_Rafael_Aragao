export const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export const MONTHS_SHORT_PT = [
  "JAN", "FEV", "MAR", "ABR", "MAI", "JUN",
  "JUL", "AGO", "SET", "OUT", "NOV", "DEZ",
];

/** Parse a "YYYY-MM-DD" date as a local date (avoids timezone shifting). */
export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function dayOf(dateStr: string): string {
  return String(parseDate(dateStr).getDate()).padStart(2, "0");
}

export function monthShort(dateStr: string): string {
  return MONTHS_SHORT_PT[parseDate(dateStr).getMonth()];
}

export function monthYearLabel(dateStr: string): string {
  const d = parseDate(dateStr);
  return `${MONTHS_PT[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatFullDate(dateStr: string): string {
  const d = parseDate(dateStr);
  return `${d.getDate()} de ${MONTHS_PT[d.getMonth()]} de ${d.getFullYear()}`;
}

export function formatTime(time: string | null): string {
  if (!time) return "";
  return time.slice(0, 5);
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function groupByMonth<T extends { date: string }>(
  items: T[]
): { label: string; key: string; items: T[] }[] {
  const groups = new Map<string, { label: string; key: string; items: T[] }>();
  for (const item of items) {
    const d = parseDate(item.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!groups.has(key)) {
      groups.set(key, { label: monthYearLabel(item.date), key, items: [] });
    }
    groups.get(key)!.items.push(item);
  }
  return Array.from(groups.values()).sort((a, b) => a.key.localeCompare(b.key));
}
