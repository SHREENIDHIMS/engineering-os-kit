import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { listRecords, osDirectory } from './storage.mjs';
import { lessonsTemplate, mistakesTemplate, projectIndexTemplate, renderTemplate } from './project-templates.mjs';

function readProjectMeta(root) {
  const statePath = path.join(osDirectory(root), 'state', 'project.json');
  if (!existsSync(statePath)) return { initializedAt: 'unknown', kitVersion: 'unknown' };
  return JSON.parse(readFileSync(statePath, 'utf8'));
}

function formatDate(iso) {
  if (!iso) return '—';
  return iso.slice(0, 10);
}

function buildMistakesMarkdown(root) {
  const incidents = listRecords(root, 'incidents').sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const lines = [mistakesTemplate.trimEnd()];
  for (const incident of incidents) {
    const date = formatDate(incident.createdAt);
    const summary = (incident.rootCause ?? '').slice(0, 80).replace(/\|/g, '/');
    lines.push(`| ${date} | ${incident.id} | ${incident.severity} | ${incident.category ?? '—'} | ${summary} | ${incident.rootCause ?? '—'} | ${(incident.locations ?? []).join(', ') || '—'} | ${incident.lessonId ?? '—'} |`);
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function buildLessonsMarkdown(root) {
  const lessons = listRecords(root, 'lessons').sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const lines = [lessonsTemplate.trimEnd()];
  for (const lesson of lessons) {
    const rule = (lesson.rule ?? lesson.preventionType ?? '').replace(/\|/g, '/');
    lines.push(`| ${lesson.id} | ${rule} | ${lesson.preventionType} | ${lesson.enforcementLocation} | ${lesson.status} |`);
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function buildIndexMarkdown(root) {
  const meta = readProjectMeta(root);
  const tasks = listRecords(root, 'tasks');
  const active = tasks.find((task) => task.status === 'active');
  const handoff = tasks.find((task) => task.status === 'handoff');
  const latestTask = tasks.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
  const handoffs = listRecords(root, 'handoffs').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const latestHandoff = handoffs[0] ?? null;
  let activeTaskLine = 'none';
  if (active) activeTaskLine = `${active.id} (${active.owner})`;
  else if (handoff) activeTaskLine = `${handoff.id} (handoff — run accept-handoff)`;

  const body = renderTemplate(projectIndexTemplate, {
    initializedAt: meta.initializedAt ?? 'unknown',
    kitVersion: meta.kitVersion ?? 'unknown'
  }).replace('| Active task | none |', `| Active task | ${activeTaskLine} |`);

  const extras = [];
  if (latestTask) {
    extras.push('', '## Latest task', `- ID: ${latestTask.id}`, `- Title: ${latestTask.title}`, `- Status: ${latestTask.status}`);
  }
  if (latestHandoff) {
    extras.push('', '## Latest handoff', `- ID: ${latestHandoff.id}`, `- From: ${latestHandoff.fromOwner} → To: ${latestHandoff.toOwner}`, `- Next action: ${latestHandoff.nextAction}`, `- Locations: ${latestHandoff.changedLocations.join(', ')}`);
  }
  return `${body.trimEnd()}${extras.length ? `\n${extras.join('\n')}\n` : '\n'}`;
}

export function syncProjectIndex(root) {
  const indexPath = path.join(osDirectory(root), 'INDEX.md');
  const mistakesPath = path.join(osDirectory(root), 'MISTAKES.md');
  const lessonsPath = path.join(osDirectory(root), 'LESSONS_LEARNED.md');
  writeFileSync(indexPath, buildIndexMarkdown(root), 'utf8');
  writeFileSync(mistakesPath, buildMistakesMarkdown(root), 'utf8');
  writeFileSync(lessonsPath, buildLessonsMarkdown(root), 'utf8');
  return { indexPath, mistakesPath, lessonsPath };
}
