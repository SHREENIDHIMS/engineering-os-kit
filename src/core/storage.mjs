import { mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { validateRecordSchema } from './schema-validate.mjs';

export const recordDirectories = ['tasks', 'incidents', 'lessons', 'handoffs', 'decisions', 'evidence', 'state'];

export function osDirectory(root) {
  return path.join(root, '.engineering-os');
}

export function initializeStore(root, { write = false } = {}) {
  const missing = recordDirectories.filter((directory) => !existsSync(path.join(osDirectory(root), directory)));
  if (write) for (const directory of missing) mkdirSync(path.join(osDirectory(root), directory), { recursive: true });
  return missing;
}

export function writeProjectFile(root, relativePath, content, { write = false } = {}) {
  const destination = path.join(osDirectory(root), relativePath);
  if (existsSync(destination)) return { path: destination, status: 'present' };
  if (!write) return { path: destination, status: 'would-add' };
  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, content, 'utf8');
  return { path: destination, status: 'added' };
}

export function recordPath(root, kind, id) {
  return path.join(osDirectory(root), kind, `${id}.json`);
}

export function readRecord(root, kind, id) {
  const file = recordPath(root, kind, id);
  if (!existsSync(file)) throw new Error(`Record not found: ${kind}/${id}`);
  return JSON.parse(readFileSync(file, 'utf8'));
}

export function listRecords(root, kind) {
  const directory = path.join(osDirectory(root), kind);
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => JSON.parse(readFileSync(path.join(directory, entry.name), 'utf8')));
}

export function writeRecord(root, kind, record) {
  const validation = validateRecordSchema(kind, record);
  if (!validation.valid) throw new Error(`Invalid ${kind} record: ${validation.errors.join(' ')}`);
  const destination = recordPath(root, kind, record.id);
  mkdirSync(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  renameSync(temporary, destination);
  return destination;
}

export function nextSequence(root, kind, prefix, date) {
  const existing = listRecords(root, kind).map((record) => record.id).filter((id) => id.startsWith(`${prefix}-${date}-`));
  const values = existing.map((id) => Number(id.split('-').at(-1))).filter(Number.isInteger);
  return values.length === 0 ? 1 : Math.max(...values) + 1;
}
