# TypeScript Setup

## Step 1: Install TypeScript Types

AnetsTerminal ships with built-in TypeScript definitions:

```bash
npm install anets-terminal typescript
```

## Step 2: Configure TypeScript

Create or update your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "sourceMap": true
  },
  "include": ["src/**/*.ts"]
}
```

## Step 3: Create Your Terminal

```typescript
// src/main.ts
import { 
  AnetsTerminal, 
  TerminalEvent,
  TerminalEvent as EventType,
  DEFAULT_THEME,
  attachWebSocket 
} from 'anets-terminal';

const terminalElement = document.getElementById('terminal');
if (!terminalElement) throw new Error('Terminal container not found');

const term = new AnetsTerminal({
  cols: 100,
  rows: 30,
  theme: {
    background: '#1e1e2e',
    foreground: '#cdd6f4',
  },
  cursorBlink: true,
  showScrollbar: true,
});

term.open(terminalElement);
term.write('\x1b[33mWelcome to My App Terminal\x1b[0m\r\n');

// Type-safe event handling
term.on(TerminalEvent.Data, (data: string) => {
  console.log('Input:', data);
});

term.on(TerminalEvent.Resize, (size: { cols: number; rows: number }) => {
  console.log(`Resized to: ${size.cols}x${size.rows}`);
});

term.on(TerminalEvent.Bell, () => {
  console.log('Bell!');
});
```

## Step 4: Build

```bash
npx tsc
```

Then include your compiled output in HTML:

```html
<script type="module" src="./dist/main.js"></script>
```

## Bundler Setup (Vite)

If using Vite:

```bash
npm create vite@latest my-terminal -- --template vanilla-ts
cd my-terminal
npm install anets-terminal
```

Then in `main.ts`:

```typescript
import { AnetsTerminal } from 'anets-terminal';

const term = new AnetsTerminal();
term.open(document.getElementById('app')!);
```

```bash
npm run dev
```

## Bundler Setup (Webpack)

```bash
npm install webpack webpack-cli ts-loader --save-dev
```

```javascript
// webpack.config.js
module.exports = {
  entry: './src/main.ts',
  module: {
    rules: [{ test: /\.ts$/, use: 'ts-loader', exclude: /node_modules/ }]
  },
  resolve: { extensions: ['.ts', '.js'] }
};