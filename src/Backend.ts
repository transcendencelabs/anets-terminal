import { AnetsTerminal } from './Terminal';
import { TerminalEvent } from './Types';

/**
 * Backend interface for connecting the terminal to a shell/PTY
 * 
 * Provides base classes and utilities for:
 * - WebSocket connections (attach/detach)
 * - Custom backend implementations
 * - Data flow between terminal and backend
 */

/**
 * WebSocket backend - connects the terminal to a WebSocket server
 * 
 * Usage:
 * ```typescript
 * const term = new AnetsTerminal();
 * term.open(container);
 * 
 * const ws = new WebSocket('ws://localhost:8080');
 * const backend = new WebSocketBackend(term, ws);
 * backend.attach();
 * ```
 */
export class WebSocketBackend {
  private _terminal: AnetsTerminal;
  private _ws: WebSocket;
  private _attached: boolean = false;
  private _dataHandler: ((data: string) => void) | null = null;
  private _openHandler: (() => void) | null = null;
  private _closeHandler: (() => void) | null = null;
  private _errorHandler: ((error: Event) => void) | null = null;

  constructor(terminal: AnetsTerminal, ws: WebSocket) {
    this._terminal = terminal;
    this._ws = ws;
  }

  /** Attach the terminal to the WebSocket */
  attach(): void {
    if (this._attached) return;
    this._attached = true;

    // Terminal input -> WebSocket
    this._dataHandler = (data: string) => {
      if (this._ws.readyState === WebSocket.OPEN) {
        this._ws.send(data);
      }
    };
    this._terminal.on(TerminalEvent.Data, this._dataHandler);

    // WebSocket messages -> Terminal output
    this._openHandler = () => {
      this._terminal.focus();
    };

    this._closeHandler = () => {
      this._terminal.write('\r\n\x1b[31m[Connection closed]\x1b[0m\r\n');
    };

    this._errorHandler = (_error: Event) => {
      this._terminal.write('\r\n\x1b[31m[Connection error]\x1b[0m\r\n');
    };

    this._ws.addEventListener('open', this._openHandler);
    this._ws.addEventListener('message', this._onMessage);
    this._ws.addEventListener('close', this._closeHandler);
    this._ws.addEventListener('error', this._errorHandler);

    // If already connected, focus
    if (this._ws.readyState === WebSocket.OPEN) {
      this._terminal.focus();
    }
  }

  /** Handle incoming WebSocket messages */
  private _onMessage = (event: MessageEvent): void => {
    const data = event.data;
    if (typeof data === 'string') {
      this._terminal.write(data);
    } else if (data instanceof ArrayBuffer) {
      this._terminal.write(new Uint8Array(data));
    } else if (data instanceof Blob) {
      data.arrayBuffer().then(buffer => {
        this._terminal.write(new Uint8Array(buffer));
      });
    }
  };

  /** Detach the terminal from the WebSocket */
  detach(): void {
    if (!this._attached) return;
    this._attached = false;

    if (this._dataHandler) {
      this._terminal.off(TerminalEvent.Data, this._dataHandler);
    }
    if (this._openHandler) {
      this._ws.removeEventListener('open', this._openHandler);
    }
    this._ws.removeEventListener('message', this._onMessage);
    if (this._closeHandler) {
      this._ws.removeEventListener('close', this._closeHandler);
    }
    if (this._errorHandler) {
      this._ws.removeEventListener('error', this._errorHandler);
    }
  }

  /** Send data directly through the WebSocket */
  send(data: string): void {
    if (this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(data);
    }
  }

  /** Get the WebSocket ready state */
  get readyState(): number {
    return this._ws.readyState;
  }

  /** Check if attached */
  get isAttached(): boolean {
    return this._attached;
  }
}

/**
 * Abstract base class for custom terminal backends
 * 
 * Extend this to create custom backends (e.g., SSH proxy, custom protocols):
 * 
 * ```typescript
 * class MyBackend extends BaseBackend {
 *   protected onInput(data: string): void {
 *     // Process user input, send to your service
 *   }
 *   
 *   // Call this.write(data) when you receive output from your service
 * }
 * ```
 */
export abstract class BaseBackend {
  protected _terminal: AnetsTerminal | null = null;
  private _attached: boolean = false;
  private _dataHandler: ((data: string) => void) | null = null;

  /** Attach to a terminal */
  attach(terminal: AnetsTerminal): void {
    if (this._attached) this.detach();
    this._terminal = terminal;
    this._attached = true;

    this._dataHandler = (data: string) => {
      this.onInput(data);
    };
    terminal.on(TerminalEvent.Data, this._dataHandler);

    this.onAttach();
  }

  /** Detach from the terminal */
  detach(): void {
    if (!this._attached) return;
    this.onDetach();

    if (this._dataHandler && this._terminal) {
      this._terminal.off(TerminalEvent.Data, this._dataHandler);
    }

    this._attached = false;
    this._terminal = null;
  }

  /** Write data to the attached terminal (output from backend) */
  protected write(data: string | Uint8Array): void {
    this._terminal?.write(data);
  }

  /** Check if attached */
  get isAttached(): boolean {
    return this._attached;
  }

  // Abstract/virtual methods for subclasses

  /** Called when user types into the terminal */
  protected abstract onInput(data: string): void;

  /** Called when the backend is attached to a terminal */
  protected onAttach(): void {}

  /** Called when the backend is detached from a terminal */
  protected onDetach(): void {}
}

/**
 * Utility function to quickly attach a terminal to a WebSocket
 * 
 * ```typescript
 * const term = new AnetsTerminal();
 * term.open(container);
 * attachWebSocket(term, 'ws://localhost:8080');
 * ```
 */
export function attachWebSocket(terminal: AnetsTerminal, url: string): WebSocketBackend {
  const ws = new WebSocket(url);
  const backend = new WebSocketBackend(terminal, ws);
  backend.attach();
  return backend;
}