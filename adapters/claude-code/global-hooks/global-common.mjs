// Shared helpers for the global (user-level) Claude Code hooks installed by `install-global`.
// Layout: <claude-dir>/engineering-os/{hooks,kit,config.json}. These hooks run in every
// Claude Code session on the machine, so they must stay fast, read-only by default, and silent
// outside Git repositories.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const hooksDir = path.dirname(fileURLToPath(import.meta.url));
export const globalRoot = path.resolve(hooksDir, '..');
export const kitDir = path.join(globalRoot, 'kit');
export const kitCli = path.join(kitDir, 'src', 'cli.mjs');

export function readJson(file, fallback = {}) {
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return fallback; }
}

export const globalConfig = readJson(path.join(globalRoot, 'config.json'));

// Git root of the directory Claude Code was opened in, or null outside a repository.
export function projectGitRoot() {
  const start = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
  const result = spawnSync('git', ['-C', start, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  return result.status === 0 ? path.resolve(result.stdout.trim()) : null;
}

export function isInitialized(root) {
  return existsSync(path.join(root, '.engineering-os', 'config.json'));
}

// Repositories the global hooks must leave alone: an explicit opt-out file, or the kit's own repo.
export function isOptedOut(root) {
  if (existsSync(path.join(root, '.engineering-os-ignore'))) return true;
  return readJson(path.join(root, 'package.json')).name === 'engineering-os-kit';
}

// Runs a CLI command against the project: the project's own launcher when present,
// otherwise the global kit with an explicit --target.
export function runProjectCli(root, args) {
  const launcher = path.join(root, 'scripts', 'engineering-os.mjs');
  const command = existsSync(launcher) ? [launcher, ...args] : [kitCli, ...args, '--target', root];
  return spawnSync(process.execPath, command, { cwd: root, encoding: 'utf8' });
}

// Compares dotted versions; returns true when `a` is older than `b`.
export function isOlder(a, b) {
  const left = String(a ?? '0').split('.').map(Number);
  const right = String(b ?? '0').split('.').map(Number);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference < 0;
  }
  return false;
}
