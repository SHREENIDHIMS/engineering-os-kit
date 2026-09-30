#!/usr/bin/env node
// Global Claude Code SessionStart hook. Whatever it prints is added to Claude's context.
//
// - Not a Git repo, or opted out (.engineering-os-ignore / the kit's own repo): prints nothing.
// - Git repo with Engineering OS: prints the project briefing, plus an upgrade hint when the
//   project's kit is older than the global kit.
// - Git repo without Engineering OS:
//     autoInit=false (default): tells Claude how to set it up and to tell the user first.
//     autoInit=true (install-global --auto-init): runs init-project now and reports it.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { globalConfig, isInitialized, isOlder, isOptedOut, kitCli, kitDir, projectGitRoot, readJson, runProjectCli } from './global-common.mjs';

const root = projectGitRoot();
if (!root || isOptedOut(root)) process.exit(0);

const cliDisplay = kitCli.split(path.sep).join('/');
const output = [];

function briefing() {
  const projectHook = path.join(root, '.engineering-os', 'hooks', 'claude-session-start.mjs');
  const script = existsSync(projectHook) ? projectHook : path.join(kitDir, 'adapters', 'claude-code', 'hooks', 'claude-session-start.mjs');
  const result = spawnSync(process.execPath, [script], {
    cwd: root, encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: root, ENGINEERING_OS_FROM_GLOBAL: '1' }
  });
  if (result.stdout) output.push(result.stdout.trimEnd());
}

if (!isInitialized(root) && globalConfig.autoInit) {
  const result = runProjectCli(root, ['init-project']);
  if (result.status === 0) {
    output.push('## Engineering OS setup', `- Engineering OS was initialized automatically in \`${root}\` at session start (global autoInit is on).`,
      '- Tell the user, and suggest they review the new files with `git status` and commit them.');
  } else {
    output.push('## Engineering OS setup', `- Automatic initialization failed: ${(result.stderr || result.stdout).trim()}`);
  }
}

if (isInitialized(root)) {
  briefing();
  const projectVersion = readJson(path.join(root, '.engineering-os', 'config.json')).version;
  if (isOlder(projectVersion, globalConfig.version)) {
    output.push(`- This project uses kit ${projectVersion}; the global kit is ${globalConfig.version}. Ask the user before upgrading with: \`node "${cliDisplay}" upgrade --target .\``);
  }
} else if (!globalConfig.autoInit) {
  output.push(
    '## Engineering OS setup',
    '- This Git repository does not have Engineering OS yet (the global harness is installed on this machine).',
    `- Before the first code change, tell the user and set it up with: \`node "${cliDisplay}" init-project --target .\``,
    '  It adds `.engineering-os/` (tasks, evidence, lessons), managed sections in `AGENTS.md`/`CLAUDE.md`, `.claude/` hooks, agents, skills, and a CI workflow. It never overwrites existing files.',
    '- Then start a task: `node scripts/engineering-os.mjs start-task --title "..." --owner "..." --acceptance "..."`.',
    '- If the user does not want it in this repo, create an empty `.engineering-os-ignore` file at the repo root to silence this message.'
  );
}

if (output.length > 0) process.stdout.write(`${output.join('\n')}\n`);
