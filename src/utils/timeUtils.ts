/** Seconds -> "m:ss" (e.g. 5 -> "0:05", 65 -> "1:05", 3725 -> "62:05"). */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
