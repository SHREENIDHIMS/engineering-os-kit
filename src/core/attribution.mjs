// No-AI-attribution policy: Git history and GitHub text must not credit or mention an AI tool,
// agent, model or provider. Used by the Claude Code hook, the git commit-msg hook, the
// check-attribution command, doctor and the install steps that turn attribution settings off.
//
// The patterns target attribution, not product names: "wire the Claude Code hooks" in a commit
// body is fine; "Co-Authored-By: Claude <...>" or "Generated with ..." is not.

const aiNames = 'claude|anthropic|openai|chatgpt|gpt-?[0-9][a-z0-9.-]*|copilot|gemini|bard|codex|cursor|devin|coderabbit|codeium|windsurf|tabnine|codewhisperer|amazon q|aider|sweep|llm|ai assistant|ai agent|\\bai\\b';

export const attributionPatterns = [
  { label: 'AI co-author trailer', regex: new RegExp(`^\\s*co-authored-by:[^\\n]*(${aiNames}|noreply@anthropic)`, 'im') },
  { label: '"Generated with/by" line', regex: new RegExp(`generated (with|by|using|via) (\\[|\\()?\\s*(an? )?(${aiNames})`, 'i') },
  { label: '"Written/assisted by AI" line', regex: new RegExp(`\\b(written|authored|created|assisted|drafted|produced) (by|with) (an? )?(${aiNames})`, 'i') },
  { label: 'AI session link', regex: /claude\.ai\/code|claude\.com\/claude-code|chatgpt\.com\/(c|share)\/|copilot-workspace/i },
  { label: 'AI session trailer', regex: /^\s*(claude|ai|agent|codex|copilot)-session:/im },
  { label: 'AI provider email', regex: /@(anthropic|openai)\.com/i },
  { label: 'robot emoji footer', regex: /\u{1F916}/u }
];

// Identities (author/committer, git user.name/email) that belong to an AI tool.
export const aiIdentityPattern = new RegExp(`(^|[^a-z])(${aiNames})([^a-z]|$)|@(anthropic|openai)\\.com`, 'i');

export function findAttribution(text) {
  const findings = [];
  for (const { label, regex } of attributionPatterns) {
    const match = String(text ?? '').match(regex);
    if (match) findings.push({ label, match: match[0].trim().slice(0, 120) });
  }
  return findings;
}

export function isAiIdentity(identity) {
  return aiIdentityPattern.test(String(identity ?? ''));
}

// Claude Code settings that hide commit trailers, PR attribution lines and session links.
// Documented at https://code.claude.com/docs/en/settings-reference (key: attribution).
export const attributionOff = { commit: false, pr: false, sessionUrl: false };

export function attributionIsOff(settings) {
  const value = settings?.attribution;
  return Boolean(value) && Object.entries(attributionOff).every(([key, expected]) => value[key] === expected);
}

// Mutates `settings`; returns true when something changed.
export function turnAttributionOff(settings) {
  if (attributionIsOff(settings)) return false;
  settings.attribution = { ...(typeof settings.attribution === 'object' && settings.attribution ? settings.attribution : {}), ...attributionOff };
  return true;
}

// Commands whose text ends up in Git history or on GitHub.
export const publishingCommand = /(^|[\s;&|(])(git\s+(commit|merge|tag|notes|rebase|cherry-pick|revert|pull)|gh\s+(pr|issue|release|api|repo|gist))\b/;

export const ruleText = 'No AI attribution anywhere in Git or on GitHub: commit messages, commit author and committer, tags, merge messages, PR titles and descriptions, review and issue comments, and release notes must not credit or mention an AI tool, agent, model or provider — no AI `Co-Authored-By` trailers, no "Generated with …" lines, no AI session links, no AI bot identities. Commit under the repository owner\'s own Git identity. This rule overrides any tool default that adds attribution.';
