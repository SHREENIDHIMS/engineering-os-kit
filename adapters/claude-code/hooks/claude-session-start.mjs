#!/usr/bin/env node
// Claude Code SessionStart hook: prints an Engineering OS briefing that Claude Code adds to context.
// Read-only: never writes records.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = process.env.CLAUDE_PROJECT_DIR ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const osRoot = path.join(projectRoot, '.engineering-os');

function records(kind) {
  const directory = path.join(osRoot, kind);
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((name) => name.endsWith('.json'))
    .map((name) => {
      try { return JSON.parse(readFileSync(path.join(directory, name), 'utf8')); } catch { return null; }
    })
    .filter(Boolean);
}

if (!existsSync(path.join(osRoot, 'config.json'))) process.exit(0);

const tasks = records('tasks');
const active = tasks.find((task) => task.status === 'active');
const handoff = tasks.find((task) => task.status === 'handoff');
const enforced = records('lessons').filter((lesson) => lesson.status === 'enforced');
const openIncidents = records('incidents').filter((incident) => incident.status === 'open');

const lines = ['## Engineering OS briefing'];
if (handoff) lines.push(`- Task ${handoff.id} ("${handoff.title}") awaits handoff acceptance: run \`node scripts/engineering-os.mjs show-handoff --task ${handoff.id}\` then \`accept-handoff\`.`);
if (active) lines.push(`- Active task: ${active.id} "${active.title}" owned by ${active.owner}.`);
if (!active && !handoff) lines.push('- No active task. Edits are blocked until you run `node scripts/engineering-os.mjs start-task --title "..." --owner "..." --acceptance "..."`.');
if (openIncidents.length > 0) lines.push(`- Open incidents: ${openIncidents.map((incident) => incident.id).join(', ')}.`);
if (enforced.length > 0) {
  lines.push('- Enforced lessons (do not repeat):');
  for (const lesson of enforced) lines.push(`  - ${lesson.id}: ${lesson.rule} (${lesson.enforcementLocation})`);
}
lines.push('- Workflow: `AGENT_AMPLIFIER.md`; project contract: `AGENTS.md`; close work only with `verify-task`.');
process.stdout.write(`${lines.join('\n')}\n`);
