export const n = (value) => Number(value || 0);
export const money = (value) =>
  Math.round((n(value) + Number.EPSILON) * 100) / 100;
export const qty = (value) =>
  Math.round((n(value) + Number.EPSILON) * 1000) / 1000;

export function dateRange(query) {
  const now = new Date();
  const start = query.from
    ? new Date(`${query.from}T00:00:00`)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const end = query.to
    ? new Date(`${query.to}T23:59:59.999`)
    : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}
