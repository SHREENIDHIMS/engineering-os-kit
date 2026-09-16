import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { validateHandoff, validateLesson, validateTask } from '../../src/core/validate.mjs';

function fixtureRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'engineering-os-'));
  execFileSync('git', ['init', '-q', root]);
  writeFileSync(path.join(root, 'app.js'), 'export const safe = true;\n');
  return root;
}

const evidence = new Map([['EVD-1', { id: 'EVD-1' }]]);

test('task closure requires evidence and an enforced prevention lesson', () => {
  const root = fixtureRoot();
  const baseTask = {
    id: 'TASK-20260916-001', title: 'Fix checkout', owner: 'agent-a',
    acceptanceCriteria: ['checkout succeeds'], changedLocations: ['app.js:1'], evidenceIds: ['EVD-1'],
    incidents: [{ id: 'INC-20260916-001', lessonId: 'LES-20260916-001' }]
  };
  const enforced = new Map([['LES-20260916-001', { id: 'LES-20260916-001', status: 'enforced' }]]);
  assert.equal(validateTask(root, baseTask, evidence, enforced).valid, true);
  assert.match(validateTask(root, { ...baseTask, evidenceIds: [] }, evidence, enforced).errors.join('\n'), /evidenceIds/);
  assert.match(validateTask(root, baseTask, evidence, new Map()).errors.join('\n'), /no linked lesson/);
});

test('lesson and handoff reject paths outside the target project', () => {
  const root = fixtureRoot();
  const lesson = {
    id: 'LES-20260916-001', incidentId: 'INC-20260916-001', preventionType: 'test',
    enforcementLocation: '../outside.js:1', validationEvidenceIds: ['EVD-1']
  };
  assert.equal(validateLesson(root, lesson, evidence).valid, false);
  const handoff = {
    taskId: 'TASK-20260916-001', fromOwner: 'agent-a', toOwner: 'agent-b',
    nextAction: 'Run regression test', changedLocations: ['../outside.js:1']
  };
  assert.equal(validateHandoff(root, handoff, new Set(['TASK-20260916-001'])).valid, false);
});

test('task closure requires changedLocations when completing', () => {
  const root = fixtureRoot();
  const task = {
    id: 'TASK-20260916-001', title: 'Validate references', owner: 'agent-a',
    acceptanceCriteria: ['references resolve'], evidenceIds: ['EVD-1'], incidents: [],
    changedLocations: [], status: 'complete'
  };
  assert.match(validateTask(root, task, evidence, new Map(), { requireLocations: true }).errors.join('\n'), /changedLocations/);
});

test('task validation rejects a missing file and a line beyond the file end', () => {
  const root = fixtureRoot();
  const task = {
    id: 'TASK-20260916-001', title: 'Validate references', owner: 'agent-a',
    acceptanceCriteria: ['references resolve'], evidenceIds: ['EVD-1'], incidents: [],
    changedLocations: ['missing.js:1', 'app.js:99']
  };
  const errors = validateTask(root, task, evidence, new Map()).errors.join('\n');
  assert.match(errors, /existing project file/);
  assert.match(errors, /beyond end of file/);
});
