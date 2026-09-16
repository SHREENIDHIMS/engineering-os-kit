---
name: external-repo-vetting
description: Focused workflow for external repo vetting.
---

# external-repo-vetting

## When to use

Use before **vendoring, submodule-ing, cloning for reuse, or installing** an external repository, CLI, or agent skill from outside the organization.

## Procedure

1. Record source URL, pinned commit/tag, and stated purpose — reject "latest main" without a SHA for production paths.
2. Clone to an isolated temp directory (never directly into the project tree until vetted).
3. Read `LICENSE`, `README`, and `SECURITY`/`CONTRIBUTING` if present — confirm license compatibility with this project.
4. Inspect install surfaces: `package.json` scripts, `Makefile`, `setup.py`, shell hooks, GitHub Actions, and postinstall/prepare scripts.
5. Grep for risky patterns: `curl|wget|eval|exec|child_process|subprocess|Invoke-WebRequest`, hardcoded endpoints, credential reads.
6. Map transitive dependencies (lockfiles, `requirements.txt`, `go.mod`) and flag packages with binary downloads or broad filesystem access.
7. If approved for integration, record vetting proof and pin the SHA in project docs or lock metadata; run `node scripts/engineering-os.mjs check-project-safety --target .` after adding paths.

## Exit criteria

- License and provenance clear; incompatible licenses blocked.
- No unreviewed install hooks, arbitrary shell execution, or exfiltration endpoints.
- Pinned commit/tag recorded — floating references rejected for production integration.
- Integration boundary documented (which files import/call the external code and with what permissions).
