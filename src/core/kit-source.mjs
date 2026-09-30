import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Identifies which kit build is running, without leaking machine-specific paths.
// A git clone reports its own commit; a copied kit (vendored or global) reports the
// commit recorded in kit-source.json when it was copied. Only a `.git` directly in the
// kit root counts, so a vendored kit never reports its host project's commit.
export function kitSource(root = kitRoot) {
  const version = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).version;
  let commit = null;
  if (existsSync(path.join(root, '.git'))) {
    const result = spawnSync('git', ['-C', root, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' });
    if (result.status === 0) commit = result.stdout.trim();
  } else if (existsSync(path.join(root, 'kit-source.json'))) {
    try { commit = JSON.parse(readFileSync(path.join(root, 'kit-source.json'), 'utf8')).commit ?? null; } catch { /* unknown */ }
  }
  return { version, commit, label: `engineering-os-kit@${version}${commit ? ` (${commit})` : ''}` };
}

// True when two paths name the same location. Resolves symlinks and, on Windows, 8.3 short
// names (RUNNER~1) and drive-letter case, which plain string comparison misses. Used by the
// guards that stop a kit copy from overwriting or deleting itself.
export function samePath(a, b) {
  const normalize = (value) => {
    let resolved;
    try { resolved = realpathSync.native(value); } catch { resolved = path.resolve(value); }
    return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
  };
  return normalize(a) === normalize(b);
}
