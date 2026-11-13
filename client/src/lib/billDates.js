export { date as invoiceDateLabel } from './format';

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function billDateRange(mode, values) {
  if (mode === 'range') return { from: values.from, to: values.to };
  if (mode === 'month' && values.month) {
    const [year, month] = values.month.split('-').map(Number);
    return { from: `${values.month}-01`, to: dateKey(new Date(year, month, 0)) };
  }
  if (mode === 'year' && values.year) return { from: `${values.year}-01-01`, to: `${values.year}-12-31` };
  if (mode === 'week' && values.week) {
    const [year, week] = values.week.split('-W').map(Number);
    const monday = new Date(year, 0, 4);
    monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7 + (week - 1) * 7);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    return { from: dateKey(monday), to: dateKey(sunday) };
  }
  return {};
}
