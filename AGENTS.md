# deskflow Agent Rules

## Workspace rule source

Before applying these repository-specific rules, read the workspace-wide rules at `..\workspace-docs\00-governance\00-unified-rules.md` (from the workspace root: `workspace-docs/00-governance/00-unified-rules.md`). They define cross-tool ownership, data boundaries, numbering, Bug/讨论记录 and rule precedence. This file only adds constraints specific to the public `deskflow` repository.

## Project role

`tri-mode` is the public frontend repository for the NO.1 3mode workbench. Its local checkout is `F:\NO.1 3mode\deskflow`. It contains code, non-sensitive contracts, fixtures and tests. The private Obsidian Vault, API keys, local databases, logs and original media are outside this repository.

## Current phase

This repository is a v0-generated Next.js UI prototype. Keep the existing visual structure while separating hardcoded data from components. Do not treat v0 mock data, Server Actions or Vercel deployment behavior as the final backend.

## Working rules

1. Read the task note, `docs/contracts`, and the relevant workspace document before editing.
2. Claude Code is the default implementation owner in VS Code. One task has one owner and one branch. Codex reviews and integrates; never silently overwrite another agent's changes.
3. Define or update the API contract before changing cross-module data.
4. Use typed ViewModel adapters between API responses and UI components.
5. Every long-running action needs loading, paused, offline, failed, retryable and permission states.
6. Never write API keys, private conversations, local absolute paths or personal data into the repository.
7. Do not claim that an AI generation, test, build or deployment happened unless it was actually run.

## Preferred implementation order

```text
contract → types → Mock API → ViewModel Adapter → UI state → real service → tests
```

## Validation

At minimum run the project's build and type checks. For user-facing pages also verify keyboard focus, 1440x900 and 1280x800 layouts, empty/offline/error states and the active task controls.

## Handoff

Report changed files, API changes, commands run, test results, unresolved risks and whether an Obsidian Error Card, Decision or Skill Candidate should be created.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
