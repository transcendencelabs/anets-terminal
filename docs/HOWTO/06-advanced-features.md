# Advanced Features

## Resize Handling

### Programmatic Resize

```typescript
const term = new AnetsTerminal({ cols: 80, rows: 24 });
term.open(document.getElementById('terminal'));

// Resize to 120 columns, 40 rows
term.resize(120, 40);
```

### Responsive Resize

```typescript
const term = new AnetsTerminal();
term.open(document.getElementById('terminal'));

function resizeToContainer() {
  const container = document.getElementById('terminal');
  const { width, height } = container.getBoundingClientRect();
  
  // Calculate cols/rows based on cell size
  const cellWidth = 9;  // Approximate
  const cellHeight = 18; // Approximate
  
  const cols = Math.floor(width / cellWidth);
  const rows = Math.floor(height / cellHeight);
  
  term.resize(cols, rows);
}

window.addEventListener('resize', resizeToContainer);
```

## ANSI Escape Sequences

### Cursor Movement

```typescript
// Move up 2 rows
term.write('\x1b[2A');

// Move down 1 row
term.write('\x1b[1B');

// Move right 5 columns
term.write('\x1b[5C');

// Move left 3 columns
term.write('\x1b[3D');

// Move to row 5, column 10
term.write('\x1b[5;10H');

// Move to beginning of line
term.write('\x1b[0G');
```

### Erasing

```typescript
// Clear from cursor to end of screen
term.write('\x1b[0J');

// Clear from start to cursor
term.write('\x1b[1J');

// Clear entire screen
term.write('\x1b[2J');

// Clear from cursor to end of line
term.write('\x1b[0K');

// Clear entire line
term.write('\x1b[2K');
```

### Cursor Visibility

```typescript
// Show cursor
term.write('\x1b[?25h');

// Hide cursor
term.write('\x1b[?25l');
```

### Alternate Screen Buffer

```typescript
// Switch to alternate screen (like vim does)
term.write('\x1b[?1049h');

// Switch back to main screen
term.write('\x1b[?1049l');
```

## Scrollback

### Programmatic Scroll

```typescript
// Create with scrollback
const term = new AnetsTerminal({ scrollback: 5000 });

// Scroll to top
term.scrollTo(Infinity);

// Scroll to bottom
term.scrollToBottom();

// Get current scroll offset
console.log(term.scrollOffset);
```

### Scroll Event

```typescript
term.on(TerminalEvent.Scroll, (offset: number) => {
  console.log('Scrolled to offset:', offset);
});
```

## Selection

### Get Selection

```typescript
// Get selected text
const selected = term.getSelection();

if (selected) {
  console.log('Selected:', selected);
}
```

### Clear Selection

```typescript
term.clearSelection();
```

### Select All Programmatically

```typescript
// Not built-in, but you can use execCommand on the terminal's textarea
term.focus();
document.execCommand('selectAll');
```

## Window Title

### Set Title via OSC

```typescript
// The terminal will emit the Title event when OSC is received
term.on(TerminalEvent.Title, (title: string) => {
  document.title = title;
});

// Send OSC to set title
term.write('\x1b]0;My Terminal Title\x1b\\');
```

## Key Bindings

The terminal automatically maps standard keys:

| Key | Sequence |
|-----|----------|
| Enter | `\r` |
| Backspace | `\x7f` |
| Tab | `\t` |
| Escape | `\x1b` |
| Ctrl+C | `\x03` |
| Ctrl+D | `\x04` |
| Ctrl+L | `\x0c` |
| Arrow Up | `\x1b[A` |
| Arrow Down | `\x1b[B` |
| F1 | `\x1bOP` |
| Delete | `\x1b[3~` |

## Font Customization

### Built-in Font List

```typescript
import { POPULAR_MONOSPACE_FONTS, FONT_CATALOG } from 'anets-terminal';

// All 50 popular fonts
console.log(POPULAR_MONOSPACE_FONTS);

// Curated list with descriptions
console.log(FONT_CATALOG);
```

### Load Google Fonts

```html
<!-- In HTML head -->
<link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;700&display=swap" rel="stylesheet">

<script>
import { AnetsTerminal } from 'anets-terminal';

const term = new AnetsTerminal({
  fontFamily: "'Fira Code', monospace",
  fontSize: 15,
});
</script>
```

### Font Demo

```typescript
import { FONT_CATALOG } from 'anets-terminal';

const term = new AnetsTerminal({ cols: 80, rows: 30 });
term.open(document.getElementById('terminal'));

term.write('\x1b[1mFont Showcase\x1b[0m\r\n\r\n');

FONT_CATALOG.forEach(font => {
  term.setFont(font.fallback);
  term.write(`\x1b[36m${font.name}\x1b[0m — ${font.description}\r\n`);
});
```

## Performance Tips

### Batch Writes

```typescript
// Bad: Many small writes
for (let i = 0; i < 100; i++) {
  term.write(`Line ${i}\r\n`);
}

// Good: Single batch write
const lines = Array.from({ length: 100 }, (_, i) => `Line ${i}\r\n`);
term.write(lines.join(''));
```

### Use Uint8Array for Binary

```typescript
// Efficient for large data
const data = new Uint8Array([...]);
term.write(data);
```

### Debounce Resize

```typescript
let resizeTimeout: ReturnType<typeof setTimeout>;

window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(resizeToContainer, 100);
});
```

## Cleanup

Always dispose when done:

```typescript
// Clean up all resources
term.dispose();

// Remove from DOM if needed
document.getElementById('terminal').innerHTML = '';