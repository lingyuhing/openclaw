# Agent Guidelines for OpenClaw

## Quick Commands

```bash
# Setup
pnpm install          # Install dependencies

# Development
pnpm dev             # Run CLI in dev mode
pnpm gateway:watch   # Watch mode for gateway

# Build & Check
pnpm build           # Full build
pnpm tsgo            # TypeScript check only
pnpm check           # Lint + format + type check

# Testing
pnpm test            # Run all tests (parallel)
pnpm test:watch      # Watch mode
pnpm test:coverage   # With coverage

# Single test file:
npx vitest run src/path/to/file.test.ts

# Single test (pattern):
npx vitest run -t "test name pattern"

# Lint/Format
pnpm lint            # Check linting
pnpm lint:fix        # Fix lint issues
pnpm format          # Check formatting
pnpm format:fix      # Fix formatting
```

## Code Style Guidelines

### Language & Types
- **TypeScript (ESM)** - strict mode enabled, avoid `any`
- Use explicit types for function parameters and return types
- Prefer `interface` over `type` for object shapes
- Use discriminated unions for state machines

### Imports & Module Structure
```typescript
// Order: external libs -> internal modules -> relative imports
import { something } from "external-lib";
import { util } from "@/utils/helpers";  // use path aliases
import { local } from "./local-file";

// ESM imports for JSON/assertions:
import pkg from "./package.json" with { type: "json" };
```

### Naming Conventions
- **Files**: kebab-case (`my-util.ts`), colocated tests (`*.test.ts`)
- **Classes/PascalCase**, **functions/variables camelCase**
- **Constants**: `SCREAMING_SNAKE_CASE` for true constants
- **Private members**: prefix with `_` or use `#` for hard private

### Formatting (Oxfmt/Oxlint)
- 2 spaces indentation
- 80-100 char line limit (be reasonable)
- Semicolons required
- Single quotes for strings (except template literals)
- Trailing commas in multiline

### Error Handling
```typescript
// Use custom error types for domain errors
import { OpenClawError } from "@/errors";

// Async: always await, handle with try/catch
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

// Prefer Result<T, E> pattern for expected failures
```

### Testing Guidelines
- **Framework**: Vitest (compatible with Jest expect syntax)
- **Location**: Colocated `*.test.ts` next to source files
- **Naming**: describe/it blocks should read like sentences
- **Coverage**: Maintain >70% threshold

```typescript
import { describe, it, expect, vi } from "vitest";
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

### Tool Schema Guidelines (for MCP/Agent Tools)
- Avoid `Type.Union` in tool schemas - use `stringEnum`/`optionalStringEnum`
- Keep top-level schema as `type: "object"` with `properties`
- Avoid raw `format` property names (reserved keyword issues)
- Use `Type.Optional(...)` instead of `... | null`

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
  
extensions/     # Plugin packages (workspace)
skills/         # Built-in skills
docs/           # Documentation
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
