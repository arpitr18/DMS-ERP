import { useEffect, useRef, useState } from 'react';
import LocationFields from './LocationFields';
import { Button, Input } from './ui';
import { api } from '../lib/api';

export default function RetailerAddressFields({ value, onChange }) {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(true);
  const latest = useRef({ value, onChange });
  latest.current = { value, onChange };
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  function capture() {
    setError('');
    if (!navigator.geolocation) { setError('GPS is unavailable in this browser.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async position => {
      if (!mounted.current) return;
      const coordinates = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      const captured = { ...latest.current.value, ...coordinates };
      latest.current.onChange(captured);
      try {
        const address = await api('/locations/capture-address', { method: 'POST', body: JSON.stringify(coordinates) });
        if (!mounted.current) return;
        const current = latest.current.value;
        // Keep manual address edits made while the lookup was in progress.
        const unchanged = ['stateId', 'cityId', 'pincode'].every(key => current[key] === captured[key]);
        if (unchanged) latest.current.onChange({ ...current, ...coordinates,
          ...(address.stateId ? { stateId: address.stateId, state: address.state, cityId: address.cityId, city: address.city } : {}),
          ...(address.pincode ? { pincode: address.pincode } : {})
        });
        if (!address.matched || !address.pincode) setError(`GPS captured. Please review the address. ${!address.matched ? 'Detected city/state is not available in the saved directory. Select it manually.' : 'PIN code was unavailable. Enter it manually.'}`);
      } catch (error) {
        if (mounted.current) setError(error.message);
      } finally { if (mounted.current) setLocating(false); }
    }, error => {
      if (!mounted.current) return;
      setError(error.code === 1 ? 'Location permission denied. Enable permission to capture GPS.' : 'Could not capture location. Please enable device location and retry.');
      setLocating(false);
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  }
  return <><Input label="Shop / building number and name" value={value.building} onChange={e => onChange({ ...value, building: e.target.value })}/><Input label="Street / locality" value={value.street} onChange={e => onChange({ ...value, street: e.target.value })}/><Input label="Landmark (optional)" value={value.landmark} onChange={e => onChange({ ...value, landmark: e.target.value })}/><LocationFields value={value} onChange={onChange}/><Input label="PIN code" inputMode="numeric" maxLength={6} value={value.pincode} onChange={e => onChange({ ...value, pincode: e.target.value.replace(/\D/g, '') })}/>
    <div className="sm:col-span-2 space-y-2"><Button variant="secondary" disabled={locating} loading={locating} onClick={capture}>Capture GPS and address</Button><p className="text-xs text-slate-500">Optional. With your permission, coordinates are sent to OpenStreetMap Nominatim to fill city, state and PIN code. Review the detected address. Requires HTTPS or localhost.</p><p className="text-xs text-slate-500">Address data © <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a> · <a className="underline" href="https://operations.osmfoundation.org/policies/nominatim/" target="_blank" rel="noopener noreferrer">Nominatim usage policy</a></p>{value.latitude != null && value.longitude != null && <div className="flex flex-wrap items-center gap-3 text-sm"><span>Latitude {Number(value.latitude).toFixed(7)} · Longitude {Number(value.longitude).toFixed(7)}</span><Button variant="secondary" disabled={locating} onClick={() => onChange({ ...value, latitude: null, longitude: null })}>Clear GPS</Button></div>}{error && <p role="alert" className="text-sm text-red-700">{error}</p>}</div></>;
}
