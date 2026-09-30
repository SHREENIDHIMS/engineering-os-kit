import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { initializeStore, writeProjectFile } from '../core/storage.mjs';
import { lessonsTemplate, mistakesTemplate, projectIndexTemplate, renderTemplate } from '../core/project-templates.mjs';
import { installAdapter, upsertManagedBlock } from '../core/adapter-install.mjs';
import { agentsContract, agentsContractEnd, agentsContractStart } from '../core/agents-contract.mjs';
import { kitRoot, kitSource, samePath } from '../core/kit-source.mjs';
import { installGlobal, uninstallGlobal } from '../core/global-install.mjs';
import { kitVersion, print, syncIndex, targetRoot } from './shared.mjs';

// Installing, upgrading and removing Engineering OS: bootstrap, init-project, upgrade,
// install-global, uninstall-global.

// With force (upgrade) an outdated contract is replaced; text outside the markers is kept.
function ensureManagedAgents(root, apply, force = false) {
  return upsertManagedBlock(root, 'AGENTS.md', agentsContractStart, agentsContractEnd, agentsContract, { apply, force });
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

export function commandBootstrap(args) {
  const root = targetRoot(args);
  const apply = Boolean(args.apply);
  const missing = initializeStore(root, { write: apply });
  const agents = ensureManagedAgents(root, apply, Boolean(args.force));
  const projectFiles = initializeProjectFiles(root, apply);
  const adapter = installAdapter(root, args.adapter ?? 'none', { write: apply, force: Boolean(args.force), replace: Boolean(args.replace), version: kitVersion(), installedFrom: kitSource().label });
  print({ root, mode: apply ? 'applied' : 'dry-run', missingDirectories: missing, agents, projectFiles, adapter });
}

export function commandInitProject(args) {
  commandBootstrap({ ...args, apply: true, adapter: args.adapter ?? 'claude' });
}

export function commandUpgrade(args) {
  const root = targetRoot(args);
  const configPath = path.join(root, '.engineering-os', 'config.json');
  if (!existsSync(configPath)) throw new Error('Engineering OS not initialized in target. Run init-project first.');
  if (samePath(kitRoot, path.join(root, '.engineering-os', 'kit'))) {
    throw new Error('Run upgrade from a newer kit clone (node <kit>/src/cli.mjs upgrade --target .), not from the vendored copy.');
  }
  const installed = JSON.parse(readFileSync(configPath, 'utf8'));
  commandBootstrap({ ...args, apply: true, force: true, adapter: args.adapter ?? installed.adapter ?? 'claude' });
}

export function commandInstallGlobal(args) {
  print(installGlobal({ claudeDir: args['claude-dir'] ? path.resolve(args['claude-dir']) : undefined, replace: Boolean(args.replace), autoInit: Boolean(args['auto-init']), apply: !args['dry-run'] }));
}

export function commandUninstallGlobal(args) {
  print(uninstallGlobal({ claudeDir: args['claude-dir'] ? path.resolve(args['claude-dir']) : undefined, apply: !args['dry-run'] }));
}
