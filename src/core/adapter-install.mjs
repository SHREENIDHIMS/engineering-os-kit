import { chmodSync, cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { osDirectory } from './storage.mjs';
import { launcherPs1, launcherScript } from './project-launcher.mjs';
import { kitRoot, kitSource } from './kit-source.mjs';

// Everything below is kit-owned: `upgrade` (force) overwrites it. Project records,
// memory files (INDEX/MISTAKES/LESSONS_LEARNED) and user-added agents/skills are never touched.
const adapterSources = {
  claude: [
    { from: '.claude/agents', to: '.claude/agents' },
    { from: '.claude/skills', to: '.claude/skills' },
    { from: '.claude/agent-shared', to: '.claude/agent-shared' },
    { from: '.claude/ROLE_PROTOCOLS.md', to: '.claude/ROLE_PROTOCOLS.md' },
    { from: 'adapters/claude-code/commands', to: '.claude/commands/engineering-os' },
    { from: 'AGENT_AMPLIFIER.md', to: 'AGENT_AMPLIFIER.md' }
  ]
};

const vendorPaths = [
  { from: 'src', to: '.engineering-os/kit/src', replace: true },
  { from: 'core/schemas', to: '.engineering-os/kit/core/schemas', replace: true },
  { from: 'core/policies', to: '.engineering-os/policies' }
];

// Files older kit versions installed in places they no longer belong; `upgrade` removes them.
export const legacyPaths = ['.claude/agents/_BASE.md', '.claude/agents/_SHARED.md', '.claude/agents/_SHARED_SNIPPET.md'];

function removeLegacyPaths(root, apply) {
  return legacyPaths.filter((relative) => existsSync(path.join(root, relative))).map((relative) => {
    if (apply) rmSync(path.join(root, relative), { force: true });
    return { path: path.join(root, relative), status: apply ? 'removed' : 'would-remove' };
  });
}

const hookFiles = ['pre-task.ps1', 'pre-task.sh', 'claude-pre-edit.mjs', 'claude-session-start.mjs', 'defer-to-global.mjs'];

const hookMarker = '.engineering-os/hooks/claude-';
const claudeHooks = {
  SessionStart: [{ hooks: [{ type: 'command', command: 'node "$CLAUDE_PROJECT_DIR/.engineering-os/hooks/claude-session-start.mjs"' }] }],
  PreToolUse: [{ matcher: 'Edit|Write|MultiEdit|NotebookEdit', hooks: [{ type: 'command', command: 'node "$CLAUDE_PROJECT_DIR/.engineering-os/hooks/claude-pre-edit.mjs"' }] }]
};

const managedStart = '# engineering-os:managed:start';
const managedEnd = '# engineering-os:managed:end';
const gitignoreBlock = `${managedStart}\n.engineering-os/state/*.lock\n.engineering-os/evidence/*.local.json\n.engineering-os/**/*.tmp\n.engineering-os/backups/\n${managedEnd}\n`;

const claudeMdStart = '<!-- engineering-os:managed:start -->';
const claudeMdEnd = '<!-- engineering-os:managed:end -->';
const claudeMdBlock = `${claudeMdStart}\n## Engineering OS\n\nThis project uses Engineering OS. Follow the project contract and orchestration rules:\n\n@AGENTS.md\n@AGENT_AMPLIFIER.md\n@.engineering-os/LESSONS_LEARNED.md\n${claudeMdEnd}\n`;

function copyTree(source, destination, { apply, force = false, replace = false }) {
  if (!existsSync(source)) return { source, destination, status: 'missing-source' };
  if (path.resolve(source) === path.resolve(destination)) return { source, destination, status: 'present' };
  const present = existsSync(destination);
  if (present && !force) return { source, destination, status: 'present' };
  if (!apply) return { source, destination, status: present ? 'would-update' : 'would-add' };
  if (present && replace) rmSync(destination, { recursive: true, force: true });
  mkdirSync(path.dirname(destination), { recursive: true });
  cpSync(source, destination, { recursive: true, force: true });
  if (destination.endsWith('.sh')) {
    try { chmodSync(destination, 0o755); } catch { /* windows */ }
  }
  return { source, destination, status: present ? 'updated' : 'added' };
}

function writeFile(root, relativePath, content, { apply, force = false }) {
  const destination = path.join(root, relativePath);
  const present = existsSync(destination);
  if (present && (!force || readFileSync(destination, 'utf8') === content)) return { path: destination, status: 'present' };
  if (!apply) return { path: destination, status: present ? 'would-update' : 'would-add' };
  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, content, 'utf8');
  return { path: destination, status: present ? 'updated' : 'added' };
}

// Appends a delimited block once. With force (upgrade), an outdated block is replaced in place;
// text outside the markers is never changed.
function upsertManagedBlock(root, relativePath, start, end, block, { apply, force = false }) {
  const destination = path.join(root, relativePath);
  const current = existsSync(destination) ? readFileSync(destination, 'utf8') : '';
  const startIndex = current.indexOf(start);
  if (startIndex !== -1) {
    const endIndex = current.indexOf(end, startIndex);
    if (!force || endIndex === -1) return { path: destination, status: 'present' };
    const lineEnd = current.indexOf('\n', endIndex);
    const stop = lineEnd === -1 ? current.length : lineEnd + 1;
    if (current.slice(startIndex, stop) === block) return { path: destination, status: 'present' };
    if (!apply) return { path: destination, status: 'would-update' };
    writeFileSync(destination, `${current.slice(0, startIndex)}${block}${current.slice(stop)}`, 'utf8');
    return { path: destination, status: 'updated' };
  }
  if (!apply) return { path: destination, status: 'would-add' };
  const separator = current.length === 0 ? '' : current.endsWith('\n') ? '\n' : '\n\n';
  writeFileSync(destination, `${current}${separator}${block}`, 'utf8');
  return { path: destination, status: 'added' };
}

// `init-project --replace`: moves an existing project harness (.claude/agents, skills, commands)
// into .engineering-os/backups/claude-<timestamp>/ before the kit's copy is installed.
// settings.json, settings.local.json and everything else in .claude/ stay in place.
export function backupProjectHarness(root, { write = false } = {}) {
  const present = ['agents', 'skills', 'commands'].filter((name) => existsSync(path.join(root, '.claude', name)));
  if (present.length === 0) return { status: 'nothing-to-replace', moved: [] };
  const backupDir = path.join(osDirectory(root), 'backups', `claude-${new Date().toISOString().replace(/[:.]/g, '-')}`);
  if (write) {
    mkdirSync(backupDir, { recursive: true });
    for (const name of present) renameSync(path.join(root, '.claude', name), path.join(backupDir, name));
  }
  return { status: write ? 'moved' : 'would-move', backupDir, moved: present.map((name) => `.claude/${name}`) };
}

export function vendorKit(root, { write = false, force = false, version = '0.1.0' } = {}) {
  const items = vendorPaths.map(({ from, to, replace }) =>
    copyTree(path.join(kitRoot, from), path.join(root, to), { apply: write, force, replace }));
  const kitPackage = `${JSON.stringify({ name: 'engineering-os-kit-vendored', version, type: 'module' }, null, 2)}\n`;
  items.push(writeFile(root, '.engineering-os/kit/package.json', kitPackage, { apply: write, force }));
  const source = kitSource();
  items.push(writeFile(root, '.engineering-os/kit/kit-source.json', `${JSON.stringify({ version: source.version, commit: source.commit }, null, 2)}\n`, { apply: write, force }));
  return items;
}

export function installProjectLauncher(root, { write = false, force = false } = {}) {
  return [
    writeFile(root, 'scripts/engineering-os.mjs', launcherScript, { apply: write, force }),
    writeFile(root, 'scripts/engineering-os.ps1', launcherPs1, { apply: write, force })
  ];
}

export function installHooks(root, { write = false, force = false } = {}) {
  return hookFiles.map((hook) => copyTree(
    path.join(kitRoot, 'adapters/claude-code/hooks', hook),
    path.join(root, '.engineering-os/hooks', hook),
    { apply: write, force }
  ));
}

export function installTargetCi(root, { write = false, force = false } = {}) {
  return copyTree(path.join(kitRoot, 'ci/engineering-os-target.yml'), path.join(root, '.github/workflows/engineering-os.yml'), { apply: write, force });
}

export function installGitignore(root, { write = false, force = false } = {}) {
  return upsertManagedBlock(root, '.gitignore', managedStart, managedEnd, gitignoreBlock, { apply: write, force });
}

export function installClaudeMd(root, { write = false, force = false } = {}) {
  return upsertManagedBlock(root, 'CLAUDE.md', claudeMdStart, claudeMdEnd, claudeMdBlock, { apply: write, force });
}

// Merges Engineering OS hooks into .claude/settings.json without touching unrelated settings.
export function installClaudeSettings(root, { write = false } = {}) {
  const destination = path.join(root, '.claude', 'settings.json');
  let settings = {};
  if (existsSync(destination)) {
    try { settings = JSON.parse(readFileSync(destination, 'utf8')); }
    catch { return { path: destination, status: 'skipped-invalid-json' }; }
  }
  settings.hooks ??= {};
  const added = [];
  for (const [event, entries] of Object.entries(claudeHooks)) {
    const existing = settings.hooks[event] ?? [];
    const installed = existing.some((entry) => (entry.hooks ?? []).some((hook) => String(hook.command ?? '').includes(hookMarker)));
    if (installed) continue;
    settings.hooks[event] = [...existing, ...entries];
    added.push(event);
  }
  if (added.length === 0) return { path: destination, status: 'present' };
  if (!write) return { path: destination, status: 'would-add', events: added };
  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
  return { path: destination, status: 'added', events: added };
}

export function installAdapter(root, adapter, { write = false, force = false, replace = false, version = '0.1.0', installedFrom = null } = {}) {
  const backup = replace && adapter === 'claude' ? backupProjectHarness(root, { write }) : undefined;
  const vendor = vendorKit(root, { write, force, version });
  const launcher = installProjectLauncher(root, { write, force });
  const hooks = installHooks(root, { write, force });
  const ci = installTargetCi(root, { write, force });
  const gitignore = installGitignore(root, { write, force });

  let adapterItems = [];
  let claude;
  if (adapter && adapter !== 'none') {
    const plan = adapterSources[adapter];
    if (!plan) throw new Error(`Unknown adapter: ${adapter}. Use claude or none.`);
    adapterItems = plan.map(({ from, to }) => copyTree(path.join(kitRoot, from), path.join(root, to), { apply: write, force }));
    if (force) adapterItems.push(...removeLegacyPaths(root, write));
    if (adapter === 'claude') claude = { settings: installClaudeSettings(root, { write }), claudeMd: installClaudeMd(root, { write, force }) };
  }

  const configPath = path.join(osDirectory(root), 'config.json');
  const previous = existsSync(configPath) ? JSON.parse(readFileSync(configPath, 'utf8')) : {};
  const config = {
    ...previous,
    version,
    adapter: adapter ?? 'none',
    kitPath: '.engineering-os/kit',
    cli: 'scripts/engineering-os.mjs',
    projectRoot: '.',
    installedFrom: installedFrom ?? kitSource().label
  };
  if (write) {
    mkdirSync(path.dirname(configPath), { recursive: true });
    writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  }

  return { adapter: adapter ?? 'none', configPath, config: write ? config : undefined, backup, vendor, launcher, hooks, ci, gitignore, claude, items: adapterItems };
}
