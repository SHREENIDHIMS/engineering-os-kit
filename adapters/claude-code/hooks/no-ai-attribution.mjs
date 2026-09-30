#!/usr/bin/env node
// Claude Code PreToolUse hook (Bash and MCP tools): blocks commands and tool calls that would put
// AI attribution into Git history or on GitHub — commit/merge/tag messages, PR titles and bodies,
// comments, release notes. Exit code 2 blocks the call and shows stderr to the agent.
// Installed in a project as .engineering-os/hooks/no-ai-attribution.mjs and globally as
// ~/.claude/engineering-os/hooks/global-no-ai-attribution.mjs; both resolve the kit at ../kit.
import { findAttribution, publishingCommand, ruleText } from '../kit/src/core/attribution.mjs';

let raw = '';
for await (const chunk of process.stdin) raw += chunk;
let event = {};
try { event = JSON.parse(raw || '{}'); } catch { process.exit(0); }

const tool = String(event.tool_name ?? '');
const input = event.tool_input ?? {};
let text = null;
if (tool === 'Bash') {
  const command = String(input.command ?? '');
  if (publishingCommand.test(command)) text = command;
} else if (/^mcp__.*(github|gitlab|git)/i.test(tool)) {
  text = JSON.stringify(input);
}
if (text === null) process.exit(0);

const findings = findAttribution(text);
if (findings.length === 0) process.exit(0);
process.stderr.write(`Blocked: this would publish AI attribution (${findings.map((item) => `${item.label}: "${item.match}"`).join('; ')}).\n${ruleText}\nRemove those lines and try again.\n`);
process.exit(2);
