import { TerminalOptions, TerminalTheme, TerminalEvent, EventCallback, CursorState, TextStyle, EraseMode, TerminalColor } from './Types';
import { Buffer, createBlankCell } from './Buffer';
import { AnsiParser, CSISequence, ESCSequence, OSCSequence } from './AnsiParser';
import { Renderer } from './Renderer';
import { InputHandler } from './InputHandler';
import { mergeTheme, DEFAULT_THEME } from './Theme';

/** Default terminal options */
const DEFAULT_OPTIONS: Required<TerminalOptions> = {
  cols: 80,
  rows: 24,
  fontFamily: 'Courier New, Courier, monospace',
  fontSize: 15,
  lineHeight: 1.2,
  letterSpacing: 0,
  scrollback: 1000,
  theme: {},
  cursorStyle: 'block',
  cursorBlink: true,
  allowTransparency: false,
  focusOnOpen: false,
  screenReaderMode: false,
  rightClickSelectsWord: false,
  wordSeparators: ' ()[]{}\'"',
  drawBoldTextInBrightColors: true,
};

/**
 * AnetsTerminal - An embeddable web-based terminal emulator
 * 
 * Usage:
 * ```typescript
 * const term = new AnetsTerminal({ cols: 80, rows: 24 });
 * term.open(document.getElementById('terminal-container'));
 * term.write('Hello, World!\r\n');
 * term.onData(data => { /* handle user input *\/ });
 * ```
 */
export class AnetsTerminal {
  // Options
  private _options: Required<TerminalOptions>;
  private _theme: TerminalTheme;

  // Core components
  private _buffer: Buffer;
  private _parser: AnsiParser;
  private _renderer: Renderer | null = null;
  private _inputHandler: InputHandler | null = null;

  // DOM
  private _container: HTMLElement | null = null;
  private _canvas: HTMLCanvasElement | null = null;
  private _scrollbar: HTMLDivElement | null = null;

  // Cursor state
  private _cursorX: number = 0;
  private _cursorY: number = 0;
  private _cursorVisible: boolean = true;
  private _cursorStyle: 'block' | 'underline' | 'bar';
  private _cursorBlink: boolean;

  // Current text attributes
  private _currentFg: TerminalColor = 7; // default white
  private _currentBg: TerminalColor = 0; // default black
  private _currentStyle: TextStyle = {
    bold: false,
    dim: false,
    italic: false,
    underline: false,
    blink: false,
    inverse: false,
    hidden: false,
    strikethrough: false,
    doubleWidth: false,
  };

  // Terminal modes
  private _insertMode: boolean = false;
  private _originMode: boolean = false;
  private _autoWrap: boolean = true;
  private _cursorKeyMode: boolean = false; // false = normal, true = application
  private _columnMode: boolean = false; // false = 80 columns, true = 132 columns

  // Tab stops
  private _tabStops: boolean[];

  // Event system
  private _eventHandlers: Map<TerminalEvent, Set<EventCallback>> = new Map();

  // Title
  private _title: string = '';

  // Saved cursor state (DECSC/DECRC)
  private _savedCursorX: number = 0;
  private _savedCursorY: number = 0;
  private _savedFg: TerminalColor = 7;
  private _savedBg: TerminalColor = 0;
  private _savedStyle: TextStyle = { ...this._currentStyle };

  constructor(options?: TerminalOptions) {
    this._options = { ...DEFAULT_OPTIONS, ...options };
    this._theme = mergeTheme(this._options.theme);
    this._cursorStyle = this._options.cursorStyle;
    this._cursorBlink = this._options.cursorBlink;

    // Initialize buffer
    this._buffer = new Buffer(this._options.cols, this._options.rows, this._options.scrollback);

    // Initialize tab stops (every 8 columns)
    this._tabStops = [];
    for (let i = 0; i < this._options.cols; i++) {
      this._tabStops.push(i % 8 === 0);
    }

    // Initialize parser with callbacks
    this._parser = new AnsiParser({
      print: (char, code) => this._print(char),
      execute: (code) => this._execute(code),
      CSI: (seq) => this._handleCSI(seq),
      ESC: (seq) => this._handleESC(seq),
      OSC: (seq) => this._handleOSC(seq),
    });
  }

  // =============================================
  // Public API
  // =============================================

  /** Open the terminal in a container element */
  open(container: HTMLElement): void {
    this._container = container;

    // Set container styles
    container.style.position = 'relative';
    container.style.overflow = 'hidden';
    container.style.backgroundColor = this._theme.background;

    // Create canvas
    this._canvas = document.createElement('canvas');
    this._canvas.style.display = 'block';
    this._canvas.style.cursor = 'text';
    container.appendChild(this._canvas);

    // Create renderer
    this._renderer = new Renderer(
      this._canvas,
      this._buffer,
      this._theme,
      this._options.fontFamily,
      this._options.fontSize,
      this._options.lineHeight,
      this._options.letterSpacing,
    );

    // Resize canvas to match buffer
    this._renderer.resize(this._options.cols, this._options.rows);

    // Create input handler
    this._inputHandler = new InputHandler(
      container,
      this._buffer,
      this._renderer,
      this._options.wordSeparators,
    );

    // Forward input handler data events
    this._inputHandler.on(TerminalEvent.Data, (data: string) => {
      this._emit(TerminalEvent.Data, data);
    });

    // Forward other events
    this._inputHandler.on(TerminalEvent.Focus, () => this._emit(TerminalEvent.Focus));
    this._inputHandler.on(TerminalEvent.Blur, () => this._emit(TerminalEvent.Blur));
    this._inputHandler.on(TerminalEvent.Scroll, (offset: number) => this._emit(TerminalEvent.Scroll, offset));
    this._inputHandler.on(TerminalEvent.Selection, () => this._emit(TerminalEvent.Selection));

    // Handle window resize
    this._handleResize = this._handleResize.bind(this);

    // Initial render
    this._renderer.render();

    // Focus if requested
    if (this._options.focusOnOpen) {
      this._inputHandler.focus();
    }
  }

  /** Write data to the terminal (as if received from the backend) */
  write(data: string | Uint8Array): void {
    if (typeof data === 'string') {
      this._parser.parse(data);
    } else {
      // Convert Uint8Array to string
      let str = '';
      for (let i = 0; i < data.length; i++) {
        str += String.fromCharCode(data[i]);
      }
      this._parser.parse(str);
    }
    this._requestRender();
  }

  /** Write data to the terminal and immediately flush */
  writeln(data: string): void {
    this.write(data + '\r\n');
  }

  /** Get the current terminal rows */
  get rows(): number {
    return this._buffer.rows;
  }

  /** Get the current terminal columns */
  get cols(): number {
    return this._buffer.cols;
  }

  /** Get the buffer */
  get buffer(): Buffer {
    return this._buffer;
  }

  /** Get current cursor position */
  get cursorX(): number {
    return this._cursorX;
  }

  get cursorY(): number {
    return this._cursorY;
  }

  /** Get the terminal title */
  get title(): string {
    return this._title;
  }

  /** Get whether the terminal is focused */
  get isFocused(): boolean {
    return this._inputHandler?.isFocused ?? false;
  }

  /** Register an event handler */
  on(event: TerminalEvent, callback: EventCallback): void {
    if (!this._eventHandlers.has(event)) {
      this._eventHandlers.set(event, new Set());
    }
    this._eventHandlers.get(event)!.add(callback);
  }

  /** Remove an event handler */
  off(event: TerminalEvent, callback: EventCallback): void {
    this._eventHandlers.get(event)?.delete(callback);
  }

  /** Focus the terminal */
  focus(): void {
    this._inputHandler?.focus();
  }

  /** Blur the terminal */
  blur(): void {
    this._inputHandler?.blur();
  }

  /** Resize the terminal */
  resize(cols: number, rows: number): void {
    if (cols === this._buffer.cols && rows === this._buffer.rows) return;

    this._buffer.resize(cols, rows);
    this._renderer?.resize(cols, rows);
    this._options.cols = cols;
    this._options.rows = rows;

    // Reset tab stops
    this._tabStops = [];
    for (let i = 0; i < cols; i++) {
      this._tabStops.push(i % 8 === 0);
    }

    // Clamp cursor
    this._cursorX = Math.min(this._cursorX, cols - 1);
    this._cursorY = Math.min(this._cursorY, rows - 1);

    this._emit(TerminalEvent.Resize, { cols, rows });
    this._requestRender();
  }

  /** Set the terminal theme */
  setTheme(theme: Partial<TerminalTheme>): void {
    this._theme = mergeTheme(theme);
    this._renderer?.setTheme(this._theme);
    if (this._container) {
      this._container.style.backgroundColor = this._theme.background;
    }
  }

  /** Set the font */
  setFont(fontFamily?: string, fontSize?: number): void {
    if (fontFamily) this._options.fontFamily = fontFamily;
    if (fontSize) this._options.fontSize = fontSize;
    this._renderer?.setFont(
      this._options.fontFamily,
      this._options.fontSize,
      this._options.lineHeight,
      this._options.letterSpacing,
    );
  }

  /** Clear the terminal */
  clear(): void {
    this._buffer.clear();
    this._cursorX = 0;
    this._cursorY = 0;
    this._requestRender();
  }

  /** Reset the terminal to initial state */
  reset(): void {
    this._buffer.clear();
    this._cursorX = 0;
    this._cursorY = 0;
    this._cursorVisible = true;
    this._cursorStyle = this._options.cursorStyle;
    this._insertMode = false;
    this._originMode = false;
    this._autoWrap = true;
    this._currentFg = 7;
    this._currentBg = 0;
    this._currentStyle = {
      bold: false, dim: false, italic: false, underline: false,
      blink: false, inverse: false, hidden: false, strikethrough: false,
      doubleWidth: false,
    };
    this._parser.reset();
    this._requestRender();
  }

  /** Get the selected text */
  getSelection(): string | null {
    return this._inputHandler?.getSelectionText() ?? null;
  }

  /** Clear the current selection */
  clearSelection(): void {
    this._inputHandler?.clearSelection();
  }

  /** Scroll to a specific position in scrollback */
  scrollTo(offset: number): void {
    this._buffer.scrollTo(offset);
    this._renderer?.setScrollOffset(this._buffer.scrollOffset);
    this._requestRender();
  }

  /** Scroll to the bottom of the buffer */
  scrollToBottom(): void {
    this._buffer.scrollTo(0);
    this._renderer?.setScrollOffset(0);
    this._requestRender();
  }

  /** Get the scroll offset */
  get scrollOffset(): number {
    return this._buffer.scrollOffset;
  }

  /** Dispose of the terminal and clean up resources */
  dispose(): void {
    this._renderer?.dispose();
    this._inputHandler?.dispose();
    this._eventHandlers.clear();
    
    if (this._canvas && this._container) {
      this._container.removeChild(this._canvas);
    }
    
    this._canvas = null;
    this._container = null;
    this._renderer = null;
    this._inputHandler = null;
  }

  // =============================================
  // Parser Callbacks
  // =============================================

  /** Handle printable character */
  private _print(char: string): void {
    // Check if we need to wrap
    if (this._cursorX >= this._buffer.cols) {
      if (this._autoWrap) {
        this._cursorX = 0;
        this._cursorY++;
        if (this._cursorY > this._buffer.scrollRegion.bottom) {
          this._cursorY = this._buffer.scrollRegion.bottom;
          this._buffer.scrollUp(1);
        }
      } else {
        this._cursorX = this._buffer.cols - 1;
      }
    }

    // Write the character
    if (this._insertMode) {
      this._buffer.insertChars(this._cursorY, this._cursorX, 1);
    }

    this._buffer.setCell(this._cursorX, this._cursorY, {
      char,
      fg: this._currentFg,
      bg: this._currentBg,
      style: { ...this._currentStyle },
      width: 1,
    });

    this._cursorX++;

    // If we've gone past the last column, don't wrap yet
    // (wrap happens on next character print)
  }

  /** Handle C0 control characters */
  private _execute(code: number): void {
    switch (code) {
      case 0x00: // NUL - ignore
        break;
      case 0x07: // BEL - bell
        this._emit(TerminalEvent.Bell);
        break;
      case 0x08: // BS - backspace
        if (this._cursorX > 0) {
          this._cursorX--;
        }
        break;
      case 0x09: // HT - horizontal tab
        this._tab();
        break;
      case 0x0a: // LF - line feed
        this._lineFeed();
        break;
      case 0x0b: // VT - vertical tab (treated as LF)
        this._lineFeed();
        break;
      case 0x0c: // FF - form feed (treated as LF)
        this._lineFeed();
        break;
      case 0x0d: // CR - carriage return
        this._cursorX = 0;
        break;
      case 0x0e: // SO - shift out (map to G1)
        break;
      case 0x0f: // SI - shift in (map to G0)
        break;
      default:
        break;
    }
  }

  /** Handle CSI sequences */
  private _handleCSI(seq: CSISequence): void {
    const { prefix, params, intermediates, final } = seq;

    // Handle private mode sequences (prefixed with ?)
    if (prefix === '?') {
      this._handlePrivateModeCSI(params, final);
      return;
    }

    // Handle > prefix (xterm specific)
    if (prefix === '>') {
      return; // Ignore for now
    }

    switch (final) {
      // ---- Cursor Movement ----
      case 'A': // CUU - Cursor Up
        this._cursorUp(this._param(params, 0, 1));
        break;
      case 'B': // CUD - Cursor Down
        this._cursorDown(this._param(params, 0, 1));
        break;
      case 'C': // CUF - Cursor Forward
        this._cursorForward(this._param(params, 0, 1));
        break;
      case 'D': // CUB - Cursor Back
        this._cursorBack(this._param(params, 0, 1));
        break;
      case 'E': // CNL - Cursor Next Line
        this._cursorY = Math.min(this._cursorY + this._param(params, 0, 1), this._buffer.rows - 1);
        this._cursorX = 0;
        break;
      case 'F': // CPL - Cursor Previous Line
        this._cursorY = Math.max(this._cursorY - this._param(params, 0, 1), 0);
        this._cursorX = 0;
        break;
      case 'G': // CHA - Cursor Horizontal Absolute
        this._cursorX = Math.max(0, Math.min(this._param(params, 0, 1) - 1, this._buffer.cols - 1));
        break;
      case 'H': // CUP - Cursor Position
      case 'f': // HVP - Horizontal and Vertical Position
        this._cursorX = Math.max(0, Math.min(this._param(params, 1, 1) - 1, this._buffer.cols - 1));
        this._cursorY = Math.max(0, Math.min(this._param(params, 0, 1) - 1, this._buffer.rows - 1));
        break;
      case 'J': // ED - Erase in Display
        this._buffer.eraseInDisplay(this._cursorX, this._cursorY, this._param(params, 0, 0) as EraseMode);
        break;
      case 'K': // EL - Erase in Line
        this._buffer.eraseInLine(this._cursorY, this._param(params, 0, 0) as EraseMode);
        break;
      case 'L': // IL - Insert Lines
        this._buffer.insertLines(this._cursorY, this._param(params, 0, 1));
        break;
      case 'M': // DL - Delete Lines
        this._buffer.deleteLines(this._cursorY, this._param(params, 0, 1));
        break;
      case 'P': // DCH - Delete Characters
        this._buffer.deleteChars(this._cursorY, this._cursorX, this._param(params, 0, 1));
        break;
      case 'S': // SU - Scroll Up
        this._buffer.scrollUp(this._param(params, 0, 1));
        break;
      case 'T': // SD - Scroll Down
        this._buffer.scrollDown(this._param(params, 0, 1));
        break;
      case 'X': // ECH - Erase Characters
        const eraseCount = this._param(params, 0, 1);
        for (let i = 0; i < eraseCount; i++) {
          const x = this._cursorX + i;
          if (x >= this._buffer.cols) break;
          this._buffer.setCell(x, this._cursorY, { ...createBlankCell(), fg: this._currentFg, bg: this._currentBg });
        }
        break;
      case '@': // ICH - Insert Characters
        this._buffer.insertChars(this._cursorY, this._cursorX, this._param(params, 0, 1));
        break;
      case 'm': // SGR - Select Graphic Rendition
        this._handleSGR(params);
        break;
      case 'r': // DECSTBM - Set Scrolling Region
        const top = this._param(params, 0, 1) - 1;
        const bottom = this._param(params, 1, this._buffer.rows) - 1;
        if (top >= 0 && bottom < this._buffer.rows && top < bottom) {
          this._buffer.scrollRegion = { top, bottom };
          this._cursorX = 0;
          this._cursorY = this._originMode ? top : 0;
        }
        break;
      case 's': // Save cursor position
        this._savedCursorX = this._cursorX;
        this._savedCursorY = this._cursorY;
        this._savedFg = this._currentFg;
        this._savedBg = this._currentBg;
        this._savedStyle = { ...this._currentStyle };
        break;
      case 'u': // Restore cursor position
        this._cursorX = this._savedCursorX;
        this._cursorY = this._savedCursorY;
        this._currentFg = this._savedFg;
        this._currentBg = this._savedBg;
        this._currentStyle = { ...this._savedStyle };
        break;
      case 'h': // SM - Set Mode
        this._handleSetMode(params, false);
        break;
      case 'l': // RM - Reset Mode
        this._handleResetMode(params, false);
        break;
      case 'g': // TBC - Tabulation Clear
        if (params[0] === 3) {
          // Clear all tab stops
          this._tabStops = this._tabStops.map(() => false);
        } else if (params[0] === 0 || params.length === 0) {
          // Clear tab stop at cursor
          if (this._cursorX < this._tabStops.length) {
            this._tabStops[this._cursorX] = false;
          }
        }
        break;
      case 'n': // DSR - Device Status Report
        if (params[0] === 6) {
          // Report cursor position
          this._emit(TerminalEvent.Data, `\x1b[${this._cursorY + 1};${this._cursorX + 1}R`);
        } else if (params[0] === 5) {
          // Report terminal OK
          this._emit(TerminalEvent.Data, '\x1b[0n');
        }
        break;
      case 'c': // DA - Device Attributes
        if (params[0] === 0) {
          // Report as VT100 with Advanced Video Option
          this._emit(TerminalEvent.Data, '\x1b[?1;2c');
        }
        break;
      case 'q': // DECSCUSR - Set Cursor Style
        if (intermediates === ' ') {
          const style = params[0] || 1;
          switch (style) {
            case 1: this._cursorStyle = 'block'; this._cursorBlink = true; break;
            case 2: this._cursorStyle = 'block'; this._cursorBlink = false; break;
            case 3: this._cursorStyle = 'underline'; this._cursorBlink = true; break;
            case 4: this._cursorStyle = 'underline'; this._cursorBlink = false; break;
            case 5: this._cursorStyle = 'bar'; this._cursorBlink = true; break;
            case 6: this._cursorStyle = 'bar'; this._cursorBlink = false; break;
          }
        }
        break;
      case 'd': // VPA - Vertical Position Absolute
        this._cursorY = Math.max(0, Math.min(this._param(params, 0, 1) - 1, this._buffer.rows - 1));
        break;
      default:
        // Unknown CSI sequence - ignore silently
        break;
    }
  }

  /** Handle ESC sequences */
  private _handleESC(seq: ESCSequence): void {
    switch (seq.final) {
      case '7': // DECSC - Save Cursor
        this._savedCursorX = this._cursorX;
        this._savedCursorY = this._cursorY;
        this._savedFg = this._currentFg;
        this._savedBg = this._currentBg;
        this._savedStyle = { ...this._currentStyle };
        break;
      case '8': // DECRC - Restore Cursor
        this._cursorX = this._savedCursorX;
        this._cursorY = this._savedCursorY;
        this._currentFg = this._savedFg;
        this._currentBg = this._savedBg;
        this._currentStyle = { ...this._savedStyle };
        break;
      case 'D': // IND - Index (move down, scroll if needed)
        this._lineFeed();
        break;
      case 'M': // RI - Reverse Index (move up, scroll if needed)
        if (this._cursorY === this._buffer.scrollRegion.top) {
          this._buffer.scrollDown(1);
        } else if (this._cursorY > 0) {
          this._cursorY--;
        }
        break;
      case 'E': // NEL - Next Line
        this._cursorX = 0;
        this._lineFeed();
        break;
      case 'c': // RIS - Reset to Initial State
        this.reset();
        break;
      case '[': // Ignore (shouldn't happen, CSI is handled separately)
        break;
      default:
        break;
    }
  }

  /** Handle OSC sequences */
  private _handleOSC(seq: OSCSequence): void {
    const { command } = seq;
    const semicolonIndex = command.indexOf(';');

    if (semicolonIndex === -1) return;

    const code = command.substring(0, semicolonIndex);
    const data = command.substring(semicolonIndex + 1);

    switch (code) {
      case '0': // Set window title and icon name
      case '1': // Set icon name
      case '2': // Set window title
        this._title = data;
        this._emit(TerminalEvent.Title, data);
        break;
      case '10': // Set foreground color
        // Could implement dynamic color setting
        break;
      case '11': // Set background color
        break;
      case '52': // Clipboard access
        break;
      default:
        break;
    }
  }

  /** Handle SGR (Select Graphic Rendition) - text attributes */
  private _handleSGR(params: number[]): void {
    if (params.length === 0) {
      params = [0];
    }

    for (let i = 0; i < params.length; i++) {
      const p = params[i];

      switch (p) {
        case 0: // Reset
          this._currentStyle = {
            bold: false, dim: false, italic: false, underline: false,
            blink: false, inverse: false, hidden: false, strikethrough: false,
            doubleWidth: false,
          };
          this._currentFg = 7;
          this._currentBg = 0;
          break;
        case 1: // Bold
          this._currentStyle.bold = true;
          break;
        case 2: // Dim
          this._currentStyle.dim = true;
          break;
        case 3: // Italic
          this._currentStyle.italic = true;
          break;
        case 4: // Underline
          this._currentStyle.underline = true;
          break;
        case 5: // Slow blink
          this._currentStyle.blink = true;
          break;
        case 7: // Inverse
          this._currentStyle.inverse = true;
          break;
        case 8: // Hidden
          this._currentStyle.hidden = true;
          break;
        case 9: // Strikethrough
          this._currentStyle.strikethrough = true;
          break;
        case 22: // Normal intensity (not bold, not dim)
          this._currentStyle.bold = false;
          this._currentStyle.dim = false;
          break;
        case 23: // Not italic
          this._currentStyle.italic = false;
          break;
        case 24: // Not underlined
          this._currentStyle.underline = false;
          break;
        case 25: // Not blinking
          this._currentStyle.blink = false;
          break;
        case 27: // Not inverse
          this._currentStyle.inverse = false;
          break;
        case 28: // Not hidden
          this._currentStyle.hidden = false;
          break;
        case 29: // Not strikethrough
          this._currentStyle.strikethrough = false;
          break;
        case 30: case 31: case 32: case 33:
        case 34: case 35: case 36: case 37:
          // Set foreground color (standard 0-7)
          this._currentFg = p - 30;
          break;
        case 38: // Set foreground color (extended)
          i = this._handleExtendedColor(params, i, false);
          break;
        case 39: // Default foreground color
          this._currentFg = 7;
          break;
        case 40: case 41: case 42: case 43:
        case 44: case 45: case 46: case 47:
          // Set background color (standard 0-7)
          this._currentBg = p - 40;
          break;
        case 48: // Set background color (extended)
          i = this._handleExtendedColor(params, i, true);
          break;
        case 49: // Default background color
          this._currentBg = 0;
          break;
        case 90: case 91: case 92: case 93:
        case 94: case 95: case 96: case 97:
          // Set foreground color (bright 8-15)
          this._currentFg = p - 90 + 8;
          break;
        case 100: case 101: case 102: case 103:
        case 104: case 105: case 106: case 107:
          // Set background color (bright 8-15)
          this._currentBg = p - 100 + 8;
          break;
        default:
          break;
      }
    }
  }

  /** Handle extended color (256-color and true color) */
  private _handleExtendedColor(params: number[], index: number, isBg: boolean): number {
    if (index + 1 >= params.length) return index;

    const type = params[index + 1];

    if (type === 5 && index + 2 < params.length) {
      // 256-color mode
      const colorIndex = params[index + 2];
      if (isBg) {
        this._currentBg = colorIndex;
      } else {
        this._currentFg = colorIndex;
      }
      return index + 2;
    }

    if (type === 2 && index + 4 < params.length) {
      // True color (RGB)
      const r = params[index + 2];
      const g = params[index + 3];
      const b = params[index + 4];
      const color: TerminalColor = [r, g, b];
      if (isBg) {
        this._currentBg = color;
      } else {
        this._currentFg = color;
      }
      return index + 4;
    }

    return index;
  }

  /** Handle private mode CSI sequences (? prefix) */
  private _handlePrivateModeCSI(params: number[], final: string): void {
    switch (final) {
      case 'h': // Set private mode
        this._handleSetMode(params, true);
        break;
      case 'l': // Reset private mode
        this._handleResetMode(params, true);
        break;
    }
  }

  /** Handle mode setting */
  private _handleSetMode(params: number[], isPrivate: boolean): void {
    for (const p of params) {
      if (isPrivate) {
        switch (p) {
          case 1: // DECCKM - Application Cursor Keys
            this._cursorKeyMode = true;
            break;
          case 3: // DECCOLM - 132 Column Mode
            this._columnMode = true;
            break;
          case 6: // DECOM - Origin Mode
            this._originMode = true;
            break;
          case 7: // DECAWM - Auto Wrap Mode
            this._autoWrap = true;
            break;
          case 12: // Start blinking cursor
            this._cursorBlink = true;
            break;
          case 25: // Show cursor
            this._cursorVisible = true;
            break;
          case 1049: // Save cursor and switch to alternate screen
            // Simplified: just save cursor
            this._savedCursorX = this._cursorX;
            this._savedCursorY = this._cursorY;
            break;
        }
      } else {
        switch (p) {
          case 4: // Insert Mode
            this._insertMode = true;
            break;
        }
      }
    }
  }

  /** Handle mode resetting */
  private _handleResetMode(params: number[], isPrivate: boolean): void {
    for (const p of params) {
      if (isPrivate) {
        switch (p) {
          case 1: // DECCKM - Normal Cursor Keys
            this._cursorKeyMode = false;
            break;
          case 3: // DECCOLM - 80 Column Mode
            this._columnMode = false;
            break;
          case 6: // DECOM - Normal Mode
            this._originMode = false;
            break;
          case 7: // DECAWM - No Auto Wrap
            this._autoWrap = false;
            break;
          case 12: // Stop blinking cursor
            this._cursorBlink = false;
            break;
          case 25: // Hide cursor
            this._cursorVisible = false;
            break;
          case 1049: // Restore cursor and switch back from alternate screen
            this._cursorX = this._savedCursorX;
            this._cursorY = this._savedCursorY;
            break;
        }
      } else {
        switch (p) {
          case 4: // Replace Mode
            this._insertMode = false;
            break;
        }
      }
    }
  }

  // =============================================
  // Cursor Movement Helpers
  // =============================================

  private _cursorUp(n: number): void {
    const minY = this._originMode ? this._buffer.scrollRegion.top : 0;
    this._cursorY = Math.max(this._cursorY - n, minY);
  }

  private _cursorDown(n: number): void {
    const maxY = this._originMode ? this._buffer.scrollRegion.bottom : this._buffer.rows - 1;
    this._cursorY = Math.min(this._cursorY + n, maxY);
  }

  private _cursorForward(n: number): void {
    this._cursorX = Math.min(this._cursorX + n, this._buffer.cols - 1);
  }

  private _cursorBack(n: number): void {
    this._cursorX = Math.max(this._cursorX - n, 0);
  }

  private _tab(): void {
    // Move to the next tab stop
    for (let x = this._cursorX + 1; x < this._buffer.cols; x++) {
      if (this._tabStops[x]) {
        this._cursorX = x;
        return;
      }
    }
    // No tab stop found, go to end of line
    this._cursorX = this._buffer.cols - 1;
  }

  private _lineFeed(): void {
    if (this._cursorY === this._buffer.scrollRegion.bottom) {
      this._buffer.scrollUp(1);
    } else if (this._cursorY < this._buffer.rows - 1) {
      this._cursorY++;
    }
    this._emit(TerminalEvent.LineFeed);
  }

  // =============================================
  // Utilities
  // =============================================

  /** Get a parameter with default value */
  private _param(params: number[], index: number, defaultValue: number): number {
    return params.length > index && params[index] !== 0 ? params[index] : defaultValue;
  }

  /** Request a render update */
  private _requestRender(): void {
    if (this._renderer) {
      this._renderer.setCursor({
        x: this._cursorX,
        y: this._cursorY,
        visible: this._cursorVisible,
        style: this._cursorStyle,
        blink: this._cursorBlink,
      });
      this._renderer.markDirty();
      this._renderer.scheduleRender();
    }
  }

  /** Handle window resize */
  private _handleResize(): void {
    // Could auto-resize based on container
  }

  /** Emit an event */
  private _emit(event: TerminalEvent, ...args: any[]): void {
    this._eventHandlers.get(event)?.forEach(cb => cb(...args));
  }
}