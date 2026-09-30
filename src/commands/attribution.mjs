import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { findAttribution, isAiIdentity, ruleText } from '../core/attribution.mjs';
import { print } from './shared.mjs';

// `check-attribution`: scans commits (message, author, committer) and optional text such as a PR
// title/body for AI attribution. Exit code 1 when anything is found, so CI can gate on it.
//   --range <revs>     git revision range, default HEAD (whole history of the current branch)
//   --max-count <n>    only the newest n commits of the range
//   --text <string>    also scan this text (e.g. PR title and body passed in by CI)
export function scanCommits(root, { range = 'HEAD', maxCount } = {}) {
  const args = ['-C', root, 'log', '--format=%H%x1f%an <%ae>%x1f%cn <%ce>%x1f%B%x1e'];
  if (maxCount) args.push(`--max-count=${Number(maxCount)}`);
  args.push(...String(range).split(/\s+/).filter(Boolean));
  const result = spawnSync('git', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`git log failed for range "${range}": ${result.stderr.trim()}`);
  const findings = [];
  const records = result.stdout.split('\x1e').map((record) => record.replace(/^\n/, '')).filter(Boolean);
  for (const record of records) {
    const [sha, author, committer, message] = record.split('\x1f');
    const commit = sha.slice(0, 12);
    if (isAiIdentity(author)) findings.push({ commit, field: 'author', match: author });
    if (isAiIdentity(committer)) findings.push({ commit, field: 'committer', match: committer });
    for (const item of findAttribution(message)) findings.push({ commit, field: 'message', label: item.label, match: item.match });
  }
  return { commitsChecked: records.length, findings };
}

export function commandCheckAttribution(args) {
  const root = path.resolve(args.target ?? process.cwd());
  const { commitsChecked, findings } = scanCommits(root, { range: args.range ?? 'HEAD', maxCount: args['max-count'] });
  if (args.text) for (const item of findAttribution(args.text)) findings.push({ field: 'text', label: item.label, match: item.match });
  const clean = findings.length === 0;
  print({ range: args.range ?? 'HEAD', commitsChecked, clean, findings, ...(clean ? {} : { rule: ruleText }) });
  if (!clean) process.exitCode = 1;
}
