# Connect to a WebSocket Backend

## Quick Connection

The fastest way to connect your terminal to a WebSocket server:

```typescript
import { AnetsTerminal, attachWebSocket } from 'anets-terminal';

const term = new AnetsTerminal();
term.open(document.getElementById('terminal'));

// One-liner WebSocket connection
const backend = attachWebSocket(term, 'ws://localhost:8080/pty');
```

## Manual Connection

For more control over the connection:

```typescript
import { AnetsTerminal, WebSocketBackend, TerminalEvent } from 'anets-terminal';

const term = new AnetsTerminal();
term.open(document.getElementById('terminal'));

const ws = new WebSocket('ws://localhost:8080/pty');
const backend = new WebSocketBackend(term, ws);
backend.attach();
```

## Handle Connection Events

```typescript
import { AnetsTerminal, WebSocketBackend } from 'anets-terminal';

const term = new AnetsTerminal();
term.open(document.getElementById('terminal'));

const ws = new WebSocket('ws://localhost:8080/pty');

ws.onopen = () => {
  term.write('\x1b[32mConnected to server\x1b[0m\r\n');
};

ws.onclose = () => {
  term.write('\x1b[31mDisconnected from server\x1b[0m\r\n');
};

ws.onerror = () => {
  term.write('\x1b[31mConnection error\x1b[0m\r\n');
};

const backend = new WebSocketBackend(term, ws);
backend.attach();
```

## Disconnect and Cleanup

```typescript
// Detach but keep terminal
backend.detach();

// Close WebSocket
ws.close();

// Dispose terminal entirely
term.dispose();
```

## Binary Data Support

WebSocketBackend handles both text and binary data:

```typescript
// Send binary data
const binaryData = new Uint8Array([0x1b, 0x5b, 0x33, 0x31, 0x6d]); // ESC[31m (red)
backend.send(binaryData);

// Or as string
backend.send('\x1b[31mRed text\x1b[0m');
```

## Example: Connect to ttyd

[ttyd](https://github.com/tsl0922/ttyd) is a tool for sharing terminal over web:

```bash
# Install ttyd
npm install -g ttyd

# Start server
ttyd bash
```

Then connect:

```typescript
const term = new AnetsTerminal();
term.open(document.getElementById('terminal'));

const ws = new WebSocket('ws://localhost:7681');
const backend = new WebSocketBackend(term, ws);
backend.attach();
```

## Example: Connect to xterm.js Compatible Server

Many servers work with AnetsTerminal out of the box:

```typescript
// Node.js xterm-websocket
const ws = new WebSocket('ws://localhost:3000/terminals/1');
const backend = new WebSocketBackend(term, ws);
backend.attach();