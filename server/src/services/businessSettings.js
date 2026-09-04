import { prisma } from '../db.js';

export function defaultBusinessSettings() {
  return {
    businessName: process.env.BUSINESS_NAME || 'Distribution Management',
    gstin: process.env.BUSINESS_GSTIN || '',
    address: process.env.BUSINESS_ADDRESS || '',
    phone: process.env.BUSINESS_PHONE || '',
    state: process.env.BUSINESS_STATE || '',
    invoicePrefix: process.env.INVOICE_PREFIX || 'INV'
  };
}

export async function getBusinessSettings(client = prisma) {
  const saved = await client.businessSetting.findUnique({ where: { id: 'default' } });
  if (!saved) return defaultBusinessSettings();
  return {
    businessName: saved.businessName,
    gstin: saved.gstin || '',
    address: saved.address || '',
    phone: saved.phone || '',
    state: saved.state || '',
    invoicePrefix: saved.invoicePrefix
  };
}

export async function updateBusinessSettings(input) {
  const data = { ...input, invoicePrefix: input.invoicePrefix.toUpperCase() };
  await prisma.businessSetting.upsert({
    where: { id: 'default' },
    update: data,
    create: { id: 'default', ...data }
  });
  return getBusinessSettings();
}
