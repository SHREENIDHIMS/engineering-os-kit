import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const cli = path.resolve('src/cli.mjs');
const noGlobal = () => mkdtempSync(path.join(tmpdir(), 'engineering-os-noglobal-'));

function fixtureRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'engineering-os-release-'));
  execFileSync('git', ['init', '-q', root]);
  return root;
}

function run(root, ...args) {
  return JSON.parse(execFileSync(process.execPath, [cli, ...args, '--target', root], { encoding: 'utf8' }));
}

function runFail(root, ...args) {
  return spawnSync(process.execPath, [cli, ...args, '--target', root], { encoding: 'utf8' });
}

function ageTask(root, taskId, hours) {
  const file = path.join(root, '.engineering-os', 'tasks', `${taskId}.json`);
  const task = JSON.parse(readFileSync(file, 'utf8'));
  task.updatedAt = new Date(Date.now() - hours * 3_600_000).toISOString();
  writeFileSync(file, JSON.stringify(task));
}

test('release-task frees a stuck lock and records auditable evidence', () => {
  const root = fixtureRoot();
  run(root, 'init-project', '--adapter', 'none');
  const task = run(root, 'start-task', '--title', 'Crashed work', '--owner', 'agent-a', '--acceptance', 'done');
  const blocked = runFail(root, 'start-task', '--title', 'Next', '--owner', 'agent-b', '--acceptance', 'done');
  assert.equal(blocked.status, 1);
  assert.match(blocked.stderr, /release-task --task TASK-/);

  const result = run(root, 'release-task', '--task', task.id, '--owner', 'agent-b', '--reason', 'agent-a session crashed');
  assert.equal(result.task.status, 'abandoned');
  assert.equal(result.task.releasedBy, 'agent-b');
  assert.equal(result.previous.owner, 'agent-a');
  assert.match(result.evidence.summary, /agent-a session crashed/);
  assert.ok(result.task.evidenceIds.includes(result.evidence.id));

  assert.equal(run(root, 'start-task', '--title', 'Next', '--owner', 'agent-b', '--acceptance', 'done').status, 'active');
  const again = runFail(root, 'release-task', '--task', task.id, '--owner', 'agent-b', '--reason', 'twice');
  assert.equal(again.status, 1);
  assert.match(again.stderr, /abandoned/);
});

test('release-task requires a reason', () => {
  const root = fixtureRoot();
  run(root, 'init-project', '--adapter', 'none');
  const task = run(root, 'start-task', '--title', 'Work', '--owner', 'agent-a', '--acceptance', 'done');
  const missing = runFail(root, 'release-task', '--task', task.id, '--owner', 'agent-b');
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /--reason is required/);
});

test('stale active tasks are flagged by pre-task-check and the session briefing', () => {
  const root = fixtureRoot();
  run(root, 'init-project');
  const task = run(root, 'start-task', '--title', 'Old', '--owner', 'agent-a', '--acceptance', 'done');
  assert.ok(task.updatedAt);
  assert.equal(run(root, 'pre-task-check').warning, undefined);

  ageTask(root, task.id, 30);
  const check = run(root, 'pre-task-check');
  assert.equal(check.ready, true);
  assert.match(check.warning, /not been updated for 30h/);

  const briefing = spawnSync(process.execPath, [path.join(root, '.engineering-os', 'hooks', 'claude-session-start.mjs')], {
    encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: root, CLAUDE_CONFIG_DIR: noGlobal() }
  });
  assert.match(briefing.stdout, /WARNING: TASK-.* has not been updated for 30h/);

  const config = JSON.parse(readFileSync(path.join(root, '.engineering-os', 'config.json'), 'utf8'));
  writeFileSync(path.join(root, '.engineering-os', 'config.json'), JSON.stringify({ ...config, staleTaskHours: 48 }));
  assert.equal(run(root, 'pre-task-check').warning, undefined);
});

test('installedFrom records the kit version and commit, not a machine path', () => {
  const root = fixtureRoot();
  const config = run(root, 'init-project', '--adapter', 'none').adapter.config;
  assert.match(config.installedFrom, /^engineering-os-kit@\d+\.\d+\.\d+( \([0-9a-f]+\))?$/);
  const source = JSON.parse(readFileSync(path.join(root, '.engineering-os', 'kit', 'kit-source.json'), 'utf8'));
  assert.equal(source.version, config.version);
});

test('agent helper files install outside .claude/agents and upgrade removes legacy copies', () => {
  const root = fixtureRoot();
  run(root, 'init-project');
  assert.equal(readdirSync(path.join(root, '.claude', 'agents')).some((name) => name.startsWith('_')), false);
  assert.equal(existsSync(path.join(root, '.claude', 'agent-shared', '_SHARED.md')), true);

  writeFileSync(path.join(root, '.claude', 'agents', '_BASE.md'), 'legacy');
  const upgraded = run(root, 'upgrade');
  assert.ok(upgraded.adapter.items.some((item) => item.status === 'removed' && item.path.endsWith('_BASE.md')));
  assert.equal(existsSync(path.join(root, '.claude', 'agents', '_BASE.md')), false);
});

test('init-project --replace backs up an existing project harness and keeps local settings', () => {
  const root = fixtureRoot();
  mkdirSync(path.join(root, '.claude', 'agents'), { recursive: true });
  writeFileSync(path.join(root, '.claude', 'agents', 'old-agent.md'), 'old');
  writeFileSync(path.join(root, '.claude', 'settings.local.json'), '{"permissions":{"allow":["Bash(ls)"]}}');

  const result = run(root, 'init-project', '--replace');
  assert.equal(result.adapter.backup.status, 'moved');
  assert.deepEqual(result.adapter.backup.moved, ['.claude/agents']);
  assert.equal(existsSync(path.join(result.adapter.backup.backupDir, 'agents', 'old-agent.md')), true);
  assert.equal(existsSync(path.join(root, '.claude', 'agents', 'old-agent.md')), false);
  assert.equal(existsSync(path.join(root, '.claude', 'agents', '07-code-builder.md')), true);
  assert.match(readFileSync(path.join(root, '.claude', 'settings.local.json'), 'utf8'), /Bash\(ls\)/);
  assert.match(readFileSync(path.join(root, '.gitignore'), 'utf8'), /\.engineering-os\/backups\//);
});

test('upgrade refreshes an outdated managed .gitignore block and keeps user lines', () => {
  const root = fixtureRoot();
  writeFileSync(path.join(root, '.gitignore'), 'dist/\n# engineering-os:managed:start\n.engineering-os/state/*.lock\n# engineering-os:managed:end\nlogs/\n');
  run(root, 'init-project');
  assert.doesNotMatch(readFileSync(path.join(root, '.gitignore'), 'utf8'), /backups/);
  run(root, 'upgrade');
  const gitignore = readFileSync(path.join(root, '.gitignore'), 'utf8');
  assert.match(gitignore, /^dist\//);
  assert.match(gitignore, /logs\/\n$/);
  assert.match(gitignore, /\.engineering-os\/backups\//);
  assert.equal(gitignore.match(/engineering-os:managed:start/g).length, 1);
});
