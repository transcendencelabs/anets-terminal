/**
 * Core types and interfaces for AnetsTerminal
 */

/** 8-bit color value (0-255) */
export type Color8Bit = number;

/** RGB color tuple */
export type RGB = [number, number, number];

/** Terminal color - can be a named color index, 8-bit, or RGB */
export type TerminalColor = number | RGB | string;

/** Text style attributes */
export interface TextStyle {
  bold: boolean;
  dim: boolean;
  italic: boolean;
  underline: boolean;
  blink: boolean;
  inverse: boolean;
  hidden: boolean;
  strikethrough: boolean;
  doubleWidth: boolean;
}

/** A single character cell in the terminal buffer */
export interface CharCell {
  /** The character (may be empty string for blank cells) */
  char: string;
  /** Foreground color */
  fg: TerminalColor;
  /** Background color */
  bg: TerminalColor;
  /** Text style attributes */
  style: TextStyle;
  /** Combined width (1 for single, 2 for wide chars) */
  width: number;
}

/** Cursor position and state */
export interface CursorState {
  x: number;
  y: number;
  visible: boolean;
  style: 'block' | 'underline' | 'bar';
  blink: boolean;
}

/** Scroll region (top/bottom rows for scrolling) */
export interface ScrollRegion {
  top: number;
  bottom: number;
}

/** Terminal buffer - the grid of character cells */
export interface IBuffer {
  /** Number of columns */
  cols: number;
  /** Number of visible rows */
  rows: number;
  /** Get a cell at position */
  getCell(x: number, y: number): CharCell;
  /** Get a complete line */
  getLine(y: number): CharCell[];
  /** Set a cell at position */
  setCell(x: number, y: number, cell: Partial<CharCell>): void;
  /** Clear the entire buffer */
  clear(): void;
  /** Scroll up by n lines within the scroll region */
  scrollUp(n: number): void;
  /** Scroll down by n lines within the scroll region */
  scrollDown(n: number): void;
  /** Erase in line */
  eraseInLine(y: number, mode: EraseMode): void;
  /** Erase in display */
  eraseInDisplay(mode: EraseMode): void;
}

/** Erase modes matching ANSI standards */
export enum EraseMode {
  /** From cursor to end */
  ToEnd = 0,
  /** From start to cursor */
  ToStart = 1,
  /** Entire line/display */
  Entire = 2,
}

/** Terminal theme colors */
export interface TerminalTheme {
  /** Background color */
  background: string;
  /** Default foreground (text) color */
  foreground: string;
  /** Cursor color */
  cursor: string;
  /** Cursor accent color */
  cursorAccent: string;
  /** Selection background color */
  selectionBackground: string;
  /** Selection foreground color */
  selectionForeground: string;
  /** ANSI color 0-7 (standard) */
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  /** ANSI color 8-15 (bright) */
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
}

/** Terminal options */
export interface TerminalOptions {
  /** Number of columns (default: 80) */
  cols?: number;
  /** Number of rows (default: 24) */
  rows?: number;
  /** Font family (default: 'Courier New, monospace') */
  fontFamily?: string;
  /** Font size in pixels (default: 15) */
  fontSize?: number;
  /** Line height multiplier (default: 1.2) */
  lineHeight?: number;
  /** Letter spacing in pixels (default: 0) */
  letterSpacing?: number;
  /** Padding inside the terminal (default: 4px) */
  padding?: number;
  /** Scrollback buffer size (default: 1000) */
  scrollback?: number;
  /** Theme colors */
  theme?: Partial<TerminalTheme>;
  /** Cursor style (default: 'block') */
  cursorStyle?: 'block' | 'underline' | 'bar';
  /** Cursor blink (default: true) */
  cursorBlink?: boolean;
  /** Allow transparency (default: false) */
  allowTransparency?: boolean;
  /** Whether the terminal is active/focused on open (default: false) */
  focusOnOpen?: boolean;
  /** Screen reader mode (default: false) */
  screenReaderMode?: boolean;
  /** Right click selects word (default: false) */
  rightClickSelectsWord?: boolean;
  /** Word separators for double-click selection */
  wordSeparators?: string;
  /** Draw bold text in bright colors (default: true) */
  drawBoldTextInBrightColors?: boolean;
  /** Show scrollbar (default: false) */
  showScrollbar?: boolean;
  /** Enable mousewheel scroll (default: true) */
  enableMouseScroll?: boolean;
}

/** Event types emitted by the terminal */
export enum TerminalEvent {
  Data = 'data',
  Binary = 'binary',
  Resize = 'resize',
  Title = 'title',
  Bell = 'bell',
  Focus = 'focus',
  Blur = 'blur',
  Selection = 'selection',
  Scroll = 'scroll',
  LineFeed = 'linefeed',
}

/** Event callback type */
export type EventCallback = (...args: any[]) => void;

/** Selection state */
export interface SelectionState {
  start: { x: number; y: number } | null;
  end: { x: number; y: number } | null;
  active: boolean;
}

/** Mouse button enumeration */
export enum MouseButton {
  Left = 0,
  Middle = 1,
  Right = 2,
}

/** Modifier keys state */
export interface ModifierState {
  shift: boolean;
  alt: boolean;
  ctrl: boolean;
  meta: boolean;
}