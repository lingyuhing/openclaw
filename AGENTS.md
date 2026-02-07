# Agent Guidelines for OpenClaw

## Quick Commands

### Setup & Development

```bash
pnpm install          # Install dependencies
pnpm dev             # Run CLI in dev mode
pnpm gateway:watch   # Watch mode for gateway
pnpm openclaw        # Run the CLI
```

### Build & Check

```bash
pnpm build           # Full build
pnpm tsgo            # TypeScript check only
pnpm check           # Lint + format + type check
```

### Testing

```bash
pnpm test                    # Run all tests (parallel)
pnpm test:watch             # Watch mode
pnpm test:coverage          # With coverage
pnpm test:e2e               # E2E tests
pnpm test:live              # Live integration tests

# Single test file:
npx vitest run src/path/to/file.test.ts

# Single test by name:
npx vitest run -t "should handle valid input"
```

### Lint/Format

```bash
pnpm lint            # Check linting (oxlint)
pnpm lint:fix        # Fix lint issues
pnpm format          # Check formatting (oxfmt)
pnpm format:fix      # Fix formatting
```

### Mobile Development

```bash
pnpm ios:build       # Build iOS app
pnpm ios:run         # Run iOS simulator
pnpm mac:package     # Package macOS app
pnpm android:run     # Run Android app
```

## Code Style Guidelines

### Language & Types

- **TypeScript (ESM)** - strict mode, avoid `any`
- Explicit types for function parameters and return types
- Prefer `interface` over `type` for object shapes
- Use discriminated unions for state machines

### Imports & Module Structure

```typescript
// Order: external -> internal -> relative
import { something } from "external-lib";
import { util } from "@/utils/helpers";
import { local } from "./local-file";

// ESM JSON imports:
import pkg from "./package.json" with { type: "json" };
```

### Naming Conventions

- **Files**: kebab-case (`my-util.ts`), colocated tests (`*.test.ts`)
- **Classes/PascalCase**, **functions/variables camelCase**
- **Constants**: `SCREAMING_SNAKE_CASE`
- **Private members**: prefix with `_` or use `#`

### Formatting (Oxfmt/Oxlint)

- 2 spaces indentation
- 80-100 char line limit
- Semicolons required
- Single quotes for strings
- Trailing commas in multiline

### Error Handling

```typescript
import { OpenClawError } from "@/errors";

async function doWork(): Promise<Result> {
  try {
    return await riskyOperation();
  } catch (error) {
    if (error instanceof KnownError) {
      // handle specific
    }
    throw new OpenClawError("context", { cause: error });
  }
}
```

### Testing Guidelines

- **Framework**: Vitest (Jest-compatible)
- **Location**: Colocated `*.test.ts` next to source files
- **Naming**: describe/it blocks should read like sentences
- **Coverage**: Maintain >70% threshold

```typescript
import { describe, it, expect } from "vitest";
import { myFunction } from "./my-module";

describe("myModule", () => {
  it("should handle valid input correctly", async () => {
    const result = await myFunction("test");
    expect(result).toEqual({ success: true });
  });

  it("should throw on invalid input", async () => {
    await expect(myFunction(null)).rejects.toThrow();
  });
});
```

### Tool Schema Guidelines

- Avoid `Type.Union` in tool schemas - use `stringEnum`
- Keep top-level schema as `type: "object"` with `properties`
- Avoid raw `format` property names (reserved keyword issues)
- Use `Type.Optional(...)` instead of `... | null`

### i18n Guidelines

Use the translation function for user-facing strings:

```typescript
import { t } from "../cli/i18n-runtime.js";

prompter.confirm({ message: t("onboard.channels.configureNow") });
```

## Project Structure

```
src/
  cli/          # CLI wiring and commands
  commands/     # Command implementations
  gateway/      # Gateway server, protocol, WebSocket
  agents/       # Agent runtime and tools
  channels/     # Messaging channel adapters
  infra/        # Infrastructure and utilities
  media/        # Media pipeline
  i18n/         # Internationalization

extensions/     # Plugin packages (workspace)
skills/         # Built-in skills
docs/           # Documentation
apps/           # iOS, macOS, Android apps
```

## Pre-commit Checklist

Before committing, run:

```bash
pnpm check       # Runs: tsgo + lint + format
pnpm test        # Run tests
```

For quick iteration, use:

```bash
pnpm test:watch  # Watch mode for tests
```

## Multi-Agent Safety

- Do not create/apply/drop `git stash` entries unless explicitly requested
- Do not create/remove/modify `git worktree` checkouts unless explicitly requested
- Do not switch branches unless explicitly requested
- When user says "push", do `git pull --rebase` first to integrate changes
- When user says "commit", scope to your changes only
- When user says "commit all", commit everything in grouped chunks
