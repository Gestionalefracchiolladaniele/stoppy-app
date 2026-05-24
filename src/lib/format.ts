/** Format seconds as a session-friendly label. */
export function formatDuration(seconds: number | null | undefined): string {
  const s = Math.max(0, Math.round(seconds ?? 0));
  if (s === 0) return '0s';
  if (s < 60) return `${s}s`;
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  if (mins < 60) {
    return secs === 0 ? `${mins} min` : `${mins}m ${secs}s`;
  }
  const hrs = Math.floor(mins / 60);
  const remMin = mins % 60;
  return remMin === 0 ? `${hrs}h` : `${hrs}h ${remMin}m`;
}

/** Short form (always m:ss) for compact list rows. */
export function formatMmSs(seconds: number | null | undefined): string {
  const s = Math.max(0, Math.round(seconds ?? 0));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
