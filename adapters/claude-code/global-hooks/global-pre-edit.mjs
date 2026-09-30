#!/usr/bin/env node
// Global Claude Code PreToolUse hook (Edit|Write|MultiEdit|NotebookEdit).
// In a Git repo that has Engineering OS, blocks the edit (exit 2) until `pre-task-check`
// passes. Repos without Engineering OS, opted-out repos and non-Git folders are never blocked;
// the SessionStart hook is what guides setup there.
// Set ENGINEERING_OS_ENFORCE=0 to disable the gate for a session.
import { isInitialized, isOptedOut, projectGitRoot, runProjectCli } from './global-common.mjs';

if (process.env.ENGINEERING_OS_ENFORCE === '0') process.exit(0);

const root = projectGitRoot();
if (!root || isOptedOut(root) || !isInitialized(root)) process.exit(0);

const result = runProjectCli(root, ['pre-task-check']);
if (result.status === 0) process.exit(0);
process.stderr.write(`Engineering OS pre-task gate blocked this edit.\n${result.stderr || result.stdout}`);
process.exit(2);
