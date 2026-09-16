export function parseLocations(raw) {
  if (!raw) return [];
  return raw.split(',').map((value) => value.trim()).filter(Boolean);
}

export function parseList(raw) {
  if (!raw) return [];
  return raw.split(',').map((value) => value.trim()).filter(Boolean);
}
