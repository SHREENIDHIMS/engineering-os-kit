import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { osDirectory } from './storage.mjs';

export const defaultStaleTaskHours = 24;

// Hours since the task was last written. Older records without updatedAt fall back to createdAt.
export function taskAgeHours(task, now = Date.now()) {
  const stamp = Date.parse(task.updatedAt ?? task.createdAt ?? '');
  if (Number.isNaN(stamp)) return null;
  return (now - stamp) / 3_600_000;
}

// Threshold comes from `.engineering-os/config.json` → `staleTaskHours` (default 24).
export function staleTaskHours(root) {
  const configPath = path.join(osDirectory(root), 'config.json');
  if (!existsSync(configPath)) return defaultStaleTaskHours;
  try {
    const value = Number(JSON.parse(readFileSync(configPath, 'utf8')).staleTaskHours);
    return Number.isFinite(value) && value > 0 ? value : defaultStaleTaskHours;
  } catch {
    return defaultStaleTaskHours;
  }
}

export function staleInfo(root, task, now = Date.now()) {
  const age = taskAgeHours(task, now);
  const threshold = staleTaskHours(root);
  return { ageHours: age === null ? null : Math.round(age * 10) / 10, thresholdHours: threshold, stale: age !== null && age >= threshold };
}

export function releaseHint(task) {
  return `If it was abandoned, release it: node scripts/engineering-os.mjs release-task --task ${task.id} --owner <you> --reason "<why>"`;
}
