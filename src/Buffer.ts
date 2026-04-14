import { CharCell, TextStyle, EraseMode, ScrollRegion, TerminalColor } from './Types';

/** Default style for a blank cell */
const DEFAULT_STYLE: TextStyle = {
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

/** Default foreground color index (white in ANSI) */
const DEFAULT_FG: TerminalColor = 7;

/** Default background color index (black in ANSI) */
const DEFAULT_BG: TerminalColor = 0;

/** Create a blank character cell */
export function createBlankCell(): CharCell {
  return {
    char: ' ',
    fg: DEFAULT_FG,
    bg: DEFAULT_BG,
    style: { ...DEFAULT_STYLE },
    width: 1,
  };
}

/**
 * Terminal Buffer - stores the grid of character cells
 * Manages visible area and scrollback history
 */
export class Buffer {
  /** Number of columns */
  public cols: number;
  /** Number of visible rows */
  public rows: number;
  /** Maximum scrollback lines */
  public scrollbackLimit: number;

  /** The visible buffer lines */
  private _lines: CharCell[][];
  /** Scrollback lines (above visible area) */
  private _scrollback: CharCell[][];
  /** Current scroll offset (0 = bottom, positive = scrolled up) */
  private _scrollOffset: number = 0;
  /** Scroll region (null = full screen) */
  private _scrollRegion: ScrollRegion | null = null;
  /** Saved cursor position for DECSC/DECRC */
  private _savedCursorX: number = 0;
  private _savedCursorY: number = 0;

  constructor(cols: number, rows: number, scrollback: number = 1000) {
    this.cols = cols;
    this.rows = rows;
    this.scrollbackLimit = scrollback;
    this._lines = [];
    this._scrollback = [];
    this._initLines();
  }

  private _initLines(): void {
    this._lines = [];
    for (let y = 0; y < this.rows; y++) {
      this._lines.push(this._createBlankLine());
    }
  }

  private _createBlankLine(): CharCell[] {
    const line: CharCell[] = [];
    for (let x = 0; x < this.cols; x++) {
      line.push(createBlankCell());
    }
    return line;
  }

  /** Get the scroll offset */
  get scrollOffset(): number {
    return this._scrollOffset;
  }

  /** Get scrollback line count */
  get scrollbackLength(): number {
    return this._scrollback.length;
  }

  /** Get the scroll region */
  get scrollRegion(): ScrollRegion {
    return this._scrollRegion || { top: 0, bottom: this.rows - 1 };
  }

  /** Set the scroll region */
  set scrollRegion(region: ScrollRegion | null) {
    this._scrollRegion = region;
  }

  /** Save cursor position */
  saveCursor(x: number, y: number): void {
    this._savedCursorX = x;
    this._savedCursorY = y;
  }

  /** Restore cursor position */
  restoreCursor(): { x: number; y: number } {
    return { x: this._savedCursorX, y: this._savedCursorY };
  }

  /** Get a cell at position considering scroll offset */
  getCell(x: number, y: number): CharCell {
    // Apply scroll offset
    const effectiveY = y - this._scrollOffset;
    
    if (effectiveY < 0) {
      // Line is in scrollback
      const scrollbackIndex = this._scrollback.length - this._scrollOffset + y;
      if (scrollbackIndex >= 0 && scrollbackIndex < this._scrollback.length && x >= 0 && x < this.cols) {
        return this._scrollback[scrollbackIndex][x];
      }
      return createBlankCell();
    }
    
    if (y < 0 || y >= this.rows || x < 0 || x >= this.cols) {
      return createBlankCell();
    }
    return this._lines[effectiveY][x];
  }

  /** Get a complete line considering scroll offset */
  getLine(y: number): CharCell[] {
    // Apply scroll offset: lines from scrollback are shown first when scrolled up
    const effectiveY = y - this._scrollOffset;
    
    if (effectiveY < 0) {
      // This line is in scrollback (visible when scrolled up)
      const scrollbackIndex = this._scrollback.length - this._scrollOffset + y;
      if (scrollbackIndex >= 0 && scrollbackIndex < this._scrollback.length) {
        return this._scrollback[scrollbackIndex];
      }
      return this._createBlankLine();
    }
    
    if (effectiveY >= this.rows) {
      return this._createBlankLine();
    }
    
    return this._lines[effectiveY];
  }

  /** Set a cell at position */
  setCell(x: number, y: number, cell: Partial<CharCell>): void {
    if (y < 0 || y >= this.rows || x < 0 || x >= this.cols) {
      return;
    }
    const existing = this._lines[y][x];
    this._lines[y][x] = { ...existing, ...cell };
    // If style is provided, merge it
    if (cell.style) {
      this._lines[y][x].style = { ...existing.style, ...cell.style };
    }
  }

  /** Clear the entire buffer */
  clear(): void {
    this._initLines();
    this._scrollback = [];
    this._scrollOffset = 0;
  }

  /** Scroll up by n lines within the scroll region */
  scrollUp(n: number = 1): void {
    if (n <= 0) return;
    const region = this.scrollRegion;

    for (let i = 0; i < n; i++) {
      // Move the top line of the scroll region to scrollback
      const topLine = this._lines[region.top];
      if (this.scrollbackLimit > 0) {
        this._scrollback.push(topLine);
        // Trim scrollback if it exceeds the limit
        while (this._scrollback.length > this.scrollbackLimit) {
          this._scrollback.shift();
        }
      }

      // Shift lines up within the scroll region
      for (let y = region.top; y < region.bottom; y++) {
        this._lines[y] = this._lines[y + 1];
      }

      // Insert a blank line at the bottom of the scroll region
      this._lines[region.bottom] = this._createBlankLine();
    }
  }

  /** Scroll down by n lines within the scroll region */
  scrollDown(n: number = 1): void {
    if (n <= 0) return;
    const region = this.scrollRegion;

    for (let i = 0; i < n; i++) {
      // Shift lines down within the scroll region
      for (let y = region.bottom; y > region.top; y--) {
        this._lines[y] = this._lines[y - 1];
      }

      // Insert a blank line at the top of the scroll region
      this._lines[region.top] = this._createBlankLine();
    }
  }

  /** Erase in line */
  eraseInLine(y: number, mode: EraseMode): void {
    if (y < 0 || y >= this.rows) return;

    switch (mode) {
      case EraseMode.ToEnd:
        for (let x = 0; x < this.cols; x++) {
          this._lines[y][x] = createBlankCell();
        }
        break;
      case EraseMode.ToStart:
        for (let x = 0; x < this.cols; x++) {
          this._lines[y][x] = createBlankCell();
        }
        break;
      case EraseMode.Entire:
        this._lines[y] = this._createBlankLine();
        break;
    }
  }

  /** Erase in display from cursor position */
  eraseInDisplay(cursorX: number, cursorY: number, mode: EraseMode): void {
    switch (mode) {
      case EraseMode.ToEnd:
        // Clear from cursor to end of line
        for (let x = cursorX; x < this.cols; x++) {
          this._lines[cursorY][x] = createBlankCell();
        }
        // Clear all lines below
        for (let y = cursorY + 1; y < this.rows; y++) {
          this._lines[y] = this._createBlankLine();
        }
        break;
      case EraseMode.ToStart:
        // Clear from start to cursor
        for (let x = 0; x <= cursorX; x++) {
          this._lines[cursorY][x] = createBlankCell();
        }
        // Clear all lines above
        for (let y = 0; y < cursorY; y++) {
          this._lines[y] = this._createBlankLine();
        }
        break;
      case EraseMode.Entire:
        for (let y = 0; y < this.rows; y++) {
          this._lines[y] = this._createBlankLine();
        }
        break;
    }
  }

  /** Insert blank lines at the current position */
  insertLines(y: number, n: number): void {
    const region = this.scrollRegion;
    if (y < region.top || y > region.bottom) return;

    for (let i = 0; i < n && region.bottom - i >= y; i++) {
      // Shift lines down
      for (let row = region.bottom; row > y; row--) {
        this._lines[row] = this._lines[row - 1];
      }
      this._lines[y] = this._createBlankLine();
    }
  }

  /** Delete lines at the current position */
  deleteLines(y: number, n: number): void {
    const region = this.scrollRegion;
    if (y < region.top || y > region.bottom) return;

    for (let i = 0; i < n; i++) {
      // Shift lines up
      for (let row = y; row < region.bottom; row++) {
        this._lines[row] = this._lines[row + 1];
      }
      this._lines[region.bottom] = this._createBlankLine();
    }
  }

  /** Insert blank characters at position, shifting existing chars right */
  insertChars(y: number, x: number, n: number): void {
    if (y < 0 || y >= this.rows) return;
    const line = this._lines[y];

    // Shift characters right
    for (let col = this.cols - 1; col >= x + n; col--) {
      line[col] = line[col - n];
    }

    // Fill inserted positions with blanks
    for (let col = x; col < Math.min(x + n, this.cols); col++) {
      line[col] = createBlankCell();
    }
  }

  /** Delete characters at position, shifting remaining chars left */
  deleteChars(y: number, x: number, n: number): void {
    if (y < 0 || y >= this.rows) return;
    const line = this._lines[y];

    // Shift characters left
    for (let col = x; col < this.cols - n; col++) {
      line[col] = line[col + n];
    }

    // Fill the vacated positions at the end with blanks
    for (let col = this.cols - n; col < this.cols; col++) {
      line[col] = createBlankCell();
    }
  }

  /** Scroll the viewport (positive = scroll up / view scrollback) */
  scrollTo(offset: number): void {
    const maxOffset = this._scrollback.length;
    this._scrollOffset = Math.max(0, Math.min(offset, maxOffset));
    
    // When scrolling, clamp cursor to visible area
    // (cursor should stay visible when scrolling through scrollback)
    if (this._scrollOffset > 0) {
      // If cursor would be off-screen due to scroll, it will be handled by getLine/getCell
    }
  }

  /** Get a scrollback line */
  getScrollbackLine(index: number): CharCell[] | null {
    if (index < 0 || index >= this._scrollback.length) return null;
    return this._scrollback[index];
  }

  /** Get the visible lines considering scroll offset */
  getVisibleLines(): CharCell[][] {
    return this._lines;
  }

  /** Resize the buffer */
  resize(cols: number, rows: number): void {
    if (cols === this.cols && rows === this.rows) return;

    // If columns changed, truncate or extend each line
    if (cols !== this.cols) {
      for (let y = 0; y < this.rows; y++) {
        if (cols < this.cols) {
          this._lines[y] = this._lines[y].slice(0, cols);
        } else {
          const line = this._lines[y];
          for (let x = this.cols; x < cols; x++) {
            line.push(createBlankCell());
          }
        }
      }
    }

    // If rows changed, add or remove lines
    if (rows < this.rows) {
      // Shrink: move excess lines to scrollback
      const excess = this.rows - rows;
      for (let i = 0; i < excess; i++) {
        this._scrollback.push(this._lines[i]);
        while (this._scrollback.length > this.scrollbackLimit) {
          this._scrollback.shift();
        }
      }
      this._lines = this._lines.slice(excess);
    } else if (rows > this.rows) {
      // Grow: add blank lines
      for (let y = this.rows; y < rows; y++) {
        this._lines.push(this._createBlankLine());
      }
    }

    this.cols = cols;
    this.rows = rows;
    this._scrollOffset = 0;
    this._scrollRegion = null;
  }

  /** Get the line count */
  get lineCount(): number {
    return this._lines.length;
  }

  /** Fill a line with blank cells from startX to end */
  fillLineBlank(y: number, startX: number, endX: number): void {
    if (y < 0 || y >= this.rows) return;
    for (let x = startX; x <= endX && x < this.cols; x++) {
      this._lines[y][x] = createBlankCell();
    }
  }

  /** Get all lines as strings (for debugging/testing) */
  toString(): string {
    return this._lines.map(line =>
      line.map(cell => cell.char).join('')
    ).join('\n');
  }
}