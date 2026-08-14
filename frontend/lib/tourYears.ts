/** Label de turnê/agenda a partir dos anos dos shows (ex.: "2026", "2026/2027"). */
export function tourYearsLabel(
  dates: Array<string | Date>,
  fallbackYear = new Date().getFullYear()
): string {
  const years = Array.from(
    new Set(
      dates.map((d) => {
        if (d instanceof Date) return d.getFullYear();
        const [y] = d.split("-").map(Number);
        return y;
      })
    )
  )
    .filter((y) => Number.isFinite(y))
    .sort((a, b) => a - b);

  if (years.length === 0) return String(fallbackYear);
  if (years.length === 1) return String(years[0]);
  return `${years[0]}/${years[years.length - 1]}`;
}
