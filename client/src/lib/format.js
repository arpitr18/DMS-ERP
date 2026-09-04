export const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value || 0));
export const number = value => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(value || 0));
export const date = value => value ? new Date(value).toLocaleDateString('en-IN') : '-';
export const today = () => new Date().toISOString().slice(0, 10);
