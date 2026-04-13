# AnetsTerminal

An embeddable, lightweight web-based terminal emulator with xterm.js-like features. Zero dependencies, Canvas-based rendering, full ANSI color support.

## Features

- 🎨 **Full ANSI Color Support** — 16-color, 256-color, and true color (RGB)
- 📺 **Canvas-based Rendering** — High-performance HTML5 Canvas renderer with HiDPI support
- ⌨️ **Complete Input Handling** — Keyboard, mouse selection, scrollback navigation
- 📜 **ANSI Escape Sequences** — CSI, OSC, ESC sequences (cursor movement, colors, scrolling, modes)
- 🔄 **Scrollback Buffer** — Configurable scrollback with mouse wheel navigation
- 🖱️ **Mouse Selection** — Click, drag, and double-click word selection with clipboard support
- 🎯 **Multiple Cursor Styles** — Block, underline, and bar cursors with blink support
- 🌈 **Built-in Themes** — Default, One Dark, Solarized Dark, Dracula
- 🔌 **Backend Connectors** — WebSocket backend and extensible `BaseBackend` class
- 📦 **Zero Dependencies** — No external runtime dependencies
- 📐 **Resizable** — Dynamic terminal resizing
- ♿ **Accessible** — Screen reader support via hidden textarea

## Quick Start

### Installation

```bash
npm install anets-terminal
```

### Basic Usage

```typescript
import { AnetsTerminal, TerminalEvent } from 'anets-terminal';

const term = new AnetsTerminal({
  cols: 80,
  rows: 24,
  cursorBlink: true,
});

// Mount to DOM
term.open(document.getElementById('terminal-container'));

// Write output
term.write('\x1b[32mHello, World!\x1b[0m\r\n');

// Handle user input
term.on(TerminalEvent.Data, (data) => {
  console.log('User typed:', data);
});
```

### Via CDN / Script Tag

```html
<script src="anets-terminal.js"></script>
<script>
  const term = new AnetsTerminal.AnetsTerminal({ cols: 80, rows: 24 });
  term.open(document.getElementById('terminal'));
</script>
```

### WebSocket Backend

```typescript
import { AnetsTerminal, WebSocketBackend, TerminalEvent } from 'anets-terminal';

const term = new AnetsTerminal();
term.open(container);

const ws = new WebSocket('ws://localhost:8080');
const backend = new WebSocketBackend(term, ws);
backend.attach();

// Or use the shortcut:
// const backend = attachWebSocket(term, 'ws://localhost:8080');
```

### Custom Backend

```typescript
import { AnetsTerminal, BaseBackend, TerminalEvent } from 'anets-terminal';

class MyCustomBackend extends BaseBackend {
  protected onInput(data: string): void {
    // Process user input - send to your API, IPC, etc.
    myApi.send(data);
  }

  // Call this.write() when you receive output
  onOutput(data: string): void {
    this.write(data);
  }
}

const term = new AnetsTerminal();
term.open(container);

const backend = new MyCustomBackend();
backend.attach(term);
```

## API Reference

### `AnetsTerminal`

| Method / Property | Description |
|---|---|
| `new AnetsTerminal(options?)` | Create a new terminal instance |
| `open(container)` | Mount the terminal to a DOM element |
| `write(data)` | Write string or Uint8Array to the terminal |
| `writeln(data)` | Write data with line ending |
| `on(event, callback)` | Register an event handler |
| `off(event, callback)` | Remove an event handler |
| `focus()` | Focus the terminal |
| `blur()` | Blur the terminal |
| `resize(cols, rows)` | Resize the terminal |
| `clear()` | Clear the terminal buffer |
| `reset()` | Reset to initial state |
| `dispose()` | Clean up and remove from DOM |
| `setTheme(theme)` | Set the color theme |
| `setFont(family?, size?)` | Set the font |
| `scrollTo(offset)` | Scroll to scrollback position |
| `scrollToBottom()` | Scroll to the bottom |
| `getSelection()` | Get selected text |
| `clearSelection()` | Clear current selection |
| `cols` | Number of columns |
| `rows` | Number of rows |
| `cursorX` | Cursor X position |
| `cursorY` | Cursor Y position |
| `title` | Current terminal title |
| `scrollOffset` | Current scroll offset |
| `isFocused` | Whether terminal is focused |

### `TerminalOptions`

| Option | Type | Default | Description |
|---|---|---|---|
| `cols` | `number` | `80` | Number of columns |
| `rows` | `number` | `24` | Number of rows |
| `fontFamily` | `string` | `'Courier New, monospace'` | Font family |
| `fontSize` | `number` | `15` | Font size in pixels |
| `lineHeight` | `number` | `1.2` | Line height multiplier |
| `letterSpacing` | `number` | `0` | Letter spacing in pixels |
| `scrollback` | `number` | `1000` | Scrollback buffer size |
| `theme` | `Partial<TerminalTheme>` | `{}` | Color theme |
| `cursorStyle` | `'block'\|'underline'\|'bar'` | `'block'` | Cursor style |
| `cursorBlink` | `boolean` | `true` | Cursor blink |
| `focusOnOpen` | `boolean` | `false` | Focus on open |
| `wordSeparators` | `string` | `' ()[]{}\'"` | Word boundary chars |

### `TerminalEvent`

| Event | Description |
|---|---|
| `Data` | User input data |
| `Resize` | Terminal resized |
| `Title` | Title changed (OSC 0/2) |
| `Bell` | Bell triggered |
| `Focus` | Terminal focused |
| `Blur` | Terminal blurred |
| `Selection` | Text selected |
| `Scroll` | Scrollback changed |
| `LineFeed` | Line feed executed |

### Themes

```typescript
import { DEFAULT_THEME, ONE_DARK_THEME, SOLARIZED_DARK_THEME, DRACULA_THEME, mergeTheme } from 'anets-terminal';

// Use a built-in theme
term.setTheme(ONE_DARK_THEME);

// Create a custom theme (partial, merged with defaults)
term.setTheme({
  background: '#1e1e2e',
  foreground: '#cdd6f4',
  cursor: '#f5e0dc',
  green: '#a6e3a1',
});
```

## Architecture

```
┌─────────────────────────────────────────┐
│              AnetsTerminal              │
│  (Public API, Event System, Modes)      │
├──────────────┬──────────────────────────┤
│  AnsiParser  │       Buffer             │
│  (State      │  (Cell Grid, Scrolling,  │
│   Machine)   │   Scrollback)            │
├──────────────┼──────────────────────────┤
│ InputHandler │       Renderer           │
│ (Keyboard,   │  (Canvas 2D, Cursor,     │
│  Mouse,      │   Selection, Colors)     │
│  Selection)  │                          │
├──────────────┴──────────────────────────┤
│           Backend Interface             │
│  (WebSocket, BaseBackend, Custom)       │
└─────────────────────────────────────────┘
```

## Development

```bash
# Install dependencies
npm install

# Build for distribution
npm run build

# Build demo
npm run build:demo

# Watch mode for development
npm run dev

# Type check
npm run typecheck
```

## Demo

Open `demo/index.html` in a browser to see the terminal in action with a simulated shell that includes:

- Command history (up/down arrows)
- Tab completion
- ANSI color demos (`colors` command)
- ASCII art (`banner`, `cowsay`, `neofetch`)
- Matrix rain effect (`matrix` command)
- Theme switching
- Terminal resizing

## License

MIT