/**
 * AnetsTerminal - An embeddable web-based terminal emulator
 * 
 * A lightweight, dependency-free terminal emulator that renders on HTML5 Canvas
 * and supports ANSI escape sequences, true color, scrollback, selection, and more.
 * 
 * @packageDocumentation
 */

// Main terminal class
export { AnetsTerminal } from './Terminal';

// Types and interfaces
export type {
  TerminalOptions,
  TerminalTheme,
  TerminalColor,
  CharCell,
  CursorState,
  TextStyle,
  SelectionState,
  EventCallback,
} from './Types';

export {
  TerminalEvent,
  EraseMode,
} from './Types';

// Buffer
export { Buffer, createBlankCell } from './Buffer';

// ANSI Parser
export { AnsiParser } from './AnsiParser';
export type { CSISequence, ESCSequence, OSCSequence, IParseCallbacks } from './AnsiParser';

// Themes
export {
  DEFAULT_THEME,
  ONE_DARK_THEME,
  SOLARIZED_DARK_THEME,
  DRACULA_THEME,
  mergeTheme,
} from './Theme';

// Backend connectors
export { WebSocketBackend, BaseBackend, attachWebSocket } from './Backend';

// Popular fonts
export { POPULAR_MONOSPACE_FONTS, FONT_CATALOG } from './PopularFonts';
