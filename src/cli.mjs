#!/usr/bin/env node
// Engineering OS CLI entry point. Command implementations live in src/commands/.
import { commands, helpText } from './commands/index.mjs';

const booleanFlags = new Set(['--apply', '--allow-no-active-task', '--replace', '--auto-init', '--dry-run']);

function parseArguments(values) {
  const result = { _: [] };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith('--')) result._.push(value);
    else if (booleanFlags.has(value)) result[value.slice(2)] = true;
    else {
      const key = value.slice(2);
      const next = values[index + 1];
      if (!next || next.startsWith('--')) throw new Error(`Missing value for ${value}`);
      result[key] = next;
      index += 1;
    }
  }
  return result;
}

const [command = 'help', ...values] = process.argv.slice(2);
try {
  if (command === 'help' || command === '--help' || command === '-h') process.stdout.write(helpText());
  else {
    const handler = commands[command];
    if (!handler) throw new Error(`Unknown command: ${command}. Run "help" for the list.`);
    handler(parseArguments(values));
  }
} catch (error) {
  process.stderr.write(`Engineering OS error: ${error.message}\n`);
  process.exitCode = 1;
}
