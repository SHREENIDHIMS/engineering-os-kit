import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { resolveGitRoot, validateLocation } from '../core/project-root.mjs';
import { dateStamp, makeId } from '../core/ids.mjs';
import { listRecords, nextSequence, writeRecord } from '../core/storage.mjs';
import { syncProjectIndex } from '../core/sync-index.mjs';
import { kitRoot } from '../core/kit-source.mjs';

// Helpers shared by every command module.

export function requireOption(args, option) {
  if (!args[option]) throw new Error(`--${option} is required.`);
  return args[option];
}

export function targetRoot(args) {
  return resolveGitRoot(path.resolve(args.target ?? process.cwd()));
}

export function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export function validateLocations(root, locations) {
  for (const location of locations) validateLocation(root, location);
}

export function createRecord(root, kind, prefix, payload) {
  const stamp = dateStamp();
  const id = makeId(prefix, nextSequence(root, kind, prefix, stamp));
  const record = { id, ...payload, createdAt: new Date().toISOString() };
  writeRecord(root, kind, record);
  return record;
}

export function evidenceMap(root) {
  return new Map(listRecords(root, 'evidence').map((record) => [record.id, record]));
}

export function lessonsMap(root) {
  return new Map(listRecords(root, 'lessons').map((lesson) => [lesson.id, lesson]));
}

export function syncIndex(root) {
  if (!existsSync(path.join(root, '.engineering-os'))) return null;
  return syncProjectIndex(root);
}

export function latestHandoff(root, taskId) {
  return listRecords(root, 'handoffs')
    .filter((handoff) => handoff.taskId === taskId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
}

export function buildTaskBriefing(root, task) {
  const handoff = latestHandoff(root, task.id);
  const incidents = (task.incidents ?? []).map((entry) => {
    const incident = listRecords(root, 'incidents').find((item) => item.id === entry.id);
    const lesson = lessonsMap(root).get(entry.lessonId);
    return { id: entry.id, severity: incident?.severity, lessonId: entry.lessonId, lessonStatus: lesson?.status };
  });
  return {
    task,
    handoff,
    incidents,
    enforcedLessons: [...lessonsMap(root).values()].filter((lesson) => lesson.status === 'enforced'),
    lessonsFile: path.join('.engineering-os', 'LESSONS_LEARNED.md'),
    mistakesFile: path.join('.engineering-os', 'MISTAKES.md')
  };
}

export function collectSafetyErrors(root) {
  const invalidLocations = [];
  for (const kind of ['tasks', 'lessons', 'handoffs']) for (const record of listRecords(root, kind)) {
    for (const location of record.changedLocations ?? [record.enforcementLocation].filter(Boolean)) {
      try { validateLocation(root, location); } catch (error) { invalidLocations.push({ record: record.id, error: error.message }); }
    }
  }
  return invalidLocations;
}

export function kitVersion() {
  return JSON.parse(readFileSync(path.join(kitRoot, 'package.json'), 'utf8')).version;
}
