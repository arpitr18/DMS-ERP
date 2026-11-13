export const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const requiredDays = weekDays.slice(0, 6);
export function normalizePhone(value) {
  let phone = String(value || '').replace(/[^0-9]/g, '').replace(/^0+/, '');
  if (phone.length === 12 && phone.startsWith('91')) phone = phone.slice(2);
  return phone;
}
export function normalizeEmail(value) { return String(value || '').trim().toLowerCase(); }
