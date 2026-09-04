export function generateInvoiceNumber(
  prefix = process.env.INVOICE_PREFIX || "INV",
) {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const tail = `${String(d.getTime()).slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
  return `${prefix}-${ymd}-${tail}`;
}
