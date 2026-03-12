/**
 * Format seconds into a human-readable duration string.
 * e.g., 3661 → "1h 1m", 90 → "1m 30s", 45 → "45s"
 */
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }
  return `${seconds}s`;
}

/**
 * Format seconds into a timer display string.
 * e.g., 90 → "1:30", 5 → "0:05"
 */
export function formatTimer(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format estimated minutes for workout cards.
 * e.g., 45 → "45 min", 90 → "1h 30m"
 */
export function formatEstimatedMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

/**
 * Calculate total volume (weight × reps) from a list of sets.
 */
export function calculateVolume(
  sets: { actual_reps?: number; actual_weight_lbs?: number }[],
): number {
  return sets.reduce((total, set) => {
    const reps = set.actual_reps ?? 0;
    const weight = set.actual_weight_lbs ?? 0;
    return total + reps * weight;
  }, 0);
}

/**
 * Format volume for display.
 * e.g., 12500 → "12,500 lbs"
 */
export function formatVolume(volumeLbs: number, units: 'lbs' | 'kg' = 'lbs'): string {
  const value = units === 'kg' ? Math.round(volumeLbs * 0.453592) : Math.round(volumeLbs);
  return `${value.toLocaleString()} ${units}`;
}

/**
 * Format sets × reps display.
 * e.g., (4, 10) → "4×10"
 */
export function formatSetsReps(sets: number, reps: number): string {
  return `${sets}×${reps}`;
}
