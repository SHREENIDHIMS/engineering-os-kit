import { readRecord, writeRecord } from '../core/storage.mjs';
import { validateHandoff } from '../core/validate.mjs';
import { parseList, parseLocations } from '../core/parse-locations.mjs';
import { buildTaskBriefing, createRecord, latestHandoff, print, requireOption, syncIndex, targetRoot, validateLocations } from './shared.mjs';

// Ownership transfer between agents: handoff, accept-handoff, show-handoff.

export function commandHandoff(args) {
  const root = targetRoot(args);
  const task = readRecord(root, 'tasks', requireOption(args, 'task'));
  const locations = parseLocations(requireOption(args, 'locations'));
  validateLocations(root, locations);
  const record = createRecord(root, 'handoffs', 'HOF', {
    type: 'handoff', taskId: task.id, fromOwner: requireOption(args, 'from'), toOwner: requireOption(args, 'to'),
    changedLocations: locations, nextAction: requireOption(args, 'next-action'),
    evidenceIds: args.evidence ? parseList(args.evidence) : []
  });
  const validation = validateHandoff(root, record, new Set([task.id]));
  if (!validation.valid) throw new Error(validation.errors.join(' '));
  task.status = 'handoff';
  task.changedLocations = [...new Set([...(task.changedLocations ?? []), ...locations])];
  writeRecord(root, 'tasks', task);
  syncIndex(root);
  print(record);
}

export function commandAcceptHandoff(args) {
  const root = targetRoot(args);
  const handoff = readRecord(root, 'handoffs', requireOption(args, 'handoff'));
  const task = readRecord(root, 'tasks', handoff.taskId);
  if (task.status !== 'handoff') throw new Error(`Task ${task.id} is not awaiting handoff acceptance (status: ${task.status}).`);
  task.status = 'active';
  task.owner = requireOption(args, 'owner');
  writeRecord(root, 'tasks', task);
  syncIndex(root);
  print(buildTaskBriefing(root, task));
}

export function commandShowHandoff(args) {
  const root = targetRoot(args);
  let handoff;
  if (args.handoff) handoff = readRecord(root, 'handoffs', requireOption(args, 'handoff'));
  else if (args.task) handoff = latestHandoff(root, requireOption(args, 'task'));
  else throw new Error('Provide --handoff or --task for latest handoff.');
  if (!handoff) throw new Error('No handoff record found.');
  const task = readRecord(root, 'tasks', handoff.taskId);
  print({ handoff, task: { id: task.id, status: task.status, owner: task.owner, changedLocations: task.changedLocations } });
}
