#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolveGitRoot, validateLocation } from './core/project-root.mjs';
import { dateStamp, makeId } from './core/ids.mjs';
import { initializeStore, listRecords, nextSequence, readRecord, writeProjectFile, writeRecord } from './core/storage.mjs';
import { lessonsTemplate, mistakesTemplate, projectIndexTemplate, renderTemplate } from './core/project-templates.mjs';
import { validateHandoff, validateLesson, validateTask } from './core/validate.mjs';
import { syncProjectIndex } from './core/sync-index.mjs';
import { installAdapter } from './core/adapter-install.mjs';
import { parseList, parseLocations } from './core/parse-locations.mjs';

const managedHeader = '<!-- engineering-os:managed:start -->';
const managedFooter = '<!-- engineering-os:managed:end -->';
const managedContract = `${managedHeader}\n## Engineering OS\n\nAll commands run from this project root via \`node scripts/engineering-os.mjs <command>\` (auto-targets this repo). Read \`.engineering-os/LESSONS_LEARNED.md\` before pickup. Record source references as repository-relative \`path:line\`. Record qualifying failures with \`record-incident\`; close them only with an enforced linked lesson. Use \`handoff\` before transferring work; the next owner runs \`accept-handoff\`. Run \`verify-task\` before completion.\n${managedFooter}\n`;

const severityValues = new Set(['low', 'medium', 'high', 'critical']);

function parseArguments(values) {
  const result = { _: [] };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith('--')) result._.push(value);
    else if (value === '--apply' || value === '--allow-no-active-task') {
      result[value.slice(2)] = true;
    }
    else {
      const key = value.slice(2);
      const next = values[index + 1];
      if (!next || next.startsWith('--')) throw new Error(`Missing value for ${value}`);
      result[key] = next;
      index += 1;
    }
  }
  return result;
}

function requireOption(args, option) {
  if (!args[option]) throw new Error(`--${option} is required.`);
  return args[option];
}

function targetRoot(args) {
  return resolveGitRoot(path.resolve(args.target ?? process.cwd()));
}

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function kitVersion() {
  return JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
}

function ensureManagedAgents(root, apply) {
  const agentsPath = path.join(root, 'AGENTS.md');
  const current = existsSync(agentsPath) ? readFileSync(agentsPath, 'utf8') : '';
  if (current.includes(managedHeader)) return { status: 'present', path: agentsPath };
  if (!apply) return { status: 'would-add', path: agentsPath };
  const separator = current.length > 0 && !current.endsWith('\n') ? '\n\n' : '\n';
  writeFileSync(agentsPath, `${current}${separator}${managedContract}`, 'utf8');
  return { status: 'added', path: agentsPath };
}

function validateLocations(root, locations) {
  for (const location of locations) validateLocation(root, location);
}

function createRecord(root, kind, prefix, payload) {
  const stamp = dateStamp();
  const id = makeId(prefix, nextSequence(root, kind, prefix, stamp));
  const record = { id, ...payload, createdAt: new Date().toISOString() };
  writeRecord(root, kind, record);
  return record;
}

function evidenceMap(root) {
  return new Map(listRecords(root, 'evidence').map((record) => [record.id, record]));
}

function lessonsMap(root) {
  return new Map(listRecords(root, 'lessons').map((lesson) => [lesson.id, lesson]));
}

function syncIndex(root) {
  if (!existsSync(path.join(root, '.engineering-os'))) return null;
  return syncProjectIndex(root);
}

function initializeProjectFiles(root, apply) {
  const initializedAt = new Date().toISOString();
  const version = kitVersion();
  const values = { initializedAt, kitVersion: version };
  const result = {
    index: writeProjectFile(root, 'INDEX.md', renderTemplate(projectIndexTemplate, values), { write: apply }),
    mistakes: writeProjectFile(root, 'MISTAKES.md', mistakesTemplate, { write: apply }),
    lessons: writeProjectFile(root, 'LESSONS_LEARNED.md', lessonsTemplate, { write: apply }),
    state: writeProjectFile(root, 'state/project.json', `${JSON.stringify({ initializedAt, kitVersion: version }, null, 2)}\n`, { write: apply })
  };
  if (apply) syncIndex(root);
  return result;
}

function latestHandoff(root, taskId) {
  return listRecords(root, 'handoffs')
    .filter((handoff) => handoff.taskId === taskId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
}

function buildTaskBriefing(root, task) {
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

function commandBootstrap(args) {
  const root = targetRoot(args);
  const apply = Boolean(args.apply);
  const missing = initializeStore(root, { write: apply });
  const agents = ensureManagedAgents(root, apply);
  const projectFiles = initializeProjectFiles(root, apply);
  const adapter = installAdapter(root, args.adapter ?? 'none', { write: apply, version: kitVersion(), installedFrom: kitRootPath() });
  print({ root, mode: apply ? 'applied' : 'dry-run', missingDirectories: missing, agents, projectFiles, adapter });
}

function kitRootPath() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

function commandStartTask(args) {
  const root = targetRoot(args);
  initializeStore(root, { write: true });
  const acceptanceCriteria = (args.acceptance ?? '').split('|').map((value) => value.trim()).filter(Boolean);
  if (acceptanceCriteria.length === 0) throw new Error('--acceptance is required with at least one criterion.');
  const active = listRecords(root, 'tasks').find((task) => task.status === 'active');
  if (active) throw new Error(`Active task lock exists: ${active.id} owned by ${active.owner}. Create a handoff or close it first.`);
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

function commandRecordEvidence(args) {
  const root = targetRoot(args);
  initializeStore(root, { write: true });
  const record = createRecord(root, 'evidence', 'EVD', {
    type: 'evidence', command: requireOption(args, 'command'), exitCode: Number(args['exit-code'] ?? 0),
    summary: requireOption(args, 'summary'), recordedBy: requireOption(args, 'owner')
  });
  print(record);
}

function commandRecordIncident(args) {
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

function commandEnforceLesson(args) {
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

function commandUpdateTask(args) {
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

function commandHandoff(args) {
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

function commandAcceptHandoff(args) {
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

function commandShowTask(args) {
  const root = targetRoot(args);
  const task = readRecord(root, 'tasks', requireOption(args, 'task'));
  print(buildTaskBriefing(root, task));
}

function commandVerifyTask(args) {
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

function commandCheckSafety(args) {
  const root = targetRoot(args);
  const invalidLocations = collectSafetyErrors(root);
  print({ root, valid: invalidLocations.length === 0, invalidLocations });
  if (invalidLocations.length > 0) process.exitCode = 1;
}

function commandShowHandoff(args) {
  const root = targetRoot(args);
  let handoff;
  if (args.handoff) handoff = readRecord(root, 'handoffs', requireOption(args, 'handoff'));
  else if (args.task) handoff = latestHandoff(root, requireOption(args, 'task'));
  else throw new Error('Provide --handoff or --task for latest handoff.');
  if (!handoff) throw new Error('No handoff record found.');
  const task = readRecord(root, 'tasks', handoff.taskId);
  print({ handoff, task: { id: task.id, status: task.status, owner: task.owner, changedLocations: task.changedLocations } });
}

function commandRecordDecision(args) {
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

function commandListIncidents(args) {
  const root = targetRoot(args);
  const status = args.status ?? null;
  let incidents = listRecords(root, 'incidents');
  if (status) incidents = incidents.filter((item) => item.status === status);
  print({ count: incidents.length, incidents });
}

function commandListLessons(args) {
  const root = targetRoot(args);
  const status = args.status ?? null;
  let lessons = listRecords(root, 'lessons');
  if (status) lessons = lessons.filter((item) => item.status === status);
  print({ count: lessons.length, lessons });
}

function commandListRecords(kind, args) {
  const root = targetRoot(args);
  const status = args.status ?? null;
  let records = listRecords(root, kind);
  if (status) records = records.filter((item) => item.status === status);
  print({ count: records.length, [kind]: records });
}

function commandListTasks(args) { commandListRecords('tasks', args); }
function commandListHandoffs(args) { commandListRecords('handoffs', args); }
function commandListDecisions(args) { commandListRecords('decisions', args); }
function commandListEvidence(args) { commandListRecords('evidence', args); }

function commandInitProject(args) {
  commandBootstrap({ ...args, apply: true, adapter: args.adapter ?? 'claude' });
}

function collectSafetyErrors(root) {
  const invalidLocations = [];
  for (const kind of ['tasks', 'lessons', 'handoffs']) for (const record of listRecords(root, kind)) {
    for (const location of record.changedLocations ?? [record.enforcementLocation].filter(Boolean)) {
      try { validateLocation(root, location); } catch (error) { invalidLocations.push({ record: record.id, error: error.message }); }
    }
  }
  return invalidLocations;
}

function commandPreTaskCheck(args) {
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
  print({ root, ready: true, activeTask: active?.id ?? null });
}

function help() {
  process.stdout.write('Engineering OS commands: bootstrap, init-project, start-task, show-task, show-handoff, update-task, record-evidence, record-incident, record-decision, enforce-lesson, handoff, accept-handoff, list-incidents, list-lessons, list-tasks, list-handoffs, list-decisions, list-evidence, verify-task, pre-task-check, check-project-safety\n');
}

const [command = 'help', ...values] = process.argv.slice(2);
const commands = {
  bootstrap: commandBootstrap, 'init-project': commandInitProject, 'start-task': commandStartTask,
  'show-task': commandShowTask, 'show-handoff': commandShowHandoff, 'update-task': commandUpdateTask,
  'record-evidence': commandRecordEvidence, 'record-incident': commandRecordIncident, 'record-decision': commandRecordDecision,
  'enforce-lesson': commandEnforceLesson, handoff: commandHandoff, 'accept-handoff': commandAcceptHandoff,
  'list-incidents': commandListIncidents, 'list-lessons': commandListLessons,
  'list-tasks': commandListTasks, 'list-handoffs': commandListHandoffs,
  'list-decisions': commandListDecisions, 'list-evidence': commandListEvidence,
  'verify-task': commandVerifyTask, 'pre-task-check': commandPreTaskCheck, 'check-project-safety': commandCheckSafety, help
};
try {
  const handler = commands[command];
  if (!handler) throw new Error(`Unknown command: ${command}`);
  handler(parseArguments(values));
} catch (error) {
  process.stderr.write(`Engineering OS error: ${error.message}\n`);
  process.exitCode = 1;
}
