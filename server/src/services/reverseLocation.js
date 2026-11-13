const cache = new Map();
let nextRequestAt = 0;

// Public Nominatim was explicitly selected for this single-server application.
// Keep the endpoint configurable so it can be switched without a code deployment.
export async function reverseLocation(latitude, longitude) {
  const endpoint = process.env.GEOCODING_REVERSE_URL || 'https://nominatim.openstreetmap.org/reverse';
  const url = new URL(endpoint);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Invalid geocoding configuration.');
  const key = `${endpoint}|${latitude.toFixed(5)},${longitude.toFixed(5)}`;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.address;
  const now = Date.now();
  if (now < nextRequestAt) throw Object.assign(new Error('Please wait a moment before capturing another address.'), { status: 429 });
  nextRequestAt = now + 1100;
  url.searchParams.set('lat', String(latitude));
  url.searchParams.set('lon', String(longitude));
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('accept-language', 'en');
  let response;
  try {
    response = await fetch(url, { headers: { 'User-Agent': process.env.GEOCODING_USER_AGENT || 'ShivKripaDistributionManagement/1.0 (+https://shivkripa.live)', Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
  } catch {
    throw Object.assign(new Error('Address lookup is unavailable. Coordinates are saved in the form. Select the address manually or retry.'), { status: 502 });
  }
  if (!response.ok) throw Object.assign(new Error('Address lookup failed. Please select your address manually or retry.'), { status: 502 });
  const result = await response.json();
  if (!result.address) throw Object.assign(new Error('No address was found at this location.'), { status: 404 });
  if (cache.size >= 1000) cache.delete(cache.keys().next().value);
  cache.set(key, { address: result.address, expires: now + 86400000 });
  return result.address;
}

export function matchLocation(address, states, cities) {
  const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const state = states.find(state => normalize(state.name) === normalize(address.state));
  const candidates = [address.city, address.town, address.municipality, address.village, address.city_district, address.county, address.state_district].filter(Boolean);
  const city = state && cities.find(city => city.stateId === state.id && candidates.some(candidate => normalize(candidate) === normalize(city.name)));
  return {
    stateId: state?.id || '', state: state?.name || '', cityId: city?.id || '', city: city?.name || '',
    pincode: /^[1-9]\d{5}$/.test(address.postcode || '') ? address.postcode : '',
    matched: Boolean(state && city), detectedState: address.state || '', detectedCity: candidates[0] || ''
  };
}
