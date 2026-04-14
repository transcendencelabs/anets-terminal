# Themes and Styling

## Built-in Themes

AnetsTerminal ships with 4 built-in themes:

```typescript
import { 
  AnetsTerminal,
  DEFAULT_THEME,
  ONE_DARK_THEME,
  SOLARIZED_DARK_THEME,
  DRACULA_THEME 
} from 'anets-terminal';

// Use a theme at creation
const term = new AnetsTerminal({ theme: ONE_DARK_THEME });
term.open(document.getElementById('terminal'));
```

## Available Themes

| Theme | Description |
|-------|-------------|
| `DEFAULT_THEME` | Classic dark terminal |
| `ONE_DARK_THEME` | Atom One Dark inspired |
| `SOLARIZED_DARK_THEME` | Solarized dark palette |
| `DRACULA_THEME` | Dracula theme colors |

## Create Custom Themes

### Partial Theme (Recommended)

Only specify the colors you want to change:

```typescript
const term = new AnetsTerminal({
  theme: {
    background: '#1e1e2e',
    foreground: '#cdd6f4',
    cursor: '#f5e0dc',
    green: '#a6e3a1',
    red: '#f38ba8',
  },
});
```

Unspecified colors will use the defaults.

### Full Theme

Define all colors explicitly:

```typescript
import { TerminalTheme } from 'anets-terminal';

const myTheme: TerminalTheme = {
  background: '#0d1117',
  foreground: '#c9d1d9',
  cursor: '#58a6ff',
  cursorAccent: '#0d1117',
  selectionBackground: '#264f78',
  selectionForeground: '#c9d1d9',
  // Standard colors (0-7)
  black: '#0d1117',
  red: '#ff7b72',
  green: '#7ee787',
  yellow: '#e3b341',
  blue: '#58a6ff',
  magenta: '#d2a8ff',
  cyan: '#79c0ff',
  white: '#c9d1d9',
  // Bright colors (8-15)
  brightBlack: '#484f58',
  brightRed: '#ffa198',
  brightGreen: '#56d364',
  brightYellow: '#e3b341',
  brightBlue: '#58a6ff',
  brightMagenta: '#d2a8ff',
  brightCyan: '#79c0ff',
  brightWhite: '#f0f6fc',
};

const term = new AnetsTerminal({ theme: myTheme });
```

## Change Theme at Runtime

```typescript
import { ONE_DARK_THEME, DRACULA_THEME } from 'anets-terminal';

const term = new AnetsTerminal();
term.open(container);

// Switch themes dynamically
button.onclick = () => {
  term.setTheme(DRACULA_THEME);
};
```

## Theme Switcher Example

```typescript
import { 
  AnetsTerminal, 
  DEFAULT_THEME, 
  ONE_DARK_THEME, 
  SOLARIZED_DARK_THEME, 
  DRACULA_THEME 
} from 'anets-terminal';

const themes = {
  default: DEFAULT_THEME,
  'one-dark': ONE_DARK_THEME,
  solarized: SOLARIZED_DARK_THEME,
  dracula: DRACULA_THEME,
};

const term = new AnetsTerminal({ theme: DEFAULT_THEME });
term.open(document.getElementById('terminal'));

// Create a theme selector dropdown
const selector = document.createElement('select');
Object.keys(themes).forEach(name => {
  const option = document.createElement('option');
  option.value = name;
  option.textContent = name;
  selector.appendChild(option);
});

selector.onchange = (e) => {
  const themeName = (e.target as HTMLSelectElement).value;
  term.setTheme(themes[themeName]);
};

document.body.prepend(selector);
```

## mergeTheme Utility

Merge a partial theme with defaults:

```typescript
import { mergeTheme, DEFAULT_THEME } from 'anets-terminal';

// Merge partial into defaults
const customTheme = mergeTheme({
  background: '#1a1a2e',
  foreground: '#eaeaea',
});

// Get a specific color
console.log(customTheme.red); // Uses default since not overridden
```

## Popular Color Palettes

### Catppuccin Mocha

```typescript
term.setTheme({
  background: '#1e1e2e',
  foreground: '#cdd6f4',
  cursor: '#f5e0dc',
  black: '#45475a',
  red: '#f38ba8',
  green: '#a6e3a1',
  yellow: '#f9e2af',
  blue: '#89b4fa',
  magenta: '#f5c2e7',
  cyan: '#94e2d5',
  white: '#cdd6f4',
  brightBlack: '#585b70',
  brightRed: '#f38ba8',
  brightGreen: '#a6e3a1',
  brightYellow: '#f9e2af',
  brightBlue: '#89b4fa',
  brightMagenta: '#f5c2e7',
  brightCyan: '#94e2d5',
  brightWhite: '#a6adc8',
});
```

### Tokyo Night

```typescript
term.setTheme({
  background: '#1a1b26',
  foreground: '#a9b1d6',
  cursor: '#c0caf5',
  black: '#32344a',
  red: '#f7768e',
  green: '#9ece6a',
  yellow: '#e0af68',
  blue: '#7aa2f7',
  magenta: '#bb9af7',
  cyan: '#7dcfff',
  white: '#a9b1d6',
  brightBlack: '#414868',
  brightRed: '#f7768e',
  brightGreen: '#9ece6a',
  brightYellow: '#e0af68',
  brightBlue: '#7aa2f7',
  brightMagenta: '#bb9af7',
  brightCyan: '#7dcfff',
  brightWhite: '#c0caf5',
});
```

### Gruvbox Dark

```typescript
term.setTheme({
  background: '#282828',
  foreground: '#ebdbb2',
  cursor: '#ebdbb2',
  black: '#282828',
  red: '#cc241d',
  green: '#98971a',
  yellow: '#d79921',
  blue: '#458588',
  magenta: '#b16286',
  cyan: '#689d6a',
  white: '#a89984',
  brightBlack: '#928374',
  brightRed: '#fb4934',
  brightGreen: '#b8bb26',
  brightYellow: '#fabd2f',
  brightBlue: '#83a598',
  brightMagenta: '#d3869b',
  brightCyan: '#8ec07c',
  brightWhite: '#ebdbb2',
});