import { existsSync } from 'node:fs';
import path from 'node:path';
import { initializeStore, listRecords, readRecord, writeRecord } from '../core/storage.mjs';
import { validateTask } from '../core/validate.mjs';
import { parseList, parseLocations } from '../core/parse-locations.mjs';
import { releaseHint, staleInfo } from '../core/stale.mjs';
import { buildTaskBriefing, collectSafetyErrors, createRecord, evidenceMap, lessonsMap, print, requireOption, syncIndex, targetRoot, validateLocations } from './shared.mjs';

// Task lifecycle: start, update, show, verify, release, and the pre-task / safety gates.

export function commandStartTask(args) {
  const root = targetRoot(args);
  initializeStore(root, { write: true });
  const acceptanceCriteria = (args.acceptance ?? '').split('|').map((value) => value.trim()).filter(Boolean);
  if (acceptanceCriteria.length === 0) throw new Error('--acceptance is required with at least one criterion.');
  const active = listRecords(root, 'tasks').find((task) => task.status === 'active');
  if (active) {
    const { ageHours } = staleInfo(root, active);
    throw new Error(`Active task lock exists: ${active.id} owned by ${active.owner}, last updated ${ageHours ?? '?'}h ago. Create a handoff or close it first. ${releaseHint(active)}`);
  }
  const handoffPending = listRecords(root, 'tasks').find((task) => task.status === 'handoff');
  if (handoffPending) throw new Error(`Task awaiting handoff acceptance: ${handoffPending.id}. Run accept-handoff before starting a new task.`);
  const record = createRecord(root, 'tasks', 'TASK', {
    type: 'task', status: 'active', title: requireOption(args, 'title'), owner: requireOption(args, 'owner'),
    acceptanceCriteria, changedLocations: [], evidenceIds: [], incidents: [],
    branch: args.branch ?? null, startingCommit: args.commit ?? null
  });
  syncIndex(root);
  print(record);
}

export function commandUpdateTask(args) {
  const root = targetRoot(args);
  const task = readRecord(root, 'tasks', requireOption(args, 'task'));
  if (args.status === 'complete') throw new Error('Use verify-task to complete a task; update-task cannot set status complete.');
  if (args.locations) {
    const locations = parseLocations(args.locations);
    validateLocations(root, locations);
    task.changedLocations = locations;
  }
  if (args.evidence) task.evidenceIds = parseList(args.evidence);
  if (args.status) task.status = args.status;
  writeRecord(root, 'tasks', task);
  syncIndex(root);
  print(task);
}

export function commandShowTask(args) {
  const root = targetRoot(args);
  const task = readRecord(root, 'tasks', requireOption(args, 'task'));
  print(buildTaskBriefing(root, task));
}

export function commandVerifyTask(args) {
  const root = targetRoot(args);
  const task = readRecord(root, 'tasks', requireOption(args, 'task'));
  const result = validateTask(root, task, evidenceMap(root), lessonsMap(root), { requireLocations: true });
  print({ taskId: task.id, ...result });
  if (!result.valid) {
    process.exitCode = 1;
    return;
  }
  task.status = 'complete';
  writeRecord(root, 'tasks', task);
  syncIndex(root);
}

export function commandCheckSafety(args) {
  const root = targetRoot(args);
  const invalidLocations = collectSafetyErrors(root);
  print({ root, valid: invalidLocations.length === 0, invalidLocations });
  if (invalidLocations.length > 0) process.exitCode = 1;
}

export function commandPreTaskCheck(args) {
  const root = targetRoot(args);
  if (!existsSync(path.join(root, '.engineering-os', 'config.json'))) {
    throw new Error('Engineering OS not initialized. Run: node scripts/engineering-os.mjs init-project');
  }
  initializeStore(root, { write: false });
  const active = listRecords(root, 'tasks').find((task) => task.status === 'active');
  const handoffPending = listRecords(root, 'tasks').find((task) => task.status === 'handoff');
  if (handoffPending) throw new Error(`Task ${handoffPending.id} awaits accept-handoff before new work.`);
  if (!active && !args['allow-no-active-task']) {
    throw new Error('No active task. Run: node scripts/engineering-os.mjs start-task --title "..." --owner "..." --acceptance "..."');
  }
  const invalidLocations = collectSafetyErrors(root);
  if (invalidLocations.length > 0) {
    print({ root, ready: false, invalidLocations });
    process.exitCode = 1;
    return;
  }
  const stale = active ? staleInfo(root, active) : null;
  const report = { root, ready: true, activeTask: active?.id ?? null };
  if (stale?.stale) report.warning = `Active task ${active.id} has not been updated for ${stale.ageHours}h (threshold ${stale.thresholdHours}h). ${releaseHint(active)}`;
  print(report);
}

const releasableStatuses = new Set(['active', 'blocked', 'handoff']);

export function commandReleaseTask(args) {
  const root = targetRoot(args);
  const task = readRecord(root, 'tasks', requireOption(args, 'task'));
  if (!releasableStatuses.has(task.status)) throw new Error(`Task ${task.id} is ${task.status}; only active, blocked or handoff tasks can be released.`);
  const owner = requireOption(args, 'owner');
  const reason = requireOption(args, 'reason');
  const previous = { status: task.status, owner: task.owner, ageHours: staleInfo(root, task).ageHours };
  const evidence = createRecord(root, 'evidence', 'EVD', {
    type: 'evidence', command: `release-task --task ${task.id}`, exitCode: 0, recordedBy: owner,
    summary: `Released ${previous.status} task ${task.id} (owner ${previous.owner}, idle ${previous.ageHours ?? '?'}h): ${reason}`
  });
  task.status = 'abandoned';
  task.releasedBy = owner;
  task.releaseReason = reason;
  task.releasedAt = new Date().toISOString();
  task.evidenceIds = [...new Set([...(task.evidenceIds ?? []), evidence.id])];
  writeRecord(root, 'tasks', task);
  syncIndex(root);
  print({ task, previous, evidence });
}
