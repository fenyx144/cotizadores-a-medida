/** Siguiente nombre genérico de ubicación: "Ubicación N" (N = mayor número usado + 1, o cantidad + 1). */
export function nextLocationName(names: string[]): string {
  const nums = names.map((n) => /^ubicaci[oó]n\s+(\d+)$/i.exec(n.trim())?.[1]).filter(Boolean).map(Number);
  return `Ubicación ${Math.max(names.length, ...nums, 0) + 1}`;
}
