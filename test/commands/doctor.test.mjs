import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const cli = path.resolve('src/cli.mjs');

function doctor(target, env = {}) {
  const result = spawnSync(process.execPath, [cli, 'doctor', '--target', target], {
    encoding: 'utf8', env: { ...process.env, CLAUDE_CONFIG_DIR: mkdtempSync(path.join(tmpdir(), 'engineering-os-doctor-home-')), ...env }
  });
  return { status: result.status, report: JSON.parse(result.stdout) };
}

function repo() {
  const root = mkdtempSync(path.join(tmpdir(), 'engineering-os-doctor-'));
  execFileSync('git', ['init', '-q', root]);
  execFileSync('git', ['-C', root, 'config', 'user.name', 'Test User']);
  execFileSync('git', ['-C', root, 'config', 'user.email', 'test@example.com']);
  return root;
}

const find = (report, name, area = 'project') => report.checks.find((item) => item.name === name && (item.area === area || area === 'any'));

test('doctor suggests setup in a repo without Engineering OS', () => {
  const { status, report } = doctor(repo());
  assert.equal(status, 0);
  assert.equal(find(report, 'installed').status, 'warn');
  assert.match(find(report, 'installed').fix, /init-project --target \./);
  assert.equal(find(report, 'node', 'environment').status, 'ok');
});

test('doctor reports a freshly installed project as healthy with no warnings', () => {
  const root = repo();
  execFileSync(process.execPath, [cli, 'init-project', '--target', root]);
  const { status, report } = doctor(root);
  assert.equal(status, 0);
  assert.equal(report.healthy, true);
  assert.equal(report.summary.warn, 0);
  assert.equal(report.summary.fail, 0);
});

test('doctor fails on invalid records and warns on missing hooks, with fixes', () => {
  const root = repo();
  execFileSync(process.execPath, [cli, 'init-project', '--target', root]);
  writeFileSync(path.join(root, '.engineering-os', 'tasks', 'TASK-20260930-009.json'), JSON.stringify({ id: 'TASK-20260930-009', type: 'task', status: 'weird' }));
  rmSync(path.join(root, '.engineering-os', 'hooks', 'claude-pre-edit.mjs'));
  const { status, report } = doctor(root);
  assert.equal(status, 1);
  assert.equal(report.healthy, false);
  assert.match(find(report, 'records').detail, /TASK-20260930-009/);
  assert.equal(find(report, 'claude-hooks').status, 'warn');
  assert.match(find(report, 'claude-hooks').fix, /upgrade --target \./);
});

test('doctor flags a stale active task with the release command', () => {
  const root = repo();
  execFileSync(process.execPath, [cli, 'init-project', '--target', root]);
  const task = JSON.parse(execFileSync(process.execPath, [cli, 'start-task', '--target', root, '--title', 'T', '--owner', 'me', '--acceptance', 'ok'], { encoding: 'utf8' }));
  const file = path.join(root, '.engineering-os', 'tasks', `${task.id}.json`);
  writeFileSync(file, JSON.stringify({ ...task, updatedAt: new Date(Date.now() - 48 * 3_600_000).toISOString() }));
  const check = find(doctor(root).report, 'active-task');
  assert.equal(check.status, 'warn');
  assert.match(check.fix, /release-task --task TASK-/);
});

test('doctor checks the global install when present', () => {
  const home = mkdtempSync(path.join(tmpdir(), 'engineering-os-doctor-global-'));
  const claudeDir = path.join(home, '.claude');
  execFileSync(process.execPath, [cli, 'install-global', '--claude-dir', claudeDir]);
  const { report } = doctor(repo(), { CLAUDE_CONFIG_DIR: claudeDir });
  const hooks = report.checks.find((item) => item.area === 'global' && item.name === 'hooks');
  assert.equal(hooks.status, 'ok');
  assert.match(find(report, 'installed').fix, /engineering-os\/kit\/src\/cli\.mjs" init-project/);
});
