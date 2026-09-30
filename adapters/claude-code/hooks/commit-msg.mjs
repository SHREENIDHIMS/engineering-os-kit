#!/usr/bin/env node
// Git commit-msg hook body (called by the wrapper that init-project installs in the repo's git
// hooks directory). Rejects a commit whose message carries AI attribution, or whose author or
// committer identity is an AI tool, whoever makes the commit — a person, an IDE or an agent.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { findAttribution, isAiIdentity, ruleText } from '../kit/src/core/attribution.mjs';

const messageFile = process.argv[2];
if (!messageFile) process.exit(0);
// Ignore the comment lines git adds to the editor template.
const message = readFileSync(messageFile, 'utf8').split(/\r?\n/).filter((line) => !line.startsWith('#')).join('\n');

const problems = findAttribution(message).map((item) => `${item.label}: "${item.match}"`);
for (const variable of ['GIT_AUTHOR_IDENT', 'GIT_COMMITTER_IDENT']) {
  const result = spawnSync('git', ['var', variable], { encoding: 'utf8' });
  const identity = result.status === 0 ? result.stdout.replace(/\s+\d+\s+[+-]\d{4}\s*$/, '').trim() : '';
  if (isAiIdentity(identity)) problems.push(`${variable === 'GIT_AUTHOR_IDENT' ? 'author' : 'committer'} is an AI identity: "${identity}" (fix: git config user.name "Your Name" && git config user.email "you@example.com")`);
}

if (problems.length === 0) process.exit(0);
process.stderr.write(`Engineering OS rejected this commit:\n- ${problems.join('\n- ')}\n${ruleText}\n`);
process.exit(1);
