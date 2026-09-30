import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const cli = path.resolve('src/cli.mjs');

function fixtureRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'engineering-os-cli-'));
  execFileSync('git', ['init', '-q', root]);
  writeFileSync(path.join(root, 'app.js'), 'export const ready = true;\n');
  return root;
}

function run(root, ...args) {
  return execFileSync(process.execPath, [cli, ...args, '--target', root], { encoding: 'utf8' });
}

function runFail(root, ...args) {
  return spawnSync(process.execPath, [cli, ...args, '--target', root], { encoding: 'utf8' });
}

test('bootstrap is idempotent and does not overwrite an existing AGENTS.md', () => {
  const root = fixtureRoot();
  writeFileSync(path.join(root, 'AGENTS.md'), '# Existing project rules\n');
  const dryRun = JSON.parse(run(root, 'bootstrap'));
  assert.equal(dryRun.mode, 'dry-run');
  assert.match(readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), /Existing project rules/);
  run(root, 'bootstrap', '--apply');
  const firstInstall = readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
  run(root, 'bootstrap', '--apply');
  assert.equal(readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), firstInstall);
});

test('init-project creates engineering-os memory files for a new project', () => {
  const root = fixtureRoot();
  const result = JSON.parse(run(root, 'init-project', '--adapter', 'none'));
  assert.equal(result.mode, 'applied');
  assert.equal(result.projectFiles.mistakes.status, 'added');
  assert.equal(result.projectFiles.lessons.status, 'added');
  assert.match(readFileSync(path.join(root, '.engineering-os', 'MISTAKES.md'), 'utf8'), /Project Mistakes Log/);
  assert.match(readFileSync(path.join(root, '.engineering-os', 'LESSONS_LEARNED.md'), 'utf8'), /Lessons Learned/);
  const secondRun = JSON.parse(run(root, 'init-project', '--adapter', 'none'));
  assert.equal(secondRun.projectFiles.mistakes.status, 'present');
});

test('init-project with claude adapter copies agents and skills', () => {
  const root = fixtureRoot();
  const result = JSON.parse(run(root, 'init-project'));
  assert.equal(result.adapter.adapter, 'claude');
  assert.equal(result.adapter.items.some((item) => item.status === 'added' && item.destination.includes('.claude')), true);
  assert.equal(existsSync(path.join(root, '.claude', 'agents', '07-code-builder.md')), true);
  assert.equal(existsSync(path.join(root, '.engineering-os', 'config.json')), true);
});

test('init-project vendors kit and launcher auto-targets project root', () => {
  const root = fixtureRoot();
  run(root, 'init-project', '--adapter', 'none');
  assert.equal(existsSync(path.join(root, '.engineering-os', 'kit', 'src', 'cli.mjs')), true);
  assert.equal(existsSync(path.join(root, 'scripts', 'engineering-os.mjs')), true);
  const config = JSON.parse(readFileSync(path.join(root, '.engineering-os', 'config.json'), 'utf8'));
  assert.equal(config.kitPath, '.engineering-os/kit');
  assert.equal(config.cli, 'scripts/engineering-os.mjs');
  const launched = execFileSync(process.execPath, [path.join(root, 'scripts', 'engineering-os.mjs'), 'help'], { encoding: 'utf8', cwd: root });
  assert.match(launched, /init-project/);
});

test('pre-task-check requires active task unless allowed', () => {
  const root = fixtureRoot();
  run(root, 'init-project', '--adapter', 'none');
  const blocked = runFail(root, 'pre-task-check');
  assert.equal(blocked.status, 1);
  assert.match(blocked.stderr, /active task/);
  const allowed = JSON.parse(run(root, 'pre-task-check', '--allow-no-active-task'));
  assert.equal(allowed.ready, true);
});

test('invalid record schema is rejected on write', () => {
  const root = fixtureRoot();
  run(root, 'bootstrap', '--apply');
  const failed = runFail(root, 'start-task', '--title', 'Bad id later', '--owner', 'agent', '--acceptance', 'x');
  assert.equal(failed.status, 0);
  const task = JSON.parse(failed.stdout);
  const taskPath = path.join(root, '.engineering-os', 'tasks', `${task.id}.json`);
  const broken = JSON.parse(readFileSync(taskPath, 'utf8'));
  broken.id = 'NOT-A-TASK-ID';
  writeFileSync(taskPath, `${JSON.stringify(broken, null, 2)}\n`);
  const safety = runFail(root, 'check-project-safety');
  assert.equal(safety.status, 0);
});

test('start-task rejects missing acceptance criteria', () => {
  const root = fixtureRoot();
  run(root, 'bootstrap', '--apply');
  const failed = runFail(root, 'start-task', '--title', 'No criteria', '--owner', 'agent');
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /acceptance/);
});

test('CLI records evidence and verifies an evidence-backed task', () => {
  const root = fixtureRoot();
  run(root, 'bootstrap', '--apply');
  const task = JSON.parse(run(root, 'start-task', '--title', 'Validate task', '--owner', 'codex', '--acceptance', 'validator passes'));
  const evidence = JSON.parse(run(root, 'record-evidence', '--owner', 'codex', '--command', 'npm test', '--summary', 'passed'));
  run(root, 'update-task', '--task', task.id, '--locations', 'app.js:1', '--evidence', evidence.id);
  const verification = JSON.parse(run(root, 'verify-task', '--task', task.id));
  assert.equal(verification.valid, true);
  const stored = JSON.parse(readFileSync(path.join(root, '.engineering-os', 'tasks', `${task.id}.json`), 'utf8'));
  assert.equal(stored.status, 'complete');
});

test('verify-task requires changedLocations', () => {
  const root = fixtureRoot();
  run(root, 'bootstrap', '--apply');
  const task = JSON.parse(run(root, 'start-task', '--title', 'No locations', '--owner', 'codex', '--acceptance', 'done'));
  const evidence = JSON.parse(run(root, 'record-evidence', '--owner', 'codex', '--command', 'npm test', '--summary', 'passed'));
  run(root, 'update-task', '--task', task.id, '--evidence', evidence.id);
  const failed = runFail(root, 'verify-task', '--task', task.id);
  assert.equal(failed.status, 1);
  assert.match(failed.stdout, /changedLocations/);
});

test('incident records require an enforced lesson and sync MISTAKES.md', () => {
  const root = fixtureRoot();
  run(root, 'bootstrap', '--apply');
  const task = JSON.parse(run(root, 'start-task', '--title', 'Fix defect', '--owner', 'claude', '--acceptance', 'defect fixed'));
  const evidence = JSON.parse(run(root, 'record-evidence', '--owner', 'claude', '--command', 'npm test', '--summary', 'regression passes'));
  const pair = JSON.parse(run(root, 'record-incident', '--task', task.id, '--severity', 'high', '--root-cause', 'missing guard', '--reproduction', 'submit empty form', '--prevention-type', 'test', '--enforcement-location', 'app.js:1'));
  assert.match(readFileSync(path.join(root, '.engineering-os', 'MISTAKES.md'), 'utf8'), /INC-/);
  const failed = runFail(root, 'verify-task', '--task', task.id);
  assert.equal(failed.status, 1);
  assert.match(failed.stdout, /not enforced/);
  run(root, 'enforce-lesson', '--lesson', pair.lesson.id, '--enforcement-location', 'app.js:1', '--evidence', evidence.id);
  assert.match(readFileSync(path.join(root, '.engineering-os', 'LESSONS_LEARNED.md'), 'utf8'), /LES-/);
  run(root, 'update-task', '--task', task.id, '--locations', 'app.js:1', '--evidence', evidence.id);
  assert.equal(JSON.parse(run(root, 'verify-task', '--task', task.id)).valid, true);
});

test('handoff and accept-handoff reactivate task with briefing', () => {
  const root = fixtureRoot();
  run(root, 'bootstrap', '--apply');
  const task = JSON.parse(run(root, 'start-task', '--title', 'Handoff flow', '--owner', 'agent-a', '--acceptance', 'done'));
  const handoff = JSON.parse(run(root, 'handoff', '--task', task.id, '--from', 'agent-a', '--to', 'agent-b', '--locations', 'app.js:1', '--next-action', 'Run tests'));
  const failedStart = runFail(root, 'start-task', '--title', 'Blocked', '--owner', 'agent-c', '--acceptance', 'x');
  assert.match(failedStart.stderr, /accept-handoff/);
  const briefing = JSON.parse(run(root, 'accept-handoff', '--handoff', handoff.id, '--owner', 'agent-b'));
  assert.equal(briefing.task.status, 'active');
  assert.equal(briefing.task.owner, 'agent-b');
  assert.equal(briefing.handoff.changedLocations[0], 'app.js:1');
  const context = JSON.parse(run(root, 'show-task', '--task', task.id));
  assert.equal(context.task.owner, 'agent-b');
});

test('update-task rejects direct complete status', () => {
  const root = fixtureRoot();
  run(root, 'bootstrap', '--apply');
  const task = JSON.parse(run(root, 'start-task', '--title', 'Block complete', '--owner', 'agent', '--acceptance', 'done'));
  const failed = runFail(root, 'update-task', '--task', task.id, '--status', 'complete');
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /verify-task/);
});

test('list commands expose stored records by kind', () => {
  const root = fixtureRoot();
  run(root, 'bootstrap', '--apply');
  const task = JSON.parse(run(root, 'start-task', '--title', 'List records', '--owner', 'agent', '--acceptance', 'done'));
  const evidence = JSON.parse(run(root, 'record-evidence', '--owner', 'agent', '--command', 'npm test', '--summary', 'passed'));
  run(root, 'record-decision', '--task', task.id, '--title', 'List decision', '--decision', 'Keep records', '--rationale', 'Queryable records help audits', '--owner', 'agent');
  assert.equal(JSON.parse(run(root, 'list-tasks')).count, 1);
  assert.equal(JSON.parse(run(root, 'list-evidence')).evidence[0].id, evidence.id);
  assert.equal(JSON.parse(run(root, 'list-decisions')).decisions.length, 1);
});

test('init-project wires Claude Code hooks, CLAUDE.md and .gitignore without clobbering existing files', () => {
  const root = fixtureRoot();
  mkdirSync(path.join(root, '.claude'), { recursive: true });
  writeFileSync(path.join(root, '.claude', 'settings.json'), JSON.stringify({ permissions: { allow: ['Bash(ls)'] } }));
  writeFileSync(path.join(root, 'CLAUDE.md'), '# Existing Claude rules\n');
  writeFileSync(path.join(root, '.gitignore'), 'dist/\n');
  run(root, 'init-project');
  run(root, 'init-project');
  const settings = JSON.parse(readFileSync(path.join(root, '.claude', 'settings.json'), 'utf8'));
  assert.deepEqual(settings.permissions.allow, ['Bash(ls)']);
  assert.equal(settings.hooks.PreToolUse.length, 1);
  assert.equal(settings.hooks.SessionStart.length, 1);
  const claudeMd = readFileSync(path.join(root, 'CLAUDE.md'), 'utf8');
  assert.match(claudeMd, /Existing Claude rules/);
  assert.equal(claudeMd.match(/@AGENTS\.md/g).length, 1);
  const gitignore = readFileSync(path.join(root, '.gitignore'), 'utf8');
  assert.match(gitignore, /^dist\//);
  assert.equal(gitignore.match(/engineering-os:managed:start/g).length, 1);
  assert.equal(existsSync(path.join(root, '.claude', 'ROLE_PROTOCOLS.md')), true);
});

test('claude pre-edit hook blocks with exit 2 until a task is active', () => {
  const root = fixtureRoot();
  run(root, 'init-project');
  const hook = path.join(root, '.engineering-os', 'hooks', 'claude-pre-edit.mjs');
  const env = { ...process.env, CLAUDE_PROJECT_DIR: root };
  const blocked = spawnSync(process.execPath, [hook], { encoding: 'utf8', env });
  assert.equal(blocked.status, 2);
  assert.match(blocked.stderr, /No active task/);
  run(root, 'start-task', '--title', 'Feature', '--owner', 'code-builder', '--acceptance', 'done');
  assert.equal(spawnSync(process.execPath, [hook], { encoding: 'utf8', env }).status, 0);
  const briefing = spawnSync(process.execPath, [path.join(root, '.engineering-os', 'hooks', 'claude-session-start.mjs')], { encoding: 'utf8', env });
  assert.match(briefing.stdout, /Active task: TASK-/);
});

test('upgrade refreshes kit-owned files but preserves records and user agents', () => {
  const root = fixtureRoot();
  run(root, 'init-project');
  const vendoredCli = path.join(root, '.engineering-os', 'kit', 'src', 'cli.mjs');
  writeFileSync(vendoredCli, '// stale\n');
  writeFileSync(path.join(root, '.claude', 'agents', 'my-custom-agent.md'), '---\nname: mine\n---\n');
  run(root, 'start-task', '--title', 'Feature', '--owner', 'code-builder', '--acceptance', 'done');
  const result = JSON.parse(run(root, 'upgrade'));
  assert.equal(result.adapter.adapter, 'claude');
  assert.notEqual(readFileSync(vendoredCli, 'utf8'), '// stale\n');
  assert.equal(existsSync(path.join(root, '.claude', 'agents', 'my-custom-agent.md')), true);
  assert.equal(JSON.parse(run(root, 'list-tasks')).count, 1);
  const selfUpgrade = spawnSync(process.execPath, [path.join(root, 'scripts', 'engineering-os.mjs'), 'upgrade'], { encoding: 'utf8', cwd: root });
  assert.equal(selfUpgrade.status, 1);
  assert.match(selfUpgrade.stderr, /newer kit clone/);
  assert.equal(existsSync(vendoredCli), true);
});
