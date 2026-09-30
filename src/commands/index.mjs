import { commandBootstrap, commandInitProject, commandInstallGlobal, commandUninstallGlobal, commandUpgrade } from './setup.mjs';
import { commandCheckSafety, commandPreTaskCheck, commandReleaseTask, commandShowTask, commandStartTask, commandUpdateTask, commandVerifyTask } from './tasks.mjs';
import {
  commandEnforceLesson, commandListDecisions, commandListEvidence, commandListHandoffs, commandListIncidents,
  commandListLessons, commandListTasks, commandRecordDecision, commandRecordEvidence, commandRecordIncident
} from './records.mjs';
import { commandAcceptHandoff, commandHandoff, commandShowHandoff } from './handoffs.mjs';
import { commandDoctor } from './doctor.mjs';
import { commandCheckAttribution } from './attribution.mjs';

// Command registry. `help` is generated from this table, so a command added here is documented.
export const commandTable = [
  ['setup', 'bootstrap', commandBootstrap, 'Preview (default) or --apply project setup'],
  ['setup', 'init-project', commandInitProject, 'Install Engineering OS into a project (--replace, --adapter none)'],
  ['setup', 'upgrade', commandUpgrade, 'Refresh kit-owned files in a project from this kit'],
  ['setup', 'install-global', commandInstallGlobal, 'Install into ~/.claude for every session (--replace, --auto-init, --dry-run)'],
  ['setup', 'uninstall-global', commandUninstallGlobal, 'Remove the global install (--dry-run)'],
  ['setup', 'doctor', commandDoctor, 'Check the install and print how to fix problems'],
  ['tasks', 'start-task', commandStartTask, 'Start a task (--title --owner --acceptance "a|b")'],
  ['tasks', 'show-task', commandShowTask, 'Task briefing with handoff, incidents and lessons'],
  ['tasks', 'update-task', commandUpdateTask, 'Set --locations, --evidence or --status'],
  ['tasks', 'verify-task', commandVerifyTask, 'Closure gate; the only way to mark a task complete'],
  ['tasks', 'release-task', commandReleaseTask, 'Free an abandoned task (--task --owner --reason)'],
  ['tasks', 'pre-task-check', commandPreTaskCheck, 'Gate run before edits (--allow-no-active-task in CI)'],
  ['tasks', 'check-project-safety', commandCheckSafety, 'Validate every recorded path:line'],
  ['tasks', 'check-attribution', commandCheckAttribution, 'Fail on AI attribution in commits (--range, --max-count, --text)'],
  ['records', 'record-evidence', commandRecordEvidence, 'Record command proof (--command --exit-code --summary --owner)'],
  ['records', 'record-incident', commandRecordIncident, 'Record a failure plus its draft lesson'],
  ['records', 'enforce-lesson', commandEnforceLesson, 'Enforce a lesson with a prevention location and evidence'],
  ['records', 'record-decision', commandRecordDecision, 'Record an architecture decision'],
  ['records', 'list-tasks', commandListTasks, 'List tasks (--status)'],
  ['records', 'list-incidents', commandListIncidents, 'List incidents (--status)'],
  ['records', 'list-lessons', commandListLessons, 'List lessons (--status)'],
  ['records', 'list-handoffs', commandListHandoffs, 'List handoffs'],
  ['records', 'list-decisions', commandListDecisions, 'List decisions'],
  ['records', 'list-evidence', commandListEvidence, 'List evidence'],
  ['handoffs', 'handoff', commandHandoff, 'Hand a task to another owner (--task --from --to --locations --next-action)'],
  ['handoffs', 'accept-handoff', commandAcceptHandoff, 'Take ownership of a handed-off task'],
  ['handoffs', 'show-handoff', commandShowHandoff, 'Show a handoff (--handoff or --task)']
];

export const commands = Object.fromEntries(commandTable.map(([, name, handler]) => [name, handler]));

export function helpText() {
  const width = Math.max(...commandTable.map(([, name]) => name.length));
  const lines = ['Engineering OS commands', '', 'Usage: node scripts/engineering-os.mjs <command> [--options]', ''];
  let group = null;
  for (const [section, name, , description] of commandTable) {
    if (section !== group) { if (group) lines.push(''); lines.push(`${section}:`); group = section; }
    lines.push(`  ${name.padEnd(width)}  ${description}`);
  }
  return `${lines.join('\n')}\n`;
}
