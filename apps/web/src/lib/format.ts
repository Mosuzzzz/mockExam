export function formatDate(value: string | null, options: Intl.DateTimeFormatOptions = {}) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  }).format(date);
}

export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours && remaining) return `${hours} hr ${remaining} min`;
  if (hours) return `${hours} hr`;
  return `${remaining} min`;
}

export function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}
