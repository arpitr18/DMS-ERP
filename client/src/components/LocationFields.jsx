import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import SearchableDropdown from './SearchableDropdown';

export default function LocationFields({ value, onChange }) {
  const { data: states = [], error: stateError } = useQuery({ queryKey: ['location-states'], queryFn: () => api('/locations/states') });
  const stateId = value.stateId || states.find(s => s.name.toLowerCase() === (value.state || '').trim().toLowerCase())?.id || '';
  const { data: cities = [], error: cityError } = useQuery({ queryKey: ['location-cities', stateId], queryFn: () => api('/locations/cities?stateId=' + encodeURIComponent(stateId)), enabled: Boolean(stateId) });
  return <><SearchableDropdown label="State / Union Territory" value={stateId} options={[{ value: '', label: 'Select a state' }, ...states.map(s => ({ value: s.id, label: s.name }))]} onChange={e => { const state = states.find(s => s.id === e.target.value); onChange({ ...value, stateId: state?.id || '', state: state?.name || '', cityId: '', city: '' }); }}/>
    <SearchableDropdown label="City" disabled={!stateId} value={value.cityId || ''} options={[{ value: '', label: stateId ? 'Select a city' : 'Select a state first' }, ...cities.map(c => ({ value: c.id, label: c.name }))]} onChange={e => { const city = cities.find(c => c.id === e.target.value); onChange({ ...value, stateId, cityId: city?.id || '', city: city?.name || '' }); }}/>
    {(stateError || cityError) && <p role="alert" className="text-sm text-red-700">Unable to load address options. Please try again.</p>}
  </>;
}
