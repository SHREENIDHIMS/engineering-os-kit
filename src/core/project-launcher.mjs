export const launcherScript = `#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configPath = path.join(projectRoot, '.engineering-os', 'config.json');

if (!existsSync(configPath)) {
  process.stderr.write('Engineering OS not initialized. Run: node scripts/engineering-os.mjs init-project\\n');
  process.exit(1);
}

const config = JSON.parse(readFileSync(configPath, 'utf8'));
const cli = path.join(projectRoot, config.kitPath, 'src', 'cli.mjs');

if (!existsSync(cli)) {
  process.stderr.write(\`Engineering OS kit missing at \${config.kitPath}. Re-run init-project.\\n\`);
  process.exit(1);
}

const args = process.argv.slice(2);
if (!args.some((arg, index) => arg === '--target' || args[index - 1] === '--target')) {
  args.push('--target', projectRoot);
}

const result = spawnSync(process.execPath, [cli, ...args], { stdio: 'inherit', cwd: projectRoot });
process.exit(result.status ?? 1);
`;

export const launcherPs1 = `param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Arguments
)

$ProjectRoot = Split-Path -Parent $PSScriptRoot
& node (Join-Path $ProjectRoot 'scripts/engineering-os.mjs') @Arguments
exit $LASTEXITCODE
`;
