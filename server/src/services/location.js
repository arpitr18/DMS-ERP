export async function resolveLocation(tx, data, existing) {
  const stateId = data.stateId ?? existing?.stateId;
  const cityId = data.cityId ?? existing?.cityId;
  const stateName = data.state ?? existing?.state;
  const cityName = data.city ?? existing?.city;
  const state = stateId ? await tx.locationState.findUnique({ where: { id: stateId } }) : await tx.locationState.findUnique({ where: { name: stateName || '' } });
  const city = cityId ? await tx.locationCity.findUnique({ where: { id: cityId } }) : state && cityName ? await tx.locationCity.findUnique({ where: { stateId_name: { stateId: state.id, name: cityName } } }) : null;
  if (!state || !city || city.stateId !== state.id) throw Object.assign(new Error('Select a state and a city belonging to that state from the address dropdowns.'), { status: 400 });
  return { stateId: state.id, cityId: city.id, state: state.name, city: city.name };
}
