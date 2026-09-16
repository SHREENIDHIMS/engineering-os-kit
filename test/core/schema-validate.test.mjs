import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRecordSchema } from '../../src/core/schema-validate.mjs';

test('schema validator accepts a draft lesson without validation evidence', () => {
  const lesson = {
    id: 'LES-20260916-001', type: 'lesson', status: 'draft', incidentId: 'INC-20260916-001',
    preventionType: 'test', enforcementLocation: 'app.js:1', validationEvidenceIds: []
  };
  assert.equal(validateRecordSchema('lessons', lesson).valid, true);
});

test('schema validator rejects an enforced lesson without validation evidence', () => {
  const lesson = {
    id: 'LES-20260916-001', type: 'lesson', status: 'enforced', incidentId: 'INC-20260916-001',
    preventionType: 'test', enforcementLocation: 'app.js:1', validationEvidenceIds: []
  };
  assert.equal(validateRecordSchema('lessons', lesson).valid, false);
});

test('schema validator rejects invalid handoff id pattern', () => {
  const handoff = {
    id: 'HOF-TASK-20260916-001-001', type: 'handoff', taskId: 'TASK-20260916-001',
    fromOwner: 'a', toOwner: 'b', changedLocations: ['app.js:1'], nextAction: 'continue'
  };
  assert.equal(validateRecordSchema('handoffs', handoff).valid, false);
});

test('schema validator rejects invalid property types', () => {
  const decision = {
    id: 'DEC-20260916-001', type: 'decision', title: 'Type check', decision: 'Reject invalid data',
    rationale: 'Schema properties must be typed', owner: 'tester', locations: 'app.js:1'
  };
  assert.equal(validateRecordSchema('decision', decision).valid, false);
});
