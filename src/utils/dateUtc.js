export function toUtcDateInputValue(value = new Date()) {
  return new Date(value).toISOString().slice(0, 10);
}

export function getUtcCurrentMonthRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return {
    startDate: toUtcDateInputValue(start),
    endDate: toUtcDateInputValue(end),
  };
}

export function formatDateUtc(dateStr, locale = 'en-US') {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
