# Repository Guidelines

- Repo: https://github.com/openclaw/openclaw
- GitHub issues/comments/PR comments: use literal multiline strings or `-F - <<'EOF'` (or $'...') for real newlines; never embed "\\n".

## Build, Test, and Development Commands

- Runtime: Node **22+**
- Install: `pnpm install` (or `bun install`)
- Build: `pnpm build` (type-check + bundle)
- Lint: `pnpm check` (runs `tsgo`, `lint`, and `format`)
- Fix lint/format: `pnpm lint:fix` (auto-fixes issues)
- Run single test: `pnpm vitest run src/path/to/file.test.ts`
- Run tests: `pnpm test` (parallel via `scripts/test-parallel.mjs`)
- Run tests (watch): `pnpm test:watch`
- Coverage: `pnpm test:coverage`
- E2E tests: `pnpm test:e2e`
- Live tests: `pnpm test:live` (requires API keys)
- Dev CLI: `pnpm openclaw ...` (runs TS directly via tsx)
- Dev gateway: `pnpm gateway:watch` (auto-reload)

## Code Style Guidelines

### Language & Types

- TypeScript (ESM) with strict mode enabled
- Target: ES2023, Module: NodeNext
- Prefer strict typing; avoid `any` (enforced by linter)
- Use `type` imports: `import type { Foo } from "./foo.js"`

### Imports

- Use `.js` extensions for all imports (e.g., `from "./foo.js"`)
- Node built-ins: `import fs from "node:fs/promises"`
- Group imports: 1) node built-ins, 2) external deps, 3) internal modules
- Sorted automatically by `oxfmt` (experimentalSortImports enabled)

### Formatting

- Formatter: `oxfmt` (Oxford formatter)
- Linter: `oxlint` with TypeScript plugin
- Run `pnpm check` before commits
- No semicolons required (follow existing patterns)
- Max line length: follow existing patterns (~100-120 chars)

### Naming Conventions

- Use **OpenClaw** for product/app/docs headings
- Use `openclaw` for CLI command, package/binary, paths, config keys
- Functions: camelCase
- Classes/Types: PascalCase
- Constants: UPPER_SNAKE_CASE for true constants
- Files: kebab-case.ts (e.g., `my-util.test.ts`)

### Error Handling

- Use specific error types when available
- Async errors: always await or handle with try/catch
- Never swallow errors silently

### Testing

- Framework: Vitest with V8 coverage
- Test files: colocated `*.test.ts` (or `*.e2e.test.ts`)
- Coverage thresholds: 70% lines/functions/statements, 55% branches
- Mock with `vi` from vitest
- Use `describe`/`it` pattern with explicit test names

### File Organization

- Keep files under ~500-700 LOC (guideline, not strict)
- Extract helpers instead of creating "V2" copies
- Tests colocated with source files
- CLI wiring in `src/cli`, commands in `src/commands`

### Comments

- Add brief comments for tricky or non-obvious logic
- Avoid redundant comments that repeat the code

## Project Structure

- Source: `src/` (CLI in `src/cli`, commands in `src/commands`)
- Tests: colocated `*.test.ts`
- Extensions: `extensions/*` (workspace packages)
- Docs: `docs/` (Mintlify-hosted)
- Built output: `dist/`

## Commit & PR Guidelines

- Create commits with: `scripts/committer "<msg>" <file...>`
- Commit messages: concise, action-oriented (e.g., `CLI: add verbose flag`)
- Run full gate before commits: `pnpm build && pnpm check && pnpm test`
- Prefer **rebase** for clean history; **squash** when messy
- Add changelog entry with PR # when landing PRs

## Key Configuration Files

- `tsconfig.json`: TypeScript strict config
- `.oxlintrc.json`: Lint rules (no-explicit-any: error)
- `.oxfmtrc.jsonc`: Format config (sorted imports)
- `vitest.config.ts`: Test config with coverage thresholds

## Security & Safety

- Never commit secrets, phone numbers, or live config values
- Use fake placeholders in docs/tests
- DM pairing default is secure (`dmPolicy="pairing"`)
- Run `openclaw doctor` to check configuration

## Multi-Agent Safety

- Do not create/apply/drop `git stash` entries unless requested
- Do not switch branches unless explicitly requested
- Do not create/remove/modify `git worktree` checkouts
- When pushing: `git pull --rebase` first to integrate changes
- Focus reports on your edits; commit only your changes
