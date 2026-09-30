import { initializeStore, listRecords, nextSequence, readRecord, writeRecord } from '../core/storage.mjs';
import { validateLocation } from '../core/project-root.mjs';
import { dateStamp, makeId } from '../core/ids.mjs';
import { validateLesson } from '../core/validate.mjs';
import { parseList, parseLocations } from '../core/parse-locations.mjs';
import { createRecord, evidenceMap, print, requireOption, syncIndex, targetRoot, validateLocations } from './shared.mjs';

// Evidence, incidents, lessons and decisions, plus the list-* queries.

const severityValues = new Set(['low', 'medium', 'high', 'critical']);

export function commandRecordEvidence(args) {
  const root = targetRoot(args);
  initializeStore(root, { write: true });
  const record = createRecord(root, 'evidence', 'EVD', {
    type: 'evidence', command: requireOption(args, 'command'), exitCode: Number(args['exit-code'] ?? 0),
    summary: requireOption(args, 'summary'), recordedBy: requireOption(args, 'owner')
  });
  print(record);
}

export function commandRecordIncident(args) {
  const root = targetRoot(args);
  initializeStore(root, { write: true });
  const task = readRecord(root, 'tasks', requireOption(args, 'task'));
  const severity = requireOption(args, 'severity');
  if (!severityValues.has(severity)) throw new Error(`Invalid severity: ${severity}`);
  const enforcementLocation = requireOption(args, 'enforcement-location');
  validateLocation(root, enforcementLocation);
  const locations = args.locations ? parseLocations(args.locations) : [enforcementLocation];
  validateLocations(root, locations);
  const stamp = dateStamp();
  const incidentId = makeId('INC', nextSequence(root, 'incidents', 'INC', stamp));
  const lessonId = makeId('LES', nextSequence(root, 'lessons', 'LES', stamp));
  const createdAt = new Date().toISOString();
  const lesson = {
    id: lessonId, type: 'lesson', status: 'draft', incidentId, createdAt,
    preventionType: requireOption(args, 'prevention-type'),
    rule: args.rule ?? requireOption(args, 'root-cause'),
    enforcementLocation, validationEvidenceIds: []
  };
  const incident = {
    id: incidentId, type: 'incident', status: 'open', taskId: task.id, severity, createdAt,
    category: args.category ?? 'bug', rootCause: requireOption(args, 'root-cause'),
    reproduction: requireOption(args, 'reproduction'), locations, lessonId
  };
  writeRecord(root, 'lessons', lesson);
  writeRecord(root, 'incidents', incident);
  task.incidents.push({ id: incident.id, lessonId: lesson.id });
  writeRecord(root, 'tasks', task);
  syncIndex(root);
  print({ incident, lesson });
}

export function commandEnforceLesson(args) {
  const root = targetRoot(args);
  const lesson = readRecord(root, 'lessons', requireOption(args, 'lesson'));
  lesson.enforcementLocation = requireOption(args, 'enforcement-location');
  lesson.validationEvidenceIds = parseList(args.evidence);
  if (args.rule) lesson.rule = args.rule;
  lesson.status = 'enforced';
  const validation = validateLesson(root, lesson, evidenceMap(root));
  if (!validation.valid) throw new Error(validation.errors.join(' '));
  writeRecord(root, 'lessons', lesson);
  syncIndex(root);
  print(lesson);
}

export function commandRecordDecision(args) {
  const root = targetRoot(args);
  initializeStore(root, { write: true });
  const locations = args.locations ? parseLocations(args.locations) : [];
  validateLocations(root, locations);
  const taskId = args.task ?? null;
  if (taskId) readRecord(root, 'tasks', taskId);
  const record = createRecord(root, 'decisions', 'DEC', {
    type: 'decision', ...(taskId ? { taskId } : {}), title: requireOption(args, 'title'), decision: requireOption(args, 'decision'),
    alternatives: args.alternatives ? parseList(args.alternatives) : [],
    rationale: requireOption(args, 'rationale'), owner: requireOption(args, 'owner'), locations
  });
  print(record);
}

export function commandListIncidents(args) {
  const root = targetRoot(args);
  const status = args.status ?? null;
  let incidents = listRecords(root, 'incidents');
  if (status) incidents = incidents.filter((item) => item.status === status);
  print({ count: incidents.length, incidents });
}

export function commandListLessons(args) {
  const root = targetRoot(args);
  const status = args.status ?? null;
  let lessons = listRecords(root, 'lessons');
  if (status) lessons = lessons.filter((item) => item.status === status);
  print({ count: lessons.length, lessons });
}

export function commandListRecords(kind, args) {
  const root = targetRoot(args);
  const status = args.status ?? null;
  let records = listRecords(root, kind);
  if (status) records = records.filter((item) => item.status === status);
  print({ count: records.length, [kind]: records });
}

export function commandListTasks(args) { commandListRecords('tasks', args); }

export function commandListHandoffs(args) { commandListRecords('handoffs', args); }

export function commandListDecisions(args) { commandListRecords('decisions', args); }

export function commandListEvidence(args) { commandListRecords('evidence', args); }
