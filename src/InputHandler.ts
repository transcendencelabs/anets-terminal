import { TerminalEvent, EventCallback, SelectionState } from './Types';
import { Buffer } from './Buffer';
import { Renderer } from './Renderer';

/**
 * Handles keyboard and mouse input for the terminal
 * Translates user input into terminal data and navigation actions
 */
export class InputHandler {
  private _container: HTMLElement;
  private _buffer: Buffer;
  private _renderer: Renderer;
  private _textarea: HTMLTextAreaElement;
  private _listeners: Map<string, Map<EventCallback, EventListener>> = new Map();
  private _selection: SelectionState = {
    start: null,
    end: null,
    active: false,
  };
  private _isFocused: boolean = false;
  private _mouseDown: boolean = false;
  private _wordSeparators: string;

  constructor(
    container: HTMLElement,
    buffer: Buffer,
    renderer: Renderer,
    wordSeparators: string = ' ()[]{}\'"',
  ) {
    this._container = container;
    this._buffer = buffer;
    this._renderer = renderer;
    this._wordSeparators = wordSeparators;

    // Create hidden textarea for capturing keyboard input
    this._textarea = document.createElement('textarea');
    this._textarea.style.position = 'absolute';
    this._textarea.style.left = '-9999px';
    this._textarea.style.top = '0';
    this._textarea.style.width = '1px';
    this._textarea.style.height = '1px';
    this._textarea.style.opacity = '0';
    this._textarea.setAttribute('autocapitalize', 'off');
    this._textarea.setAttribute('autocorrect', 'off');
    this._textarea.setAttribute('autocomplete', 'off');
    this._textarea.setAttribute('spellcheck', 'false');
    this._textarea.setAttribute('aria-label', 'Terminal input');
    container.appendChild(this._textarea);

    this._attachListeners();
  }

  private _attachListeners(): void {
    // Click to focus
    this._container.addEventListener('click', this._onClick);
    
    // Keyboard input
    this._textarea.addEventListener('keydown', this._onKeyDown);
    this._textarea.addEventListener('input', this._onInput);
    this._textarea.addEventListener('compositionend', this._onCompositionEnd);
    
    // Focus/blur
    this._textarea.addEventListener('focus', this._onFocus);
    this._textarea.addEventListener('blur', this._onBlur);

    // Mouse events for selection
    this._container.addEventListener('mousedown', this._onMouseDown);
    this._container.addEventListener('mousemove', this._onMouseMove);
    this._container.addEventListener('mouseup', this._onMouseUp);
    this._container.addEventListener('dblclick', this._onDoubleClick);

    // Scroll for scrollback
    this._container.addEventListener('wheel', this._onWheel, { passive: false });

    // Context menu (right click)
    this._container.addEventListener('contextmenu', this._onContextMenu);
  }

  /** Focus the terminal */
  focus(): void {
    this._textarea.focus();
  }

  /** Blur the terminal */
  blur(): void {
    this._textarea.blur();
  }

  /** Check if terminal is focused */
  get isFocused(): boolean {
    return this._isFocused;
  }

  // ---- Event handlers ----

  private _onClick = (): void => {
    this._textarea.focus();
  };

  private _onFocus = (): void => {
    this._isFocused = true;
    this._emit(TerminalEvent.Focus);
  };

  private _onBlur = (): void => {
    this._isFocused = false;
    this._emit(TerminalEvent.Blur);
  };

  private _onKeyDown = (e: KeyboardEvent): void => {
    // Handle special keys first
    const sequences = this._mapKeyToSequence(e);
    if (sequences !== null) {
      e.preventDefault();
      this._emit(TerminalEvent.Data, sequences);
      return;
    }

    // Handle Ctrl+combinations
    if (e.ctrlKey && !e.altKey && !e.metaKey) {
      const ctrlSeq = this._mapCtrlKey(e);
      if (ctrlSeq !== null) {
        e.preventDefault();
        this._emit(TerminalEvent.Data, ctrlSeq);
        return;
      }
    }

    // Handle Alt+combinations
    if (e.altKey && e.key.length === 1) {
      e.preventDefault();
      // Send ESC prefixed character (meta key emulation)
      this._emit(TerminalEvent.Data, `\x1b${e.key}`);
      return;
    }
  };

  private _onInput = (e: InputEvent): void => {
    const data = this._textarea.value;
    this._textarea.value = '';
    if (data) {
      this._emit(TerminalEvent.Data, data);
    }
  };

  private _onCompositionEnd = (e: CompositionEvent): void => {
    if (e.data) {
      this._emit(TerminalEvent.Data, e.data);
    }
    this._textarea.value = '';
  };

  private _onMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0) return; // Left button only
    
    this._mouseDown = true;
    const { col, row } = this._renderer.pixelToCell(
      e.offsetX,
      e.offsetY,
    );

    // Start new selection
    this._selection = {
      start: { x: col, y: row },
      end: { x: col, y: row },
      active: true,
    };
    this._renderer.setSelection(this._selection);

    // Focus the textarea
    this._textarea.focus();
  };

  private _onMouseMove = (e: MouseEvent): void => {
    if (!this._mouseDown) return;

    const { col, row } = this._renderer.pixelToCell(
      e.offsetX,
      e.offsetY,
    );

    this._selection.end = { x: col, y: row };
    this._renderer.setSelection(this._selection);
  };

  private _onMouseUp = (e: MouseEvent): void => {
    if (e.button !== 0) return;
    this._mouseDown = false;

    if (this._selection.start && this._selection.end) {
      // Check if there's an actual selection (not just a click)
      const isSelection = 
        this._selection.start.x !== this._selection.end.x ||
        this._selection.start.y !== this._selection.end.y;
      
      if (isSelection) {
        this._emit(TerminalEvent.Selection);
        // Copy to clipboard
        this._copySelection();
      } else {
        this._selection.active = false;
        this._renderer.setSelection(null);
      }
    }
  };

  private _onDoubleClick = (e: MouseEvent): void => {
    const { col, row } = this._renderer.pixelToCell(
      e.offsetX,
      e.offsetY,
    );

    // Select the word at the click position
    const wordBounds = this._findWordBounds(col, row);
    if (wordBounds) {
      this._selection = {
        start: { x: wordBounds.startCol, y: row },
        end: { x: wordBounds.endCol, y: row },
        active: true,
      };
      this._renderer.setSelection(this._selection);
      this._emit(TerminalEvent.Selection);
      this._copySelection();
    }
  };

  private _onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const delta = Math.sign(e.deltaY);
    const currentOffset = this._buffer.scrollOffset;
    const newOffset = currentOffset + delta;
    
    if (newOffset !== currentOffset) {
      this._buffer.scrollTo(newOffset);
      this._renderer.setScrollOffset(this._buffer.scrollOffset);
      this._renderer.markDirty();
      this._renderer.scheduleRender();
      this._emit(TerminalEvent.Scroll, this._buffer.scrollOffset);
    }
  };

  private _onContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
    // If there's a selection, it's already copied
    // Could add paste functionality here
  };

  // ---- Key mapping ----

  /** Map keyboard events to ANSI escape sequences */
  private _mapKeyToSequence(e: KeyboardEvent): string | null {
    const key = e.key;
    const shift = e.shiftKey;
    const ctrl = e.ctrlKey;
    const alt = e.altKey;

    // Application cursor keys vs normal cursor keys
    const appCursor = false; // Could be mode-dependent
    const prefix = appCursor ? '\x1bO' : '\x1b[';

    switch (key) {
      case 'Enter':
        return '\r';
      case 'Backspace':
        return '\x7f';
      case 'Delete':
        return prefix + '3~';
      case 'Tab':
        return '\t';
      case 'Escape':
        return '\x1b';
      case 'Home':
        return shift ? prefix + '1~' : prefix + 'H';
      case 'End':
        return shift ? prefix + '4~' : prefix + 'F';
      case 'Insert':
        return prefix + '2~';
      case 'PageUp':
        return shift ? '\x1b[5;2~' : prefix + '5~';
      case 'PageDown':
        return shift ? '\x1b[6;2~' : prefix + '6~';
      case 'ArrowUp':
        if (shift) return '\x1b[1;2A';
        if (ctrl) return '\x1b[1;5A';
        if (alt) return '\x1b[1;3A';
        return prefix + 'A';
      case 'ArrowDown':
        if (shift) return '\x1b[1;2B';
        if (ctrl) return '\x1b[1;5B';
        if (alt) return '\x1b[1;3B';
        return prefix + 'B';
      case 'ArrowRight':
        if (shift) return '\x1b[1;2C';
        if (ctrl) return '\x1b[1;5C';
        if (alt) return '\x1b[1;3C';
        return prefix + 'C';
      case 'ArrowLeft':
        if (shift) return '\x1b[1;2D';
        if (ctrl) return '\x1b[1;5D';
        if (alt) return '\x1b[1;3D';
        return prefix + 'D';
      case 'F1':
        return '\x1bOP';
      case 'F2':
        return '\x1bOQ';
      case 'F3':
        return '\x1bOR';
      case 'F4':
        return '\x1bOS';
      case 'F5':
        return '\x1b[15~';
      case 'F6':
        return '\x1b[17~';
      case 'F7':
        return '\x1b[18~';
      case 'F8':
        return '\x1b[19~';
      case 'F9':
        return '\x1b[20~';
      case 'F10':
        return '\x1b[21~';
      case 'F11':
        return '\x1b[23~';
      case 'F12':
        return '\x1b[24~';
      default:
        return null;
    }
  }

  /** Map Ctrl+key combinations to control characters */
  private _mapCtrlKey(e: KeyboardEvent): string | null {
    const key = e.key.toLowerCase();
    const ctrlMap: Record<string, string> = {
      'a': '\x01', 'b': '\x02', 'c': '\x03', 'd': '\x04',
      'e': '\x05', 'f': '\x06', 'g': '\x07', 'h': '\x08',
      'i': '\x09', 'j': '\x0a', 'k': '\x0b', 'l': '\x0c',
      'm': '\x0d', 'n': '\x0e', 'o': '\x0f', 'p': '\x10',
      'q': '\x11', 'r': '\x12', 's': '\x13', 't': '\x14',
      'u': '\x15', 'v': '\x16', 'w': '\x17', 'x': '\x18',
      'y': '\x19', 'z': '\x1a',
      '[': '\x1b', '\\': '\x1c', ']': '\x1d',
      '2': '\x00', '6': '\x1e', '-': '\x1f',
    };

    if (key === 'c') {
      // Ctrl+C is special - also emit as SIGINT
      return ctrlMap[key] || null;
    }

    return ctrlMap[key] || null;
  }

  // ---- Selection helpers ----

  /** Find word boundaries at a position */
  private _findWordBounds(col: number, row: number): { startCol: number; endCol: number } | null {
    if (row < 0 || row >= this._buffer.rows) return null;
    
    const line = this._buffer.getLine(row);
    let startCol = col;
    let endCol = col;

    // Expand left
    while (startCol > 0) {
      const prevChar = line[startCol - 1].char;
      if (this._wordSeparators.includes(prevChar)) break;
      startCol--;
    }

    // Expand right
    while (endCol < this._buffer.cols - 1) {
      const nextChar = line[endCol + 1].char;
      if (this._wordSeparators.includes(nextChar)) break;
      endCol++;
    }

    return { startCol, endCol };
  }

  /** Get the selected text */
  getSelectionText(): string | null {
    if (!this._selection.start || !this._selection.end) return null;

    const start = this._selection.start;
    const end = this._selection.end;

    // Normalize so start <= end
    const normalized = start.y < end.y || (start.y === end.y && start.x <= end.x)
      ? { start, end }
      : { start: end, end: start };

    const lines: string[] = [];

    for (let row = normalized.start.y; row <= normalized.end.y; row++) {
      const line = this._buffer.getLine(row);
      const startCol = row === normalized.start.y ? normalized.start.x : 0;
      const endCol = row === normalized.end.y ? normalized.end.x : this._buffer.cols - 1;
      
      let text = '';
      for (let col = startCol; col <= endCol; col++) {
        text += line[col].char;
      }
      lines.push(text.trimEnd());
    }

    return lines.join('\n');
  }

  /** Copy selection to clipboard */
  private async _copySelection(): Promise<void> {
    const text = this.getSelectionText();
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback: use execCommand
      this._textarea.value = text;
      this._textarea.select();
      document.execCommand('copy');
      this._textarea.value = '';
    }
  }

  /** Clear the selection */
  clearSelection(): void {
    this._selection = { start: null, end: null, active: false };
    this._renderer.setSelection(null);
  }

  // ---- Event system ----

  private _eventHandlers: Map<TerminalEvent, Set<EventCallback>> = new Map();

  on(event: TerminalEvent, callback: EventCallback): void {
    if (!this._eventHandlers.has(event)) {
      this._eventHandlers.set(event, new Set());
    }
    this._eventHandlers.get(event)!.add(callback);
  }

  off(event: TerminalEvent, callback: EventCallback): void {
    this._eventHandlers.get(event)?.delete(callback);
  }

  private _emit(event: TerminalEvent, ...args: any[]): void {
    this._eventHandlers.get(event)?.forEach(cb => cb(...args));
  }

  /** Dispose of the input handler */
  dispose(): void {
    this._container.removeEventListener('click', this._onClick);
    this._textarea.removeEventListener('keydown', this._onKeyDown);
    this._textarea.removeEventListener('input', this._onInput);
    this._textarea.removeEventListener('compositionend', this._onCompositionEnd);
    this._textarea.removeEventListener('focus', this._onFocus);
    this._textarea.removeEventListener('blur', this._onBlur);
    this._container.removeEventListener('mousedown', this._onMouseDown);
    this._container.removeEventListener('mousemove', this._onMouseMove);
    this._container.removeEventListener('mouseup', this._onMouseUp);
    this._container.removeEventListener('dblclick', this._onDoubleClick);
    this._container.removeEventListener('wheel', this._onWheel);
    this._container.removeEventListener('contextmenu', this._onContextMenu);

    this._textarea.remove();
    this._eventHandlers.clear();
  }
}