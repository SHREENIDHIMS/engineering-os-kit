import { chmodSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { osDirectory } from './storage.mjs';
import { launcherPs1, launcherScript } from './project-launcher.mjs';

const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Everything below is kit-owned: `upgrade` (force) overwrites it. Project records,
// memory files (INDEX/MISTAKES/LESSONS_LEARNED) and user-added agents/skills are never touched.
const adapterSources = {
  claude: [
    { from: '.claude/agents', to: '.claude/agents' },
    { from: '.claude/skills', to: '.claude/skills' },
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

const hookFiles = ['pre-task.ps1', 'pre-task.sh', 'claude-pre-edit.mjs', 'claude-session-start.mjs'];

const hookMarker = '.engineering-os/hooks/claude-';
const claudeHooks = {
  SessionStart: [{ hooks: [{ type: 'command', command: 'node "$CLAUDE_PROJECT_DIR/.engineering-os/hooks/claude-session-start.mjs"' }] }],
  PreToolUse: [{ matcher: 'Edit|Write|MultiEdit|NotebookEdit', hooks: [{ type: 'command', command: 'node "$CLAUDE_PROJECT_DIR/.engineering-os/hooks/claude-pre-edit.mjs"' }] }]
};

const managedStart = '# engineering-os:managed:start';
const managedEnd = '# engineering-os:managed:end';
const gitignoreBlock = `${managedStart}\n.engineering-os/state/*.lock\n.engineering-os/evidence/*.local.json\n.engineering-os/**/*.tmp\n${managedEnd}\n`;

const claudeMdStart = '<!-- engineering-os:managed:start -->';
const claudeMdBlock = `${claudeMdStart}\n## Engineering OS\n\nThis project uses Engineering OS. Follow the project contract and orchestration rules:\n\n@AGENTS.md\n@AGENT_AMPLIFIER.md\n@.engineering-os/LESSONS_LEARNED.md\n<!-- engineering-os:managed:end -->\n`;

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

function appendManagedBlock(root, relativePath, marker, block, apply) {
  const destination = path.join(root, relativePath);
  const current = existsSync(destination) ? readFileSync(destination, 'utf8') : '';
  if (current.includes(marker)) return { path: destination, status: 'present' };
  if (!apply) return { path: destination, status: 'would-add' };
  const separator = current.length === 0 ? '' : current.endsWith('\n') ? '\n' : '\n\n';
  writeFileSync(destination, `${current}${separator}${block}`, 'utf8');
  return { path: destination, status: 'added' };
}

export function vendorKit(root, { write = false, force = false, version = '0.1.0' } = {}) {
  const items = vendorPaths.map(({ from, to, replace }) =>
    copyTree(path.join(kitRoot, from), path.join(root, to), { apply: write, force, replace }));
  const kitPackage = `${JSON.stringify({ name: 'engineering-os-kit-vendored', version, type: 'module' }, null, 2)}\n`;
  items.push(writeFile(root, '.engineering-os/kit/package.json', kitPackage, { apply: write, force }));
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

export function installGitignore(root, { write = false } = {}) {
  return appendManagedBlock(root, '.gitignore', managedStart, gitignoreBlock, write);
}

export function installClaudeMd(root, { write = false } = {}) {
  return appendManagedBlock(root, 'CLAUDE.md', claudeMdStart, claudeMdBlock, write);
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

export function installAdapter(root, adapter, { write = false, force = false, version = '0.1.0', installedFrom = null } = {}) {
  const vendor = vendorKit(root, { write, force, version });
  const launcher = installProjectLauncher(root, { write, force });
  const hooks = installHooks(root, { write, force });
  const ci = installTargetCi(root, { write, force });
  const gitignore = installGitignore(root, { write });

  let adapterItems = [];
  let claude;
  if (adapter && adapter !== 'none') {
    const plan = adapterSources[adapter];
    if (!plan) throw new Error(`Unknown adapter: ${adapter}. Use claude or none.`);
    adapterItems = plan.map(({ from, to }) => copyTree(path.join(kitRoot, from), path.join(root, to), { apply: write, force }));
    if (adapter === 'claude') claude = { settings: installClaudeSettings(root, { write }), claudeMd: installClaudeMd(root, { write }) };
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
    installedFrom: installedFrom ?? kitRoot
  };
  if (write) {
    mkdirSync(path.dirname(configPath), { recursive: true });
    writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  }

  return { adapter: adapter ?? 'none', configPath, config: write ? config : undefined, vendor, launcher, hooks, ci, gitignore, claude, items: adapterItems };
}
