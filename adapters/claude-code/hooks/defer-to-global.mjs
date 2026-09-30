// Shared by the project-level Claude Code hooks. When Engineering OS is also installed
// globally (~/.claude/settings.json carries the global hooks), the global hooks do the work
// for every project, so the project copies step aside to avoid running everything twice.
// The global hooks set ENGINEERING_OS_FROM_GLOBAL=1 when they call back into a project hook.
import { existsSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const globalHookMarker = 'engineering-os/hooks/global-';

export function globalClaudeDir() {
  return process.env.CLAUDE_CONFIG_DIR ?? path.join(os.homedir(), '.claude');
}

export function globalHooksInstalled() {
  const settingsPath = path.join(globalClaudeDir(), 'settings.json');
  if (!existsSync(settingsPath)) return false;
  try { return readFileSync(settingsPath, 'utf8').includes(globalHookMarker); } catch { return false; }
}

export function shouldDeferToGlobal() {
  return process.env.ENGINEERING_OS_FROM_GLOBAL !== '1' && globalHooksInstalled();
}
