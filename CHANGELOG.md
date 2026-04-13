# Changelog

All notable changes to AnetsTerminal are documented in this file.

## [Unreleased]

### Added
- Full 256-color mode support (216-color cube + 24 grayscale tones)
- True color (24-bit RGB) background support
- Test color demo (`test-colors.html`) for verifying color rendering

### Fixed
- **Critical:** ANSI escape sequence parser now correctly recognizes ESC character
  - Previously, ESC (0x1b) was incorrectly caught by the C0 control character check
  - This fix enables all ANSI escape sequences including colors, cursor movement, etc.
- Default foreground/background colors (codes 39/49) now resolve to theme colors instead of ANSI 7/0
- SGR reset (code 0) properly initializes text attributes to theme defaults

### Changed
- Renderer now uses proper color cube values (0, 95, 135, 175, 215, 255) for 256-color indices 16-231
- Grayscale ramp uses proper luminance values (8-238) for indices 232-255

## [1.0.0] - Initial Release

### Features
- Canvas-based terminal emulator with HiDPI/Retina support
- 16 standard ANSI colors + bright variants
- Text styles: bold, dim, italic, underline, blink, inverse, strikethrough, hidden
- Configurable fonts, sizes, line height, and letter spacing
- Cursor styles: block, underline, bar (with optional blinking)
- Scrollback buffer with mouse navigation
- Mouse selection and clipboard copy
- Xterm.js-compatible API
- Built-in themes: Default, One Dark, Solarized Dark, Dracula
- WebSocket and custom backend support
- Full ANSI escape sequence support (CSI, OSC, Tab handling, etc.)
- Tab stops with customizable positions
- Cursor save/restore (DECSC/DECRC)
- Scroll regions with DECSTBM
- Insert/delete lines and characters
- Erase operations (display, line, characters)

### Documentation
- Comprehensive README with examples
- Interactive demo with simulated shell
- API reference and architecture overview
