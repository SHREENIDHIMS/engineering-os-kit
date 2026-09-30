import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { kitRoot, kitSource } from './kit-source.mjs';

// Global (user-level) install into the Claude Code config directory, normally ~/.claude.
//
// Owned by Engineering OS and replaced on every install:
//   <claude-dir>/engineering-os/kit/        full offline kit copy (init-project/upgrade run from here)
//   <claude-dir>/engineering-os/hooks/      global SessionStart + PreToolUse hooks
//   <claude-dir>/engineering-os/config.json version, autoInit, installedFrom
//   <claude-dir>/engineering-os/installed-files.json  manifest used by uninstall-global
// Merged, never replaced:
//   <claude-dir>/agents/, skills/, commands/engineering-os/   kit files copied in; other files kept
//   <claude-dir>/settings.json   two hook entries appended; every other setting kept
//   <claude-dir>/CLAUDE.md       one managed section appended
// Never touched: credentials, history, sessions, projects, plugins or any other file.

export const globalHookMarker = 'engineering-os/hooks/global-';
const claudeMdStart = '<!-- engineering-os:global:start -->';
const claudeMdEnd = '<!-- engineering-os:global:end -->';

// What goes into the global kit copy. Tests, docs and git metadata are left out.
const kitCopyEntries = ['package.json', 'LICENSE', 'AGENT_AMPLIFIER.md', 'src', 'core', 'ci', 'adapters', '.claude'];

// The harness folders `--replace` moves to a backup before installing.
const replaceableDirs = ['agents', 'skills', 'commands'];

export function defaultClaudeDir() {
  return process.env.CLAUDE_CONFIG_DIR ?? path.join(os.homedir(), '.claude');
}

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function listFiles(directory, base = directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((name) => {
    const full = path.join(directory, name);
    return statSync(full).isDirectory() ? listFiles(full, base) : [path.relative(base, full)];
  });
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function claudeMdBlock(kitDir) {
  const kit = toPosix(kitDir);
  return `${claudeMdStart}
## Engineering OS (global)

Engineering OS is installed for every project on this machine.

- In a Git repository, the SessionStart briefing says whether the project is set up.
  If it is not, tell the user, then run \`node "${kit}/src/cli.mjs" init-project --target .\`
  from the repository root. After setup, use \`node scripts/engineering-os.mjs <command>\`.
- Once a project is set up, edits are blocked until a task is active: run \`start-task\` first,
  cite changes as \`path:line\`, and close work only with \`verify-task\`.
- Global agents, skills and \`/engineering-os:*\` commands are in this directory. When an agent
  refers to \`.claude/ROLE_PROTOCOLS.md\`, \`AGENT_AMPLIFIER.md\` or \`.claude/agent-shared/\` and the
  project has no copy, read it from \`${kit}/\`.
- A repository containing \`.engineering-os-ignore\` has opted out; do not set it up.
${claudeMdEnd}
`;
}

function hookEntries(hooksDir) {
  const dir = toPosix(hooksDir);
  return {
    SessionStart: [{ hooks: [{ type: 'command', command: `node "${dir}/global-session-start.mjs"` }] }],
    PreToolUse: [{ matcher: 'Edit|Write|MultiEdit|NotebookEdit', hooks: [{ type: 'command', command: `node "${dir}/global-pre-edit.mjs"` }] }]
  };
}

function isOurEntry(entry) {
  return (entry.hooks ?? []).some((hook) => String(hook.command ?? '').includes(globalHookMarker));
}

function readSettings(settingsPath) {
  if (!existsSync(settingsPath)) return {};
  try { return JSON.parse(readFileSync(settingsPath, 'utf8')); }
  catch { throw new Error(`${settingsPath} is not valid JSON; fix it before installing. Nothing was changed.`); }
}

function mergeSettings(settingsPath, hooksDir, apply) {
  const settings = readSettings(settingsPath);
  settings.hooks ??= {};
  for (const [event, entries] of Object.entries(hookEntries(hooksDir))) {
    // Drop any previous Engineering OS entry so a reinstall with a new path does not duplicate it.
    settings.hooks[event] = [...(settings.hooks[event] ?? []).filter((entry) => !isOurEntry(entry)), ...entries];
  }
  if (apply) writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
  return { path: settingsPath, status: apply ? 'merged' : 'would-merge', events: Object.keys(hookEntries(hooksDir)) };
}

function stripManagedBlock(text) {
  const start = text.indexOf(claudeMdStart);
  if (start === -1) return text;
  const end = text.indexOf(claudeMdEnd, start);
  if (end === -1) return text;
  const before = text.slice(0, start).replace(/\n+$/, '');
  const after = text.slice(end + claudeMdEnd.length).replace(/^\n+/, '');
  return [before, after].filter(Boolean).join('\n\n') + (before || after ? '\n' : '');
}

function writeClaudeMd(claudeMdPath, kitDir, apply) {
  const current = existsSync(claudeMdPath) ? readFileSync(claudeMdPath, 'utf8') : '';
  const base = stripManagedBlock(current);
  const next = `${base}${base.length === 0 ? '' : base.endsWith('\n') ? '\n' : '\n\n'}${claudeMdBlock(kitDir)}`;
  if (next === current) return { path: claudeMdPath, status: 'present' };
  if (apply) writeFileSync(claudeMdPath, next, 'utf8');
  return { path: claudeMdPath, status: apply ? (current.includes(claudeMdStart) ? 'updated' : 'added') : 'would-write' };
}

function backupExisting(claudeDir, apply) {
  const present = replaceableDirs.filter((name) => existsSync(path.join(claudeDir, name)));
  if (present.length === 0) return { status: 'nothing-to-replace', moved: [] };
  const backupDir = path.join(claudeDir, 'engineering-os-backups', timestamp());
  if (apply) {
    mkdirSync(backupDir, { recursive: true });
    for (const name of present) renameSync(path.join(claudeDir, name), path.join(backupDir, name));
  }
  return { status: apply ? 'moved' : 'would-move', backupDir, moved: present };
}

// Kit files copied into the shared agents/skills/commands folders, relative to claudeDir.
function harnessPlan() {
  return [
    { from: path.join(kitRoot, '.claude', 'agents'), to: 'agents' },
    { from: path.join(kitRoot, '.claude', 'skills'), to: 'skills' },
    { from: path.join(kitRoot, 'adapters', 'claude-code', 'commands'), to: path.join('commands', 'engineering-os') }
  ];
}

export function installGlobal({ claudeDir = defaultClaudeDir(), replace = false, autoInit = false, apply = true } = {}) {
  const source = kitSource();
  const globalRoot = path.join(claudeDir, 'engineering-os');
  const kitDir = path.join(globalRoot, 'kit');
  const hooksDir = path.join(globalRoot, 'hooks');
  const claudeCodeDetected = existsSync(claudeDir);

  // Installing from the global copy would delete the running kit before copying it.
  if (path.resolve(kitRoot) === path.resolve(kitDir)) {
    throw new Error('Run install-global from a kit clone or npx github:shreenidhims/engineering-os-kit, not from the installed global copy.');
  }

  // Validate settings.json before changing anything, so a bad file aborts cleanly.
  readSettings(path.join(claudeDir, 'settings.json'));

  const backup = replace ? backupExisting(claudeDir, apply) : { status: 'skipped', moved: [] };

  const installedFiles = [];
  for (const { from, to } of harnessPlan()) {
    for (const file of listFiles(from)) installedFiles.push(toPosix(path.join(to, file)));
  }

  if (apply) {
    mkdirSync(claudeDir, { recursive: true });
    rmSync(kitDir, { recursive: true, force: true });
    mkdirSync(kitDir, { recursive: true });
    for (const entry of kitCopyEntries) {
      const from = path.join(kitRoot, entry);
      if (existsSync(from)) cpSync(from, path.join(kitDir, entry), { recursive: true });
    }
    writeFileSync(path.join(kitDir, 'kit-source.json'), `${JSON.stringify({ version: source.version, commit: source.commit }, null, 2)}\n`, 'utf8');

    rmSync(hooksDir, { recursive: true, force: true });
    cpSync(path.join(kitRoot, 'adapters', 'claude-code', 'global-hooks'), hooksDir, { recursive: true });

    for (const { from, to } of harnessPlan()) {
      mkdirSync(path.join(claudeDir, to), { recursive: true });
      cpSync(from, path.join(claudeDir, to), { recursive: true, force: true });
    }

    const previous = existsSync(path.join(globalRoot, 'config.json')) ? JSON.parse(readFileSync(path.join(globalRoot, 'config.json'), 'utf8')) : {};
    const config = { ...previous, version: source.version, installedFrom: source.label, installedAt: new Date().toISOString(), autoInit: autoInit || Boolean(previous.autoInit) };
    writeFileSync(path.join(globalRoot, 'config.json'), `${JSON.stringify(config, null, 2)}\n`, 'utf8');
    writeFileSync(path.join(globalRoot, 'installed-files.json'), `${JSON.stringify({ files: installedFiles }, null, 2)}\n`, 'utf8');
  }

  const settings = mergeSettings(path.join(claudeDir, 'settings.json'), hooksDir, apply);
  const claudeMd = writeClaudeMd(path.join(claudeDir, 'CLAUDE.md'), kitDir, apply);

  return {
    mode: apply ? 'applied' : 'dry-run',
    claudeDir,
    claudeCodeDetected,
    kit: { path: kitDir, source: source.label },
    autoInit,
    backup,
    harnessFiles: installedFiles.length,
    settings,
    claudeMd,
    next: `Open Claude Code in any Git repository. Set up a repo with: node "${toPosix(path.join(kitDir, 'src', 'cli.mjs'))}" init-project --target .`
  };
}

export function uninstallGlobal({ claudeDir = defaultClaudeDir(), apply = true } = {}) {
  const globalRoot = path.join(claudeDir, 'engineering-os');
  const manifestPath = path.join(globalRoot, 'installed-files.json');
  const files = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')).files ?? [] : [];
  const removed = files.filter((file) => existsSync(path.join(claudeDir, file)));

  const settingsPath = path.join(claudeDir, 'settings.json');
  let settingsStatus = 'absent';
  if (existsSync(settingsPath)) {
    const settings = readSettings(settingsPath);
    for (const event of Object.keys(settings.hooks ?? {})) {
      settings.hooks[event] = settings.hooks[event].filter((entry) => !isOurEntry(entry));
      if (settings.hooks[event].length === 0) delete settings.hooks[event];
    }
    if (settings.hooks && Object.keys(settings.hooks).length === 0) delete settings.hooks;
    if (apply) writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
    settingsStatus = apply ? 'cleaned' : 'would-clean';
  }

  const claudeMdPath = path.join(claudeDir, 'CLAUDE.md');
  let claudeMdStatus = 'absent';
  if (existsSync(claudeMdPath)) {
    const current = readFileSync(claudeMdPath, 'utf8');
    const next = stripManagedBlock(current);
    claudeMdStatus = next === current ? 'unchanged' : apply ? 'cleaned' : 'would-clean';
    if (apply && next !== current) writeFileSync(claudeMdPath, next, 'utf8');
  }

  if (apply) {
    for (const file of removed) rmSync(path.join(claudeDir, file), { force: true });
    // Remove directories the kit created that are now empty (e.g. skills/<name>/, commands/engineering-os/).
    const dirs = new Set();
    for (const file of removed) {
      for (let dir = path.dirname(file); dir !== '.' && dir !== ''; dir = path.dirname(dir)) dirs.add(dir);
    }
    const deepestFirst = [...dirs].sort((a, b) => b.length - a.length);
    for (const dir of deepestFirst) {
      const full = path.join(claudeDir, dir);
      if (existsSync(full) && readdirSync(full).length === 0) rmSync(full, { recursive: true });
    }
    rmSync(globalRoot, { recursive: true, force: true });
  }

  const backups = path.join(claudeDir, 'engineering-os-backups');
  return {
    mode: apply ? 'applied' : 'dry-run',
    claudeDir,
    removedFiles: removed.length,
    settings: settingsStatus,
    claudeMd: claudeMdStatus,
    backups: existsSync(backups) ? `Kept ${backups}; restore any folder from it by moving it back.` : null
  };
}
