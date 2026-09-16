import { chmodSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { osDirectory } from './storage.mjs';
import { launcherPs1, launcherScript } from './project-launcher.mjs';

const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const adapterSources = {
  claude: [
    { from: '.claude/agents', to: '.claude/agents' },
    { from: '.claude/skills', to: '.claude/skills' },
    { from: 'adapters/claude-code/commands', to: '.claude/commands/engineering-os' },
    { from: 'AGENT_AMPLIFIER.md', to: 'AGENT_AMPLIFIER.md' }
  ]
};

const vendorPaths = [
  { from: 'src', to: '.engineering-os/kit/src' },
  { from: 'core/schemas', to: '.engineering-os/kit/core/schemas' },
  { from: 'core/policies', to: '.engineering-os/policies' }
];

function copyTree(source, destination, apply) {
  if (!existsSync(source)) return { source, destination, status: 'missing-source' };
  if (existsSync(destination)) return { source, destination, status: 'present' };
  if (!apply) return { source, destination, status: 'would-add' };
  mkdirSync(path.dirname(destination), { recursive: true });
  cpSync(source, destination, { recursive: true });
  return { source, destination, status: 'added' };
}

function writeFile(root, relativePath, content, apply) {
  const destination = path.join(root, relativePath);
  if (existsSync(destination)) return { path: destination, status: 'present' };
  if (!apply) return { path: destination, status: 'would-add' };
  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, content, 'utf8');
  if (relativePath.endsWith('.sh')) {
    try { chmodSync(destination, 0o755); } catch { /* windows */ }
  }
  return { path: destination, status: 'added' };
}

export function vendorKit(root, { write = false, version = '0.1.0' } = {}) {
  const items = vendorPaths.map(({ from, to }) => {
    const source = path.join(kitRoot, from);
    const destination = path.join(root, to);
    return copyTree(source, destination, write);
  });

  const kitPackage = writeFile(root, '.engineering-os/kit/package.json', `${JSON.stringify({ name: 'engineering-os-kit-vendored', version, type: 'module' }, null, 2)}\n`, write);
  items.push(kitPackage);
  return items;
}

export function installProjectLauncher(root, { write = false } = {}) {
  return [
    writeFile(root, 'scripts/engineering-os.mjs', launcherScript, write),
    writeFile(root, 'scripts/engineering-os.ps1', launcherPs1, write)
  ];
}

export function installHooks(root, { write = false } = {}) {
  const hooks = ['pre-task.ps1', 'pre-task.sh'];
  return hooks.map((hook) => {
    const source = path.join(kitRoot, 'adapters/claude-code/hooks', hook);
    const destination = path.join(root, '.engineering-os/hooks', hook);
    if (!existsSync(source)) return { source, destination, status: 'missing-source' };
    if (existsSync(destination)) return { source, destination, status: 'present' };
    if (!write) return { source, destination, status: 'would-add' };
    mkdirSync(path.dirname(destination), { recursive: true });
    cpSync(source, destination);
    if (hook.endsWith('.sh')) {
      try { chmodSync(destination, 0o755); } catch { /* windows */ }
    }
    return { source, destination, status: 'added' };
  });
}

export function installTargetCi(root, { write = false } = {}) {
  const source = path.join(kitRoot, 'ci/engineering-os-target.yml');
  const destination = path.join(root, '.github/workflows/engineering-os.yml');
  if (!existsSync(source)) return { source, destination, status: 'missing-source' };
  if (existsSync(destination)) return { source, destination, status: 'present' };
  if (!write) return { source, destination, status: 'would-add' };
  mkdirSync(path.dirname(destination), { recursive: true });
  cpSync(source, destination);
  return { source, destination, status: 'added' };
}

export function installAdapter(root, adapter, { write = false, version = '0.1.0', installedFrom = null } = {}) {
  const vendor = vendorKit(root, { write, version });
  const launcher = installProjectLauncher(root, { write });
  const hooks = installHooks(root, { write });
  const ci = installTargetCi(root, { write });

  let adapterItems = [];
  if (adapter && adapter !== 'none') {
    const plan = adapterSources[adapter];
    if (!plan) throw new Error(`Unknown adapter: ${adapter}. Use claude or none.`);
    adapterItems = plan.map(({ from, to }) => copyTree(path.join(kitRoot, from), path.join(root, to), write));
  }

  const config = {
    version,
    adapter: adapter ?? 'none',
    kitPath: '.engineering-os/kit',
    cli: 'scripts/engineering-os.mjs',
    projectRoot: '.',
    installedFrom: installedFrom ?? kitRoot
  };

  const configPath = path.join(osDirectory(root), 'config.json');
  if (write) {
    if (existsSync(configPath)) {
      Object.assign(config, JSON.parse(readFileSync(configPath, 'utf8')), config);
    }
    mkdirSync(path.dirname(configPath), { recursive: true });
    writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  }

  return { adapter: adapter ?? 'none', configPath, config: write ? config : undefined, vendor, launcher, hooks, ci, items: adapterItems };
}
