const prefixes = new Set(['TASK', 'INC', 'LES', 'HOF', 'EVD', 'DEC']);

export function dateStamp(date = new Date()) {
  return date.toISOString().slice(0, 10).replaceAll('-', '');
}

export function makeId(prefix, sequence, date = new Date()) {
  if (!prefixes.has(prefix)) throw new Error(`Unsupported record prefix: ${prefix}`);
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 999) {
    throw new Error('Record sequence must be an integer between 1 and 999.');
  }
  return `${prefix}-${dateStamp(date)}-${String(sequence).padStart(3, '0')}`;
}

export function isRecordId(value, prefix) {
  const expected = prefix ? `${prefix}-` : '(?:TASK|INC|LES|EVD|DEC)-';
  return new RegExp(`^${expected}[0-9]{8}-[0-9]{3}$`).test(value);
}
