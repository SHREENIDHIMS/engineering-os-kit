# Test fixtures

End-to-end tests create temporary Git repositories at runtime under the OS temp
directory. No checked-in fixture repos are required.

Each e2e test:

1. Runs `git init` in a temp folder
2. Runs `init-project` to vendor the kit
3. Exercises the full lifecycle through `scripts/engineering-os.mjs`

See `test/e2e/lifecycle.test.mjs`.
