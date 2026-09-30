# No AI attribution

**Rule:** nothing in Git history or on GitHub may credit or mention an AI tool,
agent, model or provider. This covers:

- commit messages, and the commit **author** and **committer** identity
- tags, merge commit messages and notes
- pull request titles and descriptions, review comments, issue comments
- release notes

So: no AI `Co-Authored-By` trailers, no "Generated with …" lines, no AI
session links, and no AI bot identities (such as a `user.email` at an AI
provider). Commits are made under the repository owner's own Git identity.
This rule overrides any tool's default attribution.

Naming a product the code integrates with is fine. "Wire the Claude Code
hooks" describes what a change does; "Co-Authored-By: <an AI>" credits an AI.
The checks are built to tell these apart.

## How it is enforced

Every layer is installed by `init-project` (and `install-global` where noted),
so one gap cannot let attribution through.

| Layer | Where | What it does |
|-------|-------|--------------|
| Rule text | `AGENTS.md`, `CLAUDE.md` (project and global), `AGENT_AMPLIFIER.md`, `.claude/agent-shared/_SHARED.md`, `git-safe-flow` skill, git and PR agents | Tells every agent the rule. |
| Claude Code setting | `.claude/settings.json` and `~/.claude/settings.json`: `"attribution": { "commit": false, "pr": false, "sessionUrl": false }` | Stops Claude Code adding its commit trailer, PR line and session link. See the [settings reference](https://code.claude.com/docs/en/settings-reference). |
| Claude Code hook | PreToolUse on `Bash` and `mcp__*` → `no-ai-attribution.mjs` (project) and `global-no-ai-attribution.mjs` (global) | Blocks `git commit/merge/tag/…` and `gh pr/issue/release/api …` commands, and GitHub tool calls, whose text carries attribution. |
| Git hook | This clone's `commit-msg` hook → `.engineering-os/hooks/commit-msg.mjs` | Rejects attributed messages and AI author/committer identities for **every** commit, whatever tool or person makes it. |
| CI | `.github/workflows/engineering-os.yml` | `check-attribution` on the PR's commits plus its title and body (re-runs when the PR is edited), or on pushed commits. |
| Health check | `doctor` | Fails on an AI git identity; warns when the setting, hook or commit-msg hook is missing, or recent commits carry attribution. |

The git hook is only installed when the clone has no `commit-msg` hook and does
not use `core.hooksPath` (Husky, lefthook and similar). In those cases call the
check from your existing hook:

```sh
node .engineering-os/hooks/commit-msg.mjs "$1" || exit 1
```

Git hooks live in each clone's `.git/` and are not committed, so every clone
needs `init-project` or `upgrade` once. CI is the backstop for clones that skipped it.

## Checking history

```sh
node scripts/engineering-os.mjs check-attribution                        # whole current branch
node scripts/engineering-os.mjs check-attribution --range main..HEAD     # just this branch
node scripts/engineering-os.mjs check-attribution --max-count 50         # newest 50 commits
node scripts/engineering-os.mjs check-attribution --text "PR title and body"
```

It prints JSON with every finding (`commit`, `field`: author, committer,
message or text, and the matched text) and exits with code 1 when anything is found.

## Fixing your Git identity

If `doctor` reports an AI identity, set your own, for this repository or for
every repository:

```sh
git config user.name "Your Name" && git config user.email "you@example.com"
git config --global user.name "Your Name" && git config --global user.email "you@example.com"
```

## Cleaning up commits that already carry attribution

Rewriting history changes commit hashes. Only do it on branches you own, and
tell anyone who has already pulled them.

**Unpushed commits, or a feature branch only you use** — rewrite the commits
between the base branch and `HEAD`, setting your identity and removing
attribution lines:

```sh
git filter-branch -f \
  --env-filter 'export GIT_AUTHOR_NAME="Your Name" GIT_AUTHOR_EMAIL="you@example.com" GIT_COMMITTER_NAME="Your Name" GIT_COMMITTER_EMAIL="you@example.com"' \
  --msg-filter 'grep -viE "^(co-authored-by:.*(claude|anthropic|openai|copilot|gpt|gemini)|[a-z]+-session:|.*generated (with|by).*(claude|copilot|chatgpt|openai|gemini|codex)|.*claude\.ai/code)" | sed -e :a -e "/^\n*\$/{\$d;N;ba" -e "}"' \
  main..HEAD
node scripts/engineering-os.mjs check-attribution --range main..HEAD   # must report clean
git push --force-with-lease origin HEAD
```

The `--env-filter` above replaces the identity on **every** commit in the range.
If the range contains other people's commits, change only the AI identities instead:

```sh
--env-filter 'case "$GIT_AUTHOR_EMAIL" in *@anthropic.com|*@openai.com) export GIT_AUTHOR_NAME="Your Name" GIT_AUTHOR_EMAIL="you@example.com";; esac
              case "$GIT_COMMITTER_EMAIL" in *@anthropic.com|*@openai.com) export GIT_COMMITTER_NAME="Your Name" GIT_COMMITTER_EMAIL="you@example.com";; esac'
```

**Pull request text** — edit the title and description on GitHub and delete
the attribution lines. The CI check re-runs when a PR is edited.

**The default branch (`main`)** — rewriting it breaks every clone and open
pull request. Agree it with the team first, protect the branch again afterwards,
and use `--force-with-lease`.

**Comments from AI review apps** (for example a code-review bot) are posted by
that app, not by you. Remove them by uninstalling or reconfiguring the app in
the repository's GitHub settings, or delete them one by one as the repo owner.
