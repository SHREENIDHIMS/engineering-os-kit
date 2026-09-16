# Install from GitHub on any new project

## How paths work (important)

When you run `init-project` on a new Git repository, the kit **copies itself into that project**. Nothing stays hardcoded to your laptop path.

```text
my-new-app/                          ← your new project (any path, any machine)
  scripts/engineering-os.mjs         ← launcher (auto-targets THIS project)
  scripts/engineering-os.ps1
  .engineering-os/
    config.json                      ← points to vendored kit inside this repo
    kit/                             ← copy of the CLI (src/, schemas/)
    MISTAKES.md / LESSONS_LEARNED.md
    tasks/ incidents/ lessons/ ...
  .claude/agents/                    ← copied if --adapter claude (default)
  AGENTS.md                          ← managed contract appended once
  .github/workflows/engineering-os.yml
```

Every `path:line` reference is **relative to the new project's Git root**, not the kit repo.

## Step 1 — Push the kit to GitHub

```powershell
cd C:\path\to\ultimate-claude-harness
git init
git add .
git commit -m "Engineering OS kit"
git remote add origin https://github.com/YOU/engineering-os-kit.git
git push -u origin main
```

## Step 2 — Clone the kit on any machine

```powershell
git clone https://github.com/YOU/engineering-os-kit.git
cd engineering-os-kit
npm test
```

## Step 3 — Create or open your new project

```powershell
mkdir C:\projects\my-new-app
cd C:\projects\my-new-app
git init
```

## Step 4 — Install into the new project (one command)

From the cloned kit directory:

```powershell
node src/cli.mjs init-project --target C:\projects\my-new-app
```

Or from inside the new project if kit is on PATH:

```powershell
node C:\path\to\engineering-os-kit\src\cli.mjs init-project --target .
```

## Step 5 — Use commands from the new project root

All commands auto-target the project you are in:

```powershell
cd C:\projects\my-new-app
node scripts/engineering-os.mjs start-task --title "First feature" --owner code-builder --acceptance "tests pass"
node scripts/engineering-os.mjs pre-task-check
```

No `--target` needed when using `scripts/engineering-os.mjs`.

## Moving machines or teammates

1. Clone **your app repo** (which now contains `.engineering-os/kit/` and `scripts/`).
2. Run commands with `node scripts/engineering-os.mjs` — paths still work.
3. To upgrade the kit, re-run `init-project` from a newer kit clone (idempotent; skips existing files).

## Optional: kit as submodule

```powershell
cd my-new-app
git submodule add https://github.com/YOU/engineering-os-kit.git tools/engineering-os-kit
node tools/engineering-os-kit/src/cli.mjs init-project --target .
```

After init, the project is self-contained; the submodule is optional for upgrades.
