import { randomBytes } from 'node:crypto';

export function retailerAddress(data, existing) {
  const merged = { ...existing, ...data };
  if ((merged.latitude != null) !== (merged.longitude != null)) {
    throw Object.assign(new Error('Latitude and longitude must be provided together.'), { status: 400 });
  }
  const structured = [merged.building, merged.street, merged.landmark, merged.pincode].some(Boolean);
  if (!structured) return {};
  if (!merged.building?.trim() || !merged.street?.trim() || !/^[1-9]\d{5}$/.test(merged.pincode || '')) {
    throw Object.assign(new Error('Enter shop/building, street/locality and a valid six-digit PIN code.'), { status: 400 });
  }
  return { address: [merged.building, merged.street, merged.landmark, merged.pincode].filter(Boolean).join(', ') };
}

export async function retailerCode(tx, data) {
  if (!/^[1-9]\d{5}$/.test(data.pincode || '')) throw Object.assign(new Error('A valid PIN code is required to generate the retailer code.'), { status: 400 });
  const words = (data.city || '').toUpperCase().match(/[A-Z]+/g) || [];
  const initials = words.length > 1 ? words.map(word => word[0]).join('').slice(0, 3) : (words[0] || '').slice(0, 3);
  if (!initials) throw Object.assign(new Error('Select a city before generating the retailer code.'), { status: 400 });
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = `R${data.pincode}${initials}${randomBytes(4).toString('hex').toUpperCase()}`;
    if (!await tx.retailer.findUnique({ where: { code } })) return code;
  }
  throw Object.assign(new Error('Could not allocate a retailer code. Please retry.'), { status: 409 });
}
