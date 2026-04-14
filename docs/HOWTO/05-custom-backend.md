# Create a Custom Backend

## BaseBackend Class

Extend `BaseBackend` to connect your terminal to any data source:

```typescript
import { AnetsTerminal, BaseBackend, TerminalEvent } from 'anets-terminal';

class CustomBackend extends BaseBackend {
  protected onInput(data: string): void {
    // Called when user types in terminal
    console.log('User input:', data);
    // Send data to your service
  }

  protected onAttach(): void {
    // Called when backend is attached to terminal
    console.log('Backend attached');
  }

  protected onDetach(): void {
    // Called when backend is detached
    console.log('Backend detached');
  }
}

// Usage
const term = new AnetsTerminal();
term.open(document.getElementById('terminal'));

const backend = new CustomBackend();
backend.attach(term);

// From your service, send output to terminal:
// (You need to call this.write() from your CustomBackend)
```

## Example: HTTP Polling Backend

```typescript
import { AnetsTerminal, BaseBackend } from 'anets-terminal';

class HTTPPollingBackend extends BaseBackend {
  private pollInterval: number;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(pollIntervalMs: number = 100) {
    super();
    this.pollInterval = pollIntervalMs;
  }

  protected onInput(data: string): void {
    // Send input to server
    fetch('/api/terminal/input', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: data,
    });
  }

  protected onAttach(): void {
    // Start polling for output
    this.pollTimer = setInterval(() => {
      this.pollOutput();
    }, this.pollInterval);
  }

  protected onDetach(): void {
    // Stop polling
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private async pollOutput(): Promise<void> {
    const response = await fetch('/api/terminal/output');
    const data = await response.text();
    if (data) {
      this.write(data); // Send to terminal
    }
  }
}

// Usage
const term = new AnetsTerminal();
term.open(document.getElementById('terminal'));

const backend = new HTTPPollingBackend(50); // Poll every 50ms
backend.attach(term);
```

## Example: WebRTC Backend

```typescript
import { AnetsTerminal, BaseBackend } from 'anets-terminal';

class WebRTCBackend extends BaseBackend {
  private peerConnection: RTCPeerConnection;
  private dataChannel: RTCDataChannel | null = null;

  constructor(pc: RTCPeerConnection) {
    super();
    this.peerConnection = pc;
  }

  protected onInput(data: string): void {
    if (this.dataChannel?.readyState === 'open') {
      this.dataChannel.send(data);
    }
  }

  protected onAttach(): void {
    this.dataChannel = this.peerConnection.createDataChannel('terminal');
    
    this.dataChannel.onmessage = (event) => {
      this.write(event.data);
    };

    this.dataChannel.onopen = () => {
      console.log('Data channel open');
    };

    this.dataChannel.onclose = () => {
      console.log('Data channel closed');
    };
  }

  protected onDetach(): void {
    this.dataChannel?.close();
    this.dataChannel = null;
  }
}
```

## Example: SSH via Node.js Server

**Server (Node.js with Express + node-pty):**

```javascript
// server.js
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const pty = require('node-pty');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  const shell = process.platform === 'win32' 
    ? 'powershell.exe' 
    : process.env.SHELL || '/bin/bash';

  const ptyProcess = pty.spawn(shell, [], {
    cols: 80,
    rows: 24,
    cwd: process.env.HOME,
    env: process.env,
  });

  // Terminal output -> WebSocket
  ptyProcess.onData(data => ws.send(data));

  // WebSocket -> Terminal input
  ws.on('message', data => {
    ptyProcess.write(data.toString());
  });

  ws.on('close', () => ptyProcess.kill());
});

server.listen(8080, () => {
  console.log('Server running on port 8080');
});
```

**Client:**

```typescript
import { AnetsTerminal, attachWebSocket } from 'anets-terminal';

const term = new AnetsTerminal({
  cols: 80,
  rows: 24,
});
term.open(document.getElementById('terminal'));

const backend = attachWebSocket(term, 'ws://localhost:8080');
```

## Example: Mock Backend for Testing

```typescript
import { AnetsTerminal, BaseBackend } from 'anets-terminal';

class MockBackend extends BaseBackend {
  private commands: Map<string, string> = new Map();

  constructor() {
    super();
    this.commands.set('help', 'Available commands: help, date, echo, clear\n');
    this.commands.set('date', new Date().toString() + '\n');
  }

  protected onInput(data: string): void {
    if (data === '\r' || data === '\n') {
      this.write('\r\n');
    } else if (data === 'clear') {
      // Terminal doesn't have clear, just write blanks
      this.write('\x1b[2J\x1b[H');
    } else if (data.startsWith('echo ')) {
      this.write(data.substring(5) + '\r\n');
    } else if (this.commands.has(data)) {
      this.write(this.commands.get(data));
    } else if (data !== '\r') {
      // Echo characters (except enter)
      this.write(data);
    }
  }

  protected onAttach(): void {
    this.write('\x1b[32mMock Shell v1.0\x1b[0m\r\n');
    this.write('Type "help" for commands\r\n');
    this.write('\x1b[1muser@mock\x1b[0m:\x1b[34m~\x1b[0m$ ');
  }
}

// Usage
const term = new AnetsTerminal();
term.open(document.getElementById('terminal'));

const backend = new MockBackend();
backend.attach(term);