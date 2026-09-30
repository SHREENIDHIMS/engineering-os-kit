import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { recordDirectories, listRecords } from '../core/storage.mjs';
import { validateRecordSchema } from '../core/schema-validate.mjs';
import { legacyPaths } from '../core/adapter-install.mjs';
import { agentsContractStart } from '../core/agents-contract.mjs';
import { defaultClaudeDir, globalHookMarker } from '../core/global-install.mjs';
import { staleInfo } from '../core/stale.mjs';
import { collectSafetyErrors, kitVersion, print } from './shared.mjs';

// `doctor`: read-only health check of the environment, the project install and the global
// install. Every problem carries the exact command that fixes it. Exit code 1 only on `fail`;
// `warn` means it works but should be improved.

const recordKinds = ['tasks', 'incidents', 'lessons', 'handoffs', 'decisions', 'evidence'];

function readJson(file) {
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; }
}

function readText(file) {
  return existsSync(file) ? readFileSync(file, 'utf8') : '';
}

function isOlder(a, b) {
  const left = String(a ?? '0').split('.').map(Number);
  const right = String(b ?? '0').split('.').map(Number);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference < 0;
  }
  return false;
}

function gitRoot(start) {
  const result = spawnSync('git', ['-C', start, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  return result.status === 0 ? path.resolve(result.stdout.trim()) : null;
}

function environmentChecks(check) {
  const major = Number(process.versions.node.split('.')[0]);
  check('environment', 'node', major >= 20 ? 'ok' : 'fail', `Node.js ${process.versions.node}`, 'Install Node.js 20 or newer.');
  const git = spawnSync('git', ['--version'], { encoding: 'utf8' });
  check('environment', 'git', git.status === 0 ? 'ok' : 'fail', git.status === 0 ? git.stdout.trim() : 'git not found on PATH', 'Install Git and make sure it is on PATH.');
}

function projectChecks(check, root, globalKitCli) {
  const osDir = path.join(root, '.engineering-os');
  const config = readJson(path.join(osDir, 'config.json'));
  const setupCommand = globalKitCli ? `node "${globalKitCli}" init-project --target .` : 'npx --yes github:shreenidhims/engineering-os-kit init-project --target .';
  const upgradeCommand = globalKitCli ? `node "${globalKitCli}" upgrade --target .` : 'npx --yes github:shreenidhims/engineering-os-kit upgrade --target .';

  if (existsSync(path.join(root, '.engineering-os-ignore'))) check('project', 'opt-out', 'ok', '.engineering-os-ignore present; global hooks skip this repo.');
  if (!config) {
    check('project', 'installed', 'warn', `Engineering OS is not set up in ${root}.`, setupCommand);
    return;
  }
  check('project', 'installed', 'ok', `kit ${config.version} (${config.installedFrom ?? 'unknown source'}), adapter ${config.adapter}`);

  const missingDirs = recordDirectories.filter((name) => !existsSync(path.join(osDir, name)));
  check('project', 'record-store', missingDirs.length === 0 ? 'ok' : 'fail', missingDirs.length === 0 ? 'all record folders present' : `missing: ${missingDirs.join(', ')}`, upgradeCommand);

  const launcher = existsSync(path.join(root, 'scripts', 'engineering-os.mjs'));
  const vendored = existsSync(path.join(root, config.kitPath ?? '.engineering-os/kit', 'src', 'cli.mjs'));
  check('project', 'launcher', launcher && vendored ? 'ok' : 'fail', launcher && vendored ? 'scripts/engineering-os.mjs and vendored kit present' : `${launcher ? '' : 'launcher missing '}${vendored ? '' : 'vendored kit missing'}`.trim(), upgradeCommand);

  if (isOlder(config.version, kitVersion())) check('project', 'version', 'warn', `project kit ${config.version} is older than this kit ${kitVersion()}`, upgradeCommand);

  const invalid = [];
  for (const kind of recordKinds) {
    for (const record of listRecords(root, kind)) {
      const result = validateRecordSchema(kind, record);
      if (!result.valid) invalid.push(`${record.id ?? kind}: ${result.errors.join(' ')}`);
    }
  }
  const unsafe = collectSafetyErrors(root).map((item) => `${item.record}: ${item.error}`);
  const problems = [...invalid, ...unsafe];
  check('project', 'records', problems.length === 0 ? 'ok' : 'fail', problems.length === 0 ? 'all records valid' : problems.join('; '), 'Fix the listed records with the CLI (update-task, enforce-lesson); do not hand-edit JSON.');

  const tasks = listRecords(root, 'tasks');
  const active = tasks.find((task) => task.status === 'active');
  const handoff = tasks.find((task) => task.status === 'handoff');
  if (handoff) check('project', 'handoff', 'warn', `${handoff.id} awaits accept-handoff; edits are blocked until then.`, `node scripts/engineering-os.mjs accept-handoff --handoff <HOF-id> --owner <you>`);
  if (active) {
    const stale = staleInfo(root, active);
    check('project', 'active-task', stale.stale ? 'warn' : 'ok', `${active.id} owned by ${active.owner}, updated ${stale.ageHours}h ago`,
      stale.stale ? `If abandoned: node scripts/engineering-os.mjs release-task --task ${active.id} --owner <you> --reason "..."` : undefined);
  } else if (!handoff) {
    check('project', 'active-task', 'ok', 'no active task (edits are blocked until start-task)');
  }

  const agents = readText(path.join(root, 'AGENTS.md'));
  check('project', 'agents-md', agents.includes(agentsContractStart) ? 'ok' : 'warn', agents.includes(agentsContractStart) ? 'managed section present' : 'AGENTS.md has no Engineering OS section', upgradeCommand);
  const gitignored = readText(path.join(root, '.gitignore')).includes('# engineering-os:managed:start');
  check('project', 'gitignore', gitignored ? 'ok' : 'warn', gitignored ? 'managed section present' : '.gitignore does not ignore lock, temp and backup files', upgradeCommand);

  if (config.adapter !== 'claude') return;
  const settings = readText(path.join(root, '.claude', 'settings.json'));
  const hooksWired = settings.includes('.engineering-os/hooks/claude-');
  const hookFiles = ['claude-pre-edit.mjs', 'claude-session-start.mjs', 'defer-to-global.mjs'].filter((file) => !existsSync(path.join(osDir, 'hooks', file)));
  check('project', 'claude-hooks', hooksWired && hookFiles.length === 0 ? 'ok' : 'warn',
    hooksWired && hookFiles.length === 0 ? 'SessionStart and PreToolUse hooks wired' : `${hooksWired ? '' : '.claude/settings.json has no Engineering OS hooks. '}${hookFiles.length ? `missing: ${hookFiles.join(', ')}` : ''}`.trim(), upgradeCommand);
  const claudeMd = readText(path.join(root, 'CLAUDE.md'));
  check('project', 'claude-md', claudeMd.includes('@AGENTS.md') ? 'ok' : 'warn', claudeMd.includes('@AGENTS.md') ? 'CLAUDE.md imports AGENTS.md' : 'CLAUDE.md does not import AGENTS.md, so Claude Code will not read the contract', upgradeCommand);
  const legacy = legacyPaths.filter((file) => existsSync(path.join(root, file)));
  if (legacy.length > 0) check('project', 'legacy-files', 'warn', `outdated files: ${legacy.join(', ')}`, upgradeCommand);
}

function globalChecks(check, claudeDir) {
  const globalRoot = path.join(claudeDir, 'engineering-os');
  const config = readJson(path.join(globalRoot, 'config.json'));
  const installCommand = 'npx --yes github:shreenidhims/engineering-os-kit install-global';
  if (!config) {
    check('global', 'installed', 'ok', `not installed in ${claudeDir} (optional; adds the harness to every Claude Code session)`, installCommand);
    return null;
  }
  check('global', 'installed', 'ok', `kit ${config.version} (${config.installedFrom}), autoInit ${config.autoInit ? 'on' : 'off'}`);
  const kitCli = path.join(globalRoot, 'kit', 'src', 'cli.mjs');
  const hooks = ['global-session-start.mjs', 'global-pre-edit.mjs', 'global-common.mjs'].filter((file) => !existsSync(path.join(globalRoot, 'hooks', file)));
  const wired = readText(path.join(claudeDir, 'settings.json')).includes(globalHookMarker);
  const healthy = existsSync(kitCli) && hooks.length === 0 && wired;
  check('global', 'hooks', healthy ? 'ok' : 'fail',
    healthy ? 'global kit, hooks and settings.json entries present' : `${existsSync(kitCli) ? '' : 'global kit missing. '}${hooks.length ? `missing hooks: ${hooks.join(', ')}. ` : ''}${wired ? '' : 'settings.json has no global hooks.'}`.trim(), installCommand);
  if (isOlder(config.version, kitVersion())) check('global', 'version', 'warn', `global kit ${config.version} is older than this kit ${kitVersion()}`, installCommand);
  return existsSync(kitCli) ? kitCli.split(path.sep).join('/') : null;
}

export function commandDoctor(args) {
  const checks = [];
  const check = (area, name, status, detail, fix) => checks.push({ area, name, status, detail, ...(status !== 'ok' && fix ? { fix } : {}) });

  environmentChecks(check);
  const globalKitCli = globalChecks(check, args['claude-dir'] ? path.resolve(args['claude-dir']) : defaultClaudeDir());
  const root = gitRoot(path.resolve(args.target ?? process.cwd()));
  if (root) projectChecks(check, root, globalKitCli);
  else check('project', 'git-repo', 'warn', 'not inside a Git repository; project checks skipped', 'Run doctor from a project, or pass --target <repo>.');

  const summary = { ok: 0, warn: 0, fail: 0 };
  for (const item of checks) summary[item.status] += 1;
  print({ healthy: summary.fail === 0, root, summary, checks });
  if (summary.fail > 0) process.exitCode = 1;
}
