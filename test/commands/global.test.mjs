import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

// Every test uses a throwaway Claude config dir; the real ~/.claude is never touched.
const cli = path.resolve('src/cli.mjs');

function claudeDir() {
  return path.join(mkdtempSync(path.join(tmpdir(), 'engineering-os-home-')), '.claude');
}

function gitRepo() {
  const root = mkdtempSync(path.join(tmpdir(), 'engineering-os-global-repo-'));
  execFileSync('git', ['init', '-q', root]);
  return root;
}

function cliJson(...args) {
  return JSON.parse(execFileSync(process.execPath, [cli, ...args], { encoding: 'utf8' }));
}

function claudeMdBeforeCheck(dir) {
  return readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');
}

function hook(dir, name, projectDir, extraEnv = {}) {
  return spawnSync(process.execPath, [path.join(dir, 'engineering-os', 'hooks', name)], {
    encoding: 'utf8', env: { ...process.env, CLAUDE_CONFIG_DIR: dir, CLAUDE_PROJECT_DIR: projectDir, ...extraEnv }
  });
}

test('install-global installs the harness and merges settings without losing existing ones', () => {
  const dir = claudeDir();
  mkdirSync(path.join(dir, 'sessions'), { recursive: true });
  writeFileSync(path.join(dir, '.credentials.json'), 'secret');
  writeFileSync(path.join(dir, 'settings.json'), JSON.stringify({ model: 'opus', hooks: { Stop: [{ hooks: [{ type: 'command', command: 'echo hi' }] }] } }));
  writeFileSync(path.join(dir, 'CLAUDE.md'), '# my rules\n');

  const result = cliJson('install-global', '--claude-dir', dir);
  assert.equal(result.mode, 'applied');
  assert.equal(result.claudeCodeDetected, true);
  assert.match(result.kit.source, /^engineering-os-kit@/);
  assert.equal(existsSync(path.join(dir, 'agents', '07-code-builder.md')), true);
  assert.equal(existsSync(path.join(dir, 'skills', 'project-bootstrap', 'SKILL.md')), true);
  assert.equal(existsSync(path.join(dir, 'commands', 'engineering-os', 'release-task.md')), true);
  assert.equal(existsSync(path.join(dir, 'engineering-os', 'kit', 'src', 'cli.mjs')), true);
  assert.equal(existsSync(path.join(dir, 'engineering-os', 'kit', 'test')), false);

  assert.equal(readFileSync(path.join(dir, '.credentials.json'), 'utf8'), 'secret');
  assert.equal(existsSync(path.join(dir, 'sessions')), true);
  const settings = JSON.parse(readFileSync(path.join(dir, 'settings.json'), 'utf8'));
  assert.equal(settings.model, 'opus');
  assert.equal(settings.hooks.Stop.length, 1);
  assert.equal(settings.hooks.SessionStart.length, 1);
  assert.equal(settings.hooks.PreToolUse.length, 2);
  assert.deepEqual(settings.attribution, { commit: false, pr: false, sessionUrl: false });
  assert.equal(existsSync(path.join(dir, 'engineering-os', 'hooks', 'global-no-ai-attribution.mjs')), true);
  assert.match(claudeMdBeforeCheck(dir), /No AI attribution/);
  const claudeMd = readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');
  assert.match(claudeMd, /^# my rules/);
  assert.match(claudeMd, /Engineering OS \(global\)/);

  cliJson('install-global', '--claude-dir', dir);
  const again = JSON.parse(readFileSync(path.join(dir, 'settings.json'), 'utf8'));
  assert.equal(again.hooks.SessionStart.length, 1);
  assert.equal(readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8').match(/engineering-os:global:start/g).length, 1);
});

test('install-global refuses to run from the installed global kit copy', () => {
  const dir = claudeDir();
  cliJson('install-global', '--claude-dir', dir);
  const globalCli = path.join(dir, 'engineering-os', 'kit', 'src', 'cli.mjs');
  const result = spawnSync(process.execPath, [globalCli, 'install-global', '--claude-dir', dir], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /not from the installed global copy/);
  assert.equal(existsSync(globalCli), true);
});

test('install-global --dry-run changes nothing', () => {
  const dir = claudeDir();
  mkdirSync(dir, { recursive: true });
  const result = cliJson('install-global', '--claude-dir', dir, '--dry-run');
  assert.equal(result.mode, 'dry-run');
  assert.deepEqual(readdirSync(dir), []);
});

test('install-global --replace moves old agents, skills and commands to a backup', () => {
  const dir = claudeDir();
  mkdirSync(path.join(dir, 'agents'), { recursive: true });
  mkdirSync(path.join(dir, 'skills', 'old-skill'), { recursive: true });
  writeFileSync(path.join(dir, 'agents', 'old-agent.md'), 'old');
  writeFileSync(path.join(dir, 'skills', 'old-skill', 'SKILL.md'), 'old');
  writeFileSync(path.join(dir, '.credentials.json'), 'secret');

  const result = cliJson('install-global', '--claude-dir', dir, '--replace');
  assert.equal(result.backup.status, 'moved');
  assert.deepEqual(result.backup.moved, ['agents', 'skills']);
  assert.equal(existsSync(path.join(result.backup.backupDir, 'agents', 'old-agent.md')), true);
  assert.equal(existsSync(path.join(dir, 'agents', 'old-agent.md')), false);
  assert.equal(existsSync(path.join(dir, 'skills', 'old-skill')), false);
  assert.equal(existsSync(path.join(dir, 'agents', '07-code-builder.md')), true);
  assert.equal(readFileSync(path.join(dir, '.credentials.json'), 'utf8'), 'secret');
});

test('install-global refuses an invalid settings.json and changes nothing', () => {
  const dir = claudeDir();
  mkdirSync(path.join(dir, 'agents'), { recursive: true });
  writeFileSync(path.join(dir, 'settings.json'), '{ not json');
  const result = spawnSync(process.execPath, [cli, 'install-global', '--claude-dir', dir, '--replace'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /not valid JSON/);
  assert.equal(existsSync(path.join(dir, 'engineering-os')), false);
  assert.equal(existsSync(path.join(dir, 'agents')), true);
});

test('global hooks guide setup, then enforce the task gate once a repo is initialized', () => {
  const dir = claudeDir();
  cliJson('install-global', '--claude-dir', dir);
  const repo = gitRepo();

  const setup = hook(dir, 'global-session-start.mjs', repo);
  assert.match(setup.stdout, /does not have Engineering OS yet/);
  assert.match(setup.stdout, /init-project --target \./);
  assert.equal(hook(dir, 'global-pre-edit.mjs', repo).status, 0);

  execFileSync(process.execPath, [path.join(dir, 'engineering-os', 'kit', 'src', 'cli.mjs'), 'init-project', '--target', repo]);
  assert.match(hook(dir, 'global-session-start.mjs', repo).stdout, /Engineering OS briefing/);
  const blocked = hook(dir, 'global-pre-edit.mjs', repo);
  assert.equal(blocked.status, 2);
  assert.match(blocked.stderr, /No active task/);

  // Project-level hooks step aside when the global hooks are installed, so nothing runs twice.
  const projectEnv = { CLAUDE_CONFIG_DIR: dir, CLAUDE_PROJECT_DIR: repo };
  const projectBriefing = spawnSync(process.execPath, [path.join(repo, '.engineering-os', 'hooks', 'claude-session-start.mjs')], { encoding: 'utf8', env: { ...process.env, ...projectEnv } });
  assert.equal(projectBriefing.stdout, '');
  const projectGate = spawnSync(process.execPath, [path.join(repo, '.engineering-os', 'hooks', 'claude-pre-edit.mjs')], { encoding: 'utf8', env: { ...process.env, ...projectEnv } });
  assert.equal(projectGate.status, 0);

  execFileSync(process.execPath, [path.join(repo, 'scripts', 'engineering-os.mjs'), 'start-task', '--title', 'T', '--owner', 'me', '--acceptance', 'ok']);
  assert.equal(hook(dir, 'global-pre-edit.mjs', repo).status, 0);
  assert.equal(hook(dir, 'global-pre-edit.mjs', repo, { ENGINEERING_OS_ENFORCE: '0' }).status, 0);
});

test('global hooks stay silent outside Git repos and in opted-out repos', () => {
  const dir = claudeDir();
  cliJson('install-global', '--claude-dir', dir);
  const plain = mkdtempSync(path.join(tmpdir(), 'engineering-os-plain-'));
  assert.equal(hook(dir, 'global-session-start.mjs', plain).stdout, '');
  const optedOut = gitRepo();
  writeFileSync(path.join(optedOut, '.engineering-os-ignore'), '');
  assert.equal(hook(dir, 'global-session-start.mjs', optedOut).stdout, '');
  assert.equal(hook(dir, 'global-session-start.mjs', path.resolve('.')).stdout, '');
});

test('install-global --auto-init sets up a repo at session start and suggests upgrades', () => {
  const dir = claudeDir();
  assert.equal(cliJson('install-global', '--claude-dir', dir, '--auto-init').autoInit, true);
  const repo = gitRepo();
  const started = hook(dir, 'global-session-start.mjs', repo);
  assert.match(started.stdout, /initialized automatically/);
  assert.equal(existsSync(path.join(repo, '.engineering-os', 'config.json')), true);
  assert.equal(existsSync(path.join(repo, '.claude', 'settings.json')), true);

  const configPath = path.join(repo, '.engineering-os', 'config.json');
  writeFileSync(configPath, JSON.stringify({ ...JSON.parse(readFileSync(configPath, 'utf8')), version: '0.0.1' }));
  assert.match(hook(dir, 'global-session-start.mjs', repo).stdout, /upgrade --target \./);
});

test('uninstall-global removes only what was installed and keeps backups and other settings', () => {
  const dir = claudeDir();
  mkdirSync(path.join(dir, 'agents'), { recursive: true });
  writeFileSync(path.join(dir, 'agents', 'mine.md'), 'mine');
  writeFileSync(path.join(dir, 'settings.json'), JSON.stringify({ model: 'opus' }));
  writeFileSync(path.join(dir, 'CLAUDE.md'), '# my rules\n');
  cliJson('install-global', '--claude-dir', dir);
  writeFileSync(path.join(dir, 'agents', 'added-later.md'), 'mine too');

  const result = cliJson('uninstall-global', '--claude-dir', dir);
  assert.ok(result.removedFiles > 0);
  assert.equal(existsSync(path.join(dir, 'engineering-os')), false);
  assert.equal(existsSync(path.join(dir, 'agents', '07-code-builder.md')), false);
  assert.equal(existsSync(path.join(dir, 'agents', 'mine.md')), true);
  assert.equal(existsSync(path.join(dir, 'agents', 'added-later.md')), true);
  assert.equal(existsSync(path.join(dir, 'skills')), false);
  // Hooks are removed; attribution stays off on purpose so the rule keeps applying.
  assert.deepEqual(JSON.parse(readFileSync(path.join(dir, 'settings.json'), 'utf8')), { model: 'opus', attribution: { commit: false, pr: false, sessionUrl: false } });
  assert.equal(readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8'), '# my rules\n');
});
