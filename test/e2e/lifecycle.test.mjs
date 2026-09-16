import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const kitCli = path.resolve('src/cli.mjs');

function freshProject() {
  const root = mkdtempSync(path.join(tmpdir(), 'engineering-os-e2e-'));
  execFileSync('git', ['init', '-q', root]);
  execFileSync(process.execPath, [kitCli, 'init-project', '--target', root, '--adapter', 'none']);
  execFileSync(process.execPath, [path.join(root, 'scripts/engineering-os.mjs'), 'start-task', '--title', 'E2E lifecycle', '--owner', 'e2e-agent', '--acceptance', 'full lifecycle passes'], { cwd: root });
  execFileSync(process.execPath, [path.join(root, 'src', 'main.js')], { cwd: root, stdio: 'ignore' }).catch?.();
  return root;
}

function runProject(root, ...args) {
  return execFileSync(process.execPath, [path.join(root, 'scripts/engineering-os.mjs'), ...args], { encoding: 'utf8', cwd: root });
}

test('e2e: full engineering lifecycle via project launcher', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'engineering-os-e2e-'));
  execFileSync('git', ['init', '-q', root]);
  execFileSync('git', ['config', 'user.email', 'e2e@test.local'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'E2E'], { cwd: root });
  execFileSync(process.execPath, [kitCli, 'init-project', '--target', root, '--adapter', 'none']);

  assert.equal(existsSync(path.join(root, 'scripts/engineering-os.mjs')), true);
  assert.equal(existsSync(path.join(root, '.engineering-os', 'policies', 'lifecycle.md')), true);

  const task = JSON.parse(runProject(root, 'start-task', '--title', 'Lifecycle', '--owner', 'builder', '--acceptance', 'verified'));
  runProject(root, 'pre-task-check');

  const evidence = JSON.parse(runProject(root, 'record-evidence', '--owner', 'builder', '--command', 'npm test', '--summary', 'passed'));
  const decision = JSON.parse(runProject(root, 'record-decision', '--task', task.id, '--title', 'Use launcher', '--decision', 'Use scripts/engineering-os.mjs', '--rationale', 'Auto-target project root', '--owner', 'builder', '--locations', 'scripts/engineering-os.mjs:1'));
  assert.match(decision.id, /^DEC-/);

  runProject(root, 'update-task', '--task', task.id, '--locations', 'scripts/engineering-os.mjs:1', '--evidence', evidence.id);

  const pair = JSON.parse(runProject(root, 'record-incident', '--task', task.id, '--severity', 'medium', '--root-cause', 'missing check', '--reproduction', 'skip pre-task', '--prevention-type', 'agent-policy', '--enforcement-location', 'scripts/engineering-os.mjs:1', '--rule', 'Always run pre-task-check'));
  assert.match(readFileSync(path.join(root, '.engineering-os', 'MISTAKES.md'), 'utf8'), /INC-/);

  runProject(root, 'enforce-lesson', '--lesson', pair.lesson.id, '--enforcement-location', 'scripts/engineering-os.mjs:1', '--evidence', evidence.id);
  assert.match(readFileSync(path.join(root, '.engineering-os', 'LESSONS_LEARNED.md'), 'utf8'), /LES-/);

  const lessons = JSON.parse(runProject(root, 'list-lessons', '--status', 'enforced'));
  assert.equal(lessons.count, 1);

  const handoff = JSON.parse(runProject(root, 'handoff', '--task', task.id, '--from', 'builder', '--to', 'reviewer', '--locations', 'scripts/engineering-os.mjs:1', '--next-action', 'verify-task'));
  const shown = JSON.parse(runProject(root, 'show-handoff', '--handoff', handoff.id));
  assert.equal(shown.handoff.toOwner, 'reviewer');

  const briefing = JSON.parse(runProject(root, 'accept-handoff', '--handoff', handoff.id, '--owner', 'reviewer'));
  assert.equal(briefing.task.owner, 'reviewer');

  const verification = JSON.parse(runProject(root, 'verify-task', '--task', task.id));
  assert.equal(verification.valid, true);
  assert.match(readFileSync(path.join(root, '.engineering-os', 'INDEX.md'), 'utf8'), /Lifecycle/);
});
