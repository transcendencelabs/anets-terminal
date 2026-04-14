# AGENTS.md - AI Agent Guidelines for AnetsTerminal

## Project Overview

**AnetsTerminal** is a zero-dependency, embeddable web-based terminal emulator built with TypeScript. It renders on an HTML5 Canvas and supports full ANSI escape sequences (16-color, 256-color, true color RGB), scrollback, mouse selection, and xterm.js-compatible APIs.

**npm:** `anets-terminal` | **Size:** ~85KB minified | **Dependencies:** Zero

## Stack Specification

- **Language:** TypeScript 5.8
- **Target:** ES2020, DOM
- **Bundler:** esbuild 0.25+
- **Module System:** ESNext (source), IIFE + ESM (output)
- **Runtime:** Browser (Canvas API)
- **Package Manager:** npm

## Core Commands

```bash
npm install          # Install dev dependencies
npm run build        # Build for distribution (IIFE + ESM + types)
npm run build:demo   # Build demo bundle
npm run dev          # Watch mode for development
npm run typecheck    # TypeScript type check
npm test             # (Future) Run test suite
npm run lint         # (Future) Run linter
npm run format       # (Future) Format code with Prettier
```

## Repository Structure

```
anets-terminal/
├── src/                    # Source code (TypeScript)
│   ├── index.ts            # Public API exports
│   ├── Terminal.ts         # Main terminal class (~1100 lines)
│   ├── Buffer.ts           # Character buffer with scrollback
│   ├── AnsiParser.ts       # ANSI escape sequence parser
│   ├── Renderer.ts         # Canvas 2D renderer
│   ├── InputHandler.ts     # Keyboard/mouse input handling
│   ├── Theme.ts            # Color themes
│   ├── Backend.ts          # WebSocket/custom backends
│   ├── Types.ts            # Type definitions
│   └── PopularFonts.ts     # Monospace font catalog
├── demo/                   # Interactive demo page
│   ├── index.html          # Demo HTML page
│   └── logo.png            # Logo asset
├── docs/                   # Documentation
│   ├── HOWTO/              # Step-by-step guides
│   │   ├── 01-getting-started.md
│   │   ├── 02-typescript-setup.md
│   │   ├── 03-websocket-backend.md
│   │   ├── 04-themes.md
│   │   ├── 05-custom-backend.md
│   │   ├── 06-advanced-features.md
│   │   └── index.md
│   └── images/             # Documentation images
├── dist/                   # Build output (DO NOT EDIT)
├── AGENTS.md               # This file
├── README.md               # Human-facing documentation
├── LICENSE                 # MIT License
├── package.json            # Package manifest
└── tsconfig.json           # TypeScript configuration
```

## Coding Style & Constraints

### Do Not Touch
- `/dist/` - Build output, always regenerated
- `/node_modules/` - Dependencies
- `.gitignore`, `.cursorignore` - Configuration files

### Naming Conventions
- **Classes:** PascalCase (`AnetsTerminal`, `AnsiParser`)
- **Interfaces:** PascalCase with `I` prefix (`IBuffer`)
- **Types:** PascalCase (`TerminalColor`, `TerminalTheme`)
- **Enums:** PascalCase (`TerminalEvent`, `EraseMode`)
- **Functions/Methods:** camelCase (`_handleSGR`, `getCell`)
- **Private members:** `_` prefix (`_cursorX`, `_buffer`)
- **Constants:** UPPER_SNAKE_CASE (`DEFAULT_THEME`)

### Code Style
- 2-space indentation
- Single quotes for strings (TypeScript convention)
- Semicolons required
- Arrow functions preferred for callbacks
- No default exports (use named exports)
- Type annotations required for function parameters and returns

### Architecture Patterns
- Event-driven architecture with `TerminalEvent` enum
- Parser pattern for ANSI escape sequences
- Strategy pattern for backends (`BaseBackend` abstract class)
- Composition over inheritance

## File Locations

| What | Where |
|------|-------|
| Main terminal class | `src/Terminal.ts` |
| Buffer management | `src/Buffer.ts` |
| ANSI parsing | `src/AnsiParser.ts` |
| Canvas rendering | `src/Renderer.ts` |
| Input handling | `src/InputHandler.ts` |
| Type definitions | `src/Types.ts` |
| Theme definitions | `src/Theme.ts` |
| Backend connectors | `src/Backend.ts` |
| Public API exports | `src/index.ts` |
| Demo page | `demo/index.html` |

## Testing

When adding features:
1. Test manually via `demo/index.html`
2. Type check with `npm run typecheck`
3. Build succeeds with `npm run build`
4. Add demo commands in `demo/index.html` for testing

## PR Workflow

- Always create draft PRs for review
- Never push directly to `main`
- Include summary of changes in PR description
- Link to relevant TODO or issue
- Test in demo before submitting

## Versioning

- Semantic versioning (MAJOR.MINOR.PATCH)
- Version in `package.json` is source of truth
- Update version before publishing to npm
- Tag releases on GitHub

## Publishing

```bash
npm run build          # Build first
npm version patch|minor|major   # Bump version
npm login              # Authenticate
npm publish --access public
git push --follow-tags