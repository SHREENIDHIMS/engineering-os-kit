#!/usr/bin/env node
// Claude Code PreToolUse hook: blocks file edits until an Engineering OS task is active.
// Exit code 2 tells Claude Code to block the tool call and show stderr to the agent.
// Set ENGINEERING_OS_ENFORCE=0 to disable the gate for a session.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { shouldDeferToGlobal } from './defer-to-global.mjs';

if (process.env.ENGINEERING_OS_ENFORCE === '0' || shouldDeferToGlobal()) process.exit(0);

const projectRoot = process.env.CLAUDE_PROJECT_DIR ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const launcher = path.join(projectRoot, 'scripts', 'engineering-os.mjs');
const result = spawnSync(process.execPath, [launcher, 'pre-task-check'], { cwd: projectRoot, encoding: 'utf8' });

if (result.status === 0) process.exit(0);
process.stderr.write(`Engineering OS pre-task gate blocked this edit.\n${result.stderr || result.stdout}`);
process.exit(2);
