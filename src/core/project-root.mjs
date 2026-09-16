import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';

export function resolveGitRoot(targetDirectory) {
  try {
    const root = execFileSync('git', ['-C', targetDirectory, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
    return realpathSync(root);
  } catch {
    throw new Error(`Target is not inside a Git repository: ${targetDirectory}`);
  }
}

function normalizeLocationInput(location) {
  if (typeof location !== 'string' || location.trim() === '') {
    throw new Error(`Invalid repository-relative location: ${location}`);
  }
  const normalized = location.replace(/\\/g, '/').trim();
  if (/^[a-zA-Z]:\//.test(normalized)) {
    throw new Error(`Absolute paths are not allowed: ${location}`);
  }
  const lineMatch = normalized.match(/^(.*):([1-9][0-9]*)$/);
  if (lineMatch) return { relativePath: lineMatch[1], lineText: lineMatch[2] };
  if (normalized.includes(':')) throw new Error(`Invalid repository-relative location: ${location}`);
  return { relativePath: normalized, lineText: null };
}

export function validateLocation(root, location) {
  const { relativePath, lineText } = normalizeLocationInput(location);
  const resolved = path.resolve(root, relativePath);
  const relative = path.relative(root, resolved);
  if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Location escapes project Git root: ${location}`);
  }
  if (!existsSync(resolved) || !statSync(resolved).isFile()) {
    throw new Error(`Location does not name an existing project file: ${location}`);
  }
  if (lineText) {
    const lineCount = readFileSync(resolved, 'utf8').split(/\r?\n/).length;
    if (Number(lineText) > lineCount) throw new Error(`Location line is beyond end of file: ${location}`);
  }
  return relative.split(path.sep).join('/');
}
