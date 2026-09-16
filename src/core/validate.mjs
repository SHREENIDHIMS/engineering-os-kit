import { isRecordId } from './ids.mjs';
import { validateLocation } from './project-root.mjs';

const preventionTypes = new Set(['test', 'static-check', 'ci-gate', 'migration-check', 'review-rule', 'agent-policy']);

function requireText(value, field, errors) {
  if (typeof value !== 'string' || value.trim() === '') errors.push(`${field} is required.`);
}

function requireArray(value, field, errors, minItems = 0) {
  if (!Array.isArray(value) || value.length < minItems) errors.push(`${field} requires at least ${minItems} item(s).`);
}

export function validateTask(root, task, evidenceById = new Map(), lessonsById = new Map(), { requireLocations = false } = {}) {
  const errors = [];
  if (!isRecordId(task.id, 'TASK')) errors.push('task id is invalid.');
  requireText(task.title, 'title', errors);
  requireText(task.owner, 'owner', errors);
  requireArray(task.acceptanceCriteria, 'acceptanceCriteria', errors, 1);
  requireArray(task.evidenceIds, 'evidenceIds', errors, 1);
  if (requireLocations || task.status === 'complete') {
    requireArray(task.changedLocations, 'changedLocations', errors, 1);
  }
  for (const evidenceId of task.evidenceIds ?? []) if (!evidenceById.has(evidenceId)) errors.push(`missing evidence: ${evidenceId}`);
  for (const location of task.changedLocations ?? []) {
    try { validateLocation(root, location); } catch (error) { errors.push(error.message); }
  }
  for (const incident of task.incidents ?? []) {
    const lesson = lessonsById.get(incident.lessonId);
    if (!lesson) errors.push(`incident ${incident.id} has no linked lesson.`);
    else if (lesson.status !== 'enforced') errors.push(`lesson ${lesson.id} is not enforced.`);
  }
  return { valid: errors.length === 0, errors };
}

export function validateLesson(root, lesson, evidenceById = new Map()) {
  const errors = [];
  if (!isRecordId(lesson.id, 'LES')) errors.push('lesson id is invalid.');
  if (!isRecordId(lesson.incidentId, 'INC')) errors.push('incidentId is invalid.');
  if (!preventionTypes.has(lesson.preventionType)) errors.push('preventionType is invalid.');
  requireText(lesson.enforcementLocation, 'enforcementLocation', errors);
  if (lesson.enforcementLocation) {
    try { validateLocation(root, lesson.enforcementLocation); } catch (error) { errors.push(error.message); }
  }
  requireArray(lesson.validationEvidenceIds, 'validationEvidenceIds', errors, 1);
  for (const evidenceId of lesson.validationEvidenceIds ?? []) if (!evidenceById.has(evidenceId)) errors.push(`missing evidence: ${evidenceId}`);
  return { valid: errors.length === 0, errors };
}

export function validateHandoff(root, handoff, taskIds = new Set()) {
  const errors = [];
  if (!isRecordId(handoff.taskId, 'TASK') || !taskIds.has(handoff.taskId)) errors.push(`unknown task: ${handoff.taskId}`);
  requireText(handoff.fromOwner, 'fromOwner', errors);
  requireText(handoff.toOwner, 'toOwner', errors);
  requireText(handoff.nextAction, 'nextAction', errors);
  requireArray(handoff.changedLocations, 'changedLocations', errors, 1);
  for (const location of handoff.changedLocations ?? []) {
    try { validateLocation(root, location); } catch (error) { errors.push(error.message); }
  }
  return { valid: errors.length === 0, errors };
}
