import { Buffer } from './Buffer';
import { CharCell, TerminalTheme, CursorState, TerminalColor, SelectionState } from './Types';
import { DEFAULT_THEME } from './Theme';

/** Character metrics for font rendering */
interface CharMetrics {
  width: number;
  height: number;
  baseline: number;
}

/**
 * Canvas-based terminal renderer
 * Draws the terminal buffer, cursor, and selection onto an HTML5 Canvas
 */
export class Renderer {
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;
  private _buffer: Buffer;
  private _theme: TerminalTheme;
  private _fontFamily: string;
  private _fontSize: number;
  private _lineHeight: number;
  private _letterSpacing: number;
  private _charMetrics: CharMetrics = { width: 0, height: 0, baseline: 0 };
  private _devicePixelRatio: number;
  private _cursor: CursorState;
  private _selection: SelectionState | null = null;
  private _cursorBlinkState: boolean = true;
  private _cursorBlinkTimer: number | null = null;
  private _animationFrame: number | null = null;
  private _dirty: boolean = true;
  private _scrollOffset: number = 0;

  constructor(
    canvas: HTMLCanvasElement,
    buffer: Buffer,
    theme: TerminalTheme,
    fontFamily: string,
    fontSize: number,
    lineHeight: number,
    letterSpacing: number,
  ) {
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d', { alpha: false })!;
    this._buffer = buffer;
    this._theme = theme;
    this._fontFamily = fontFamily;
    this._fontSize = fontSize;
    this._lineHeight = lineHeight;
    this._letterSpacing = letterSpacing;
    this._devicePixelRatio = window.devicePixelRatio || 1;
    this._cursor = {
      x: 0,
      y: 0,
      visible: true,
      style: 'block',
      blink: true,
    };

    this._measureChar();
    this._startCursorBlink();
  }

  /** Measure character dimensions based on current font */
  private _measureChar(): void {
    const ctx = this._ctx;
    ctx.font = this._getFontString();
    const metrics = ctx.measureText('M');
    
    this._charMetrics.width = Math.ceil(metrics.width) + this._letterSpacing;
    this._charMetrics.height = Math.ceil(this._fontSize * this._lineHeight);
    this._charMetrics.baseline = Math.ceil(
      metrics.actualBoundingBoxAscent || this._fontSize
    );
  }

  /** Get the CSS font string */
  private _getFontString(bold: boolean = false, italic: boolean = false): string {
    const parts: string[] = [];
    if (italic) parts.push('italic');
    if (bold) parts.push('bold');
    parts.push(`${this._fontSize}px`);
    parts.push(this._fontFamily);
    return parts.join(' ');
  }

  /** Get character metrics */
  get charMetrics(): CharMetrics {
    return { ...this._charMetrics };
  }

  /** Get the pixel dimensions of the terminal */
  get dimensions(): { width: number; height: number; cellWidth: number; cellHeight: number } {
    return {
      width: this._buffer.cols * this._charMetrics.width,
      height: this._buffer.rows * this._charMetrics.height,
      cellWidth: this._charMetrics.width,
      cellHeight: this._charMetrics.height,
    };
  }

  /** Update cursor state */
  setCursor(cursor: CursorState): void {
    this._cursor = { ...cursor };
    this._dirty = true;
    this._resetCursorBlink();
  }

  /** Update selection */
  setSelection(selection: SelectionState | null): void {
    this._selection = selection;
    this._dirty = true;
  }

  /** Set scroll offset for scrollback viewing */
  setScrollOffset(offset: number): void {
    this._scrollOffset = offset;
    this._dirty = true;
  }

  /** Mark the renderer as needing a redraw */
  markDirty(): void {
    this._dirty = true;
  }

  /** Resize the canvas to match the buffer dimensions */
  resize(cols: number, rows: number): void {
    this._devicePixelRatio = window.devicePixelRatio || 1;
    const width = cols * this._charMetrics.width;
    const height = rows * this._charMetrics.height;

    this._canvas.width = width * this._devicePixelRatio;
    this._canvas.height = height * this._devicePixelRatio;
    this._canvas.style.width = `${width}px`;
    this._canvas.style.height = `${height}px`;

    this._ctx.setTransform(this._devicePixelRatio, 0, 0, this._devicePixelRatio, 0, 0);
    this._dirty = true;
  }

  /** Full render of the terminal */
  render(): void {
    const ctx = this._ctx;
    const { width, height, cellWidth, cellHeight } = this.dimensions;

    // Clear with background color
    ctx.fillStyle = this._theme.background;
    ctx.fillRect(0, 0, width, height);

    // Draw buffer content
    this._renderBuffer(ctx, cellWidth, cellHeight);

    // Draw selection
    if (this._selection && this._selection.start && this._selection.end) {
      this._renderSelection(ctx, cellWidth, cellHeight);
    }

    // Draw cursor
    if (this._cursor.visible) {
      this._renderCursor(ctx, cellWidth, cellHeight);
    }

    this._dirty = false;
  }

  /** Schedule a render on the next animation frame */
  scheduleRender(): void {
    if (this._animationFrame !== null) return;
    this._animationFrame = requestAnimationFrame(() => {
      this._animationFrame = null;
      if (this._dirty) {
        this.render();
      }
    });
  }

  /** Render the buffer content */
  private _renderBuffer(ctx: CanvasRenderingContext2D, cellWidth: number, cellHeight: number): void {
    const buffer = this._buffer;
    const scrollOffset = this._scrollOffset;

    for (let row = 0; row < buffer.rows; row++) {
      // Determine the actual buffer line (accounting for scroll offset)
      const bufferRow = row;
      const line = buffer.getLine(bufferRow);
      const y = row * cellHeight;

      let col = 0;
      while (col < buffer.cols) {
        const cell = line[col];
        const x = col * cellWidth;

        // Draw background
        const bgColor = this._resolveColor(cell.bg, true);
        ctx.fillStyle = bgColor;
        ctx.fillRect(x, y, cellWidth * cell.width, cellHeight);

        // Draw the character
        if (cell.char && cell.char !== ' ') {
          const fgColor = cell.style.inverse
            ? this._resolveColor(cell.bg, true)
            : this._resolveColor(cell.fg, false, cell.style.bold, cell.style.dim);

          ctx.font = this._getFontString(cell.style.bold, cell.style.italic);
          ctx.fillStyle = fgColor;
          ctx.textBaseline = 'middle';

          // Center the character vertically
          const textY = y + cellHeight / 2;

          if (cell.style.underline) {
            ctx.save();
            ctx.fillText(cell.char, x + this._letterSpacing / 2, textY);
            ctx.strokeStyle = fgColor;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, y + cellHeight - 1);
            ctx.lineTo(x + cellWidth * cell.width, y + cellHeight - 1);
            ctx.stroke();
            ctx.restore();
          } else {
            ctx.fillText(cell.char, x + this._letterSpacing / 2, textY);
          }

          if (cell.style.strikethrough) {
            ctx.strokeStyle = fgColor;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, y + cellHeight / 2);
            ctx.lineTo(x + cellWidth * cell.width, y + cellHeight / 2);
            ctx.stroke();
          }
        }

        col += cell.width;
      }
    }
  }

  /** Render selection highlight */
  private _renderSelection(ctx: CanvasRenderingContext2D, cellWidth: number, cellHeight: number): void {
    if (!this._selection || !this._selection.start || !this._selection.end) return;

    const { start, end } = this._normalizeSelection();
    if (!start || !end) return;

    ctx.fillStyle = this._theme.selectionBackground + '88'; // semi-transparent

    if (start.y === end.y) {
      // Same line selection
      ctx.fillRect(
        start.x * cellWidth,
        start.y * cellHeight,
        (end.x - start.x + 1) * cellWidth,
        cellHeight,
      );
    } else {
      // Multi-line selection
      // First line
      ctx.fillRect(
        start.x * cellWidth,
        start.y * cellHeight,
        (this._buffer.cols - start.x) * cellWidth,
        cellHeight,
      );
      // Middle lines
      for (let row = start.y + 1; row < end.y; row++) {
        ctx.fillRect(0, row * cellHeight, this._buffer.cols * cellWidth, cellHeight);
      }
      // Last line
      ctx.fillRect(
        0,
        end.y * cellHeight,
        (end.x + 1) * cellWidth,
        cellHeight,
      );
    }
  }

  /** Normalize selection so start <= end */
  private _normalizeSelection(): { start: { x: number; y: number } | null; end: { x: number; y: number } | null } {
    if (!this._selection?.start || !this._selection?.end) {
      return { start: null, end: null };
    }

    const start = this._selection.start;
    const end = this._selection.end;

    if (start.y < end.y || (start.y === end.y && start.x <= end.x)) {
      return { start, end };
    }
    return { start: end, end: start };
  }

  /** Render the cursor */
  private _renderCursor(ctx: CanvasRenderingContext2D, cellWidth: number, cellHeight: number): void {
    if (!this._cursorBlinkState && this._cursor.blink) return;

    const x = this._cursor.x * cellWidth;
    const y = this._cursor.y * cellHeight;

    ctx.save();

    switch (this._cursor.style) {
      case 'block':
        ctx.fillStyle = this._theme.cursor;
        ctx.fillRect(x, y, cellWidth, cellHeight);
        // Draw the character underneath in accent color
        const cell = this._buffer.getCell(this._cursor.x, this._cursor.y);
        if (cell.char && cell.char !== ' ') {
          ctx.font = this._getFontString(cell.style.bold, cell.style.italic);
          ctx.fillStyle = this._theme.cursorAccent;
          ctx.textBaseline = 'middle';
          ctx.fillText(cell.char, x + this._letterSpacing / 2, y + cellHeight / 2);
        }
        break;
      case 'underline':
        ctx.fillStyle = this._theme.cursor;
        ctx.fillRect(x, y + cellHeight - 2, cellWidth, 2);
        break;
      case 'bar':
        ctx.fillStyle = this._theme.cursor;
        ctx.fillRect(x, y, 2, cellHeight);
        break;
    }

    ctx.restore();
  }

  /** Resolve a TerminalColor to a CSS color string */
  private _resolveColor(
    color: TerminalColor,
    isBackground: boolean,
    bold: boolean = false,
    dim: boolean = false,
  ): string {
    // String color (direct CSS color)
    if (typeof color === 'string') {
      return color;
    }

    // RGB tuple
    if (Array.isArray(color)) {
      return `rgb(${color[0]},${color[1]},${color[2]})`;
    }

    // Default color (-1 means use theme default)
    const index = color as number;
    if (index === -1) {
      return isBackground ? this._theme.background : this._theme.foreground;
    }

    const themeColors = [
      this._theme.black,
      this._theme.red,
      this._theme.green,
      this._theme.yellow,
      this._theme.blue,
      this._theme.magenta,
      this._theme.cyan,
      this._theme.white,
      this._theme.brightBlack,
      this._theme.brightRed,
      this._theme.brightGreen,
      this._theme.brightYellow,
      this._theme.brightBlue,
      this._theme.brightMagenta,
      this._theme.brightCyan,
      this._theme.brightWhite,
    ];

    // Indices 0-7: standard colors, 8-15: bright colors
    if (index >= 0 && index < 8) {
      // Bold text uses bright colors
      if (bold && !isBackground) {
        return themeColors[index + 8];
      }
      return themeColors[index];
    }
    if (index >= 8 && index < 16) {
      return themeColors[index];
    }

    // 256-color: 216-color cube (indices 16-231)
    if (index >= 16 && index <= 231) {
      const cubeIndex = index - 16;
      const r = Math.floor(cubeIndex / 36);
      const g = Math.floor((cubeIndex % 36) / 6);
      const b = cubeIndex % 6;
      // Color cube values: 0, 95, 135, 175, 215, 255
      const cubeValues = [0, 95, 135, 175, 215, 255];
      return `rgb(${cubeValues[r]},${cubeValues[g]},${cubeValues[b]})`;
    }

    // 256-color: grayscale ramp (indices 232-255)
    if (index >= 232 && index <= 255) {
      const gray = 8 + (index - 232) * 10;
      return `rgb(${gray},${gray},${gray})`;
    }

    // Fallback to default
    return isBackground ? this._theme.background : this._theme.foreground;
  }

  /** Start cursor blink animation */
  private _startCursorBlink(): void {
    if (!this._cursor.blink) return;
    this._cursorBlinkState = true;
    this._cursorBlinkTimer = window.setInterval(() => {
      this._cursorBlinkState = !this._cursorBlinkState;
      this._dirty = true;
      this.scheduleRender();
    }, 600);
  }

  /** Reset cursor blink (on keypress, etc.) */
  private _resetCursorBlink(): void {
    this._cursorBlinkState = true;
    if (this._cursorBlinkTimer !== null) {
      clearInterval(this._cursorBlinkTimer);
    }
    this._startCursorBlink();
  }

  /** Update theme */
  setTheme(theme: TerminalTheme): void {
    this._theme = theme;
    this._dirty = true;
    this.scheduleRender();
  }

  /** Update font settings */
  setFont(fontFamily: string, fontSize: number, lineHeight: number, letterSpacing: number): void {
    this._fontFamily = fontFamily;
    this._fontSize = fontSize;
    this._lineHeight = lineHeight;
    this._letterSpacing = letterSpacing;
    this._measureChar();
    this._dirty = true;
    this.scheduleRender();
  }

  /** Dispose of the renderer */
  dispose(): void {
    if (this._cursorBlinkTimer !== null) {
      clearInterval(this._cursorBlinkTimer);
    }
    if (this._animationFrame !== null) {
      cancelAnimationFrame(this._animationFrame);
    }
  }

  /** Convert pixel coordinates to buffer cell coordinates */
  pixelToCell(px: number, py: number): { col: number; row: number } {
    return {
      col: Math.floor(px / this._charMetrics.width),
      row: Math.floor(py / this._charMetrics.height),
    };
  }
}