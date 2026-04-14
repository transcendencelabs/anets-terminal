# Quick Start - Get AnetsTerminal Running in 5 Minutes

## Prerequisites

- Node.js 18+ (for development/build)
- A browser (Chrome, Firefox, Edge, Safari)

## Step 1: Install

```bash
npm install anets-terminal
```

## Step 2: Create Your Terminal

Create an HTML file (`index.html`):

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Terminal</title>
  <style>
    body { margin: 0; padding: 16px; background: #1a1a2e; }
    #terminal { width: 100%; height: 600px; }
  </style>
</head>
<body>
  <div id="terminal"></div>
  <script type="module">
    import { AnetsTerminal, TerminalEvent } from 'anets-terminal';

    const term = new AnetsTerminal({
      cols: 100,
      rows: 30,
    });

    term.open(document.getElementById('terminal'));
    term.write('\x1b[32mHello, Terminal!\x1b[0m\r\n');
    term.write('Type something...\r\n');

    term.on(TerminalEvent.Data, (data) => {
      // Handle user input here
      console.log('User typed:', data);
    });
  </script>
</body>
</html>
```

## Step 3: Run It

If you have a simple server:

```bash
# Using Python
python -m http.server 8080

# Using Node.js
npx serve .
```

Open `http://localhost:8080` in your browser.

## You're Done!

You now have a working terminal. Next steps:
- [Use with TypeScript](./02-typescript-setup.md)
- [Connect to a WebSocket backend](./03-websocket-backend.md)
- [Customize themes](./04-themes.md)