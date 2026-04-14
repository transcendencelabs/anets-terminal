/**
 * 50 Most Popular Monospace Fonts
 * Ordered by popularity and web availability
 */
export const POPULAR_MONOSPACE_FONTS = [
  // Web-safe fonts
  'Courier New, Courier, monospace',
  'Consolas, monospace',
  'Menlo, Monaco, monospace',
  'Monaco, monospace',
  'Lucida Console, monospace',
  
  // Google Fonts & Modern
  'Fira Code, monospace',
  'JetBrains Mono, monospace',
  'Inconsolata, monospace',
  'Source Code Pro, monospace',
  'Roboto Mono, monospace',
  'IBM Plex Mono, monospace',
  'Droid Sans Mono, monospace',
  'Ubuntu Mono, monospace',
  'DejaVu Sans Mono, monospace',
  'Liberation Mono, monospace',
  
  // Professional/Modern
  'Operator Mono, monospace',
  'Hack, monospace',
  'Anonymous Pro, monospace',
  'Input, monospace',
  'Iosevka, monospace',
  'Fantasque Sans Mono, monospace',
  'Overpass Mono, monospace',
  'Cousine, monospace',
  'Space Mono, monospace',
  'VT323, monospace',
  
  // Stylish/Trendy
  'SFMono-Regular, SF Mono, monospace',
  'Cascadia Code, monospace',
  'Cascadia Mono, monospace',
  'Noto Sans Mono, monospace',
  'Noto Mono, monospace',
  'Computer Modern, monospace',
  'Courier, monospace',
  'Bitstream Vera Sans Mono, monospace',
  'PT Mono, monospace',
  'Inconsolata for Powerline, monospace',
  
  // Terminal/System Fonts
  'Terminus, monospace',
  'xterm, monospace',
  'Monospace, monospace',
  'Mono, monospace',
  'Courier 10 Pitch, monospace',
  'Nimbus Mono, monospace',
  'NimbusMono-Regular, monospace',
  'Courier Prime, monospace',
  'Courier Prime Sans, monospace',
  
  // Gaming/Retro
  'Pixelated, monospace',
  'Perfect DOS VGA 437, monospace',
  'Press Start 2P, monospace',
];

/** Get a curated list of fonts with descriptions */
export const FONT_CATALOG = [
  {
    name: 'Fira Code',
    fallback: 'Fira Code, Consolas, monospace',
    description: 'Modern, highly legible, excellent for code with ligatures',
    category: 'Modern',
  },
  {
    name: 'JetBrains Mono',
    fallback: 'JetBrains Mono, monospace',
    description: 'Professional typeface designed by JetBrains, widely used',
    category: 'Professional',
  },
  {
    name: 'Consolas',
    fallback: 'Consolas, Courier New, monospace',
    description: 'Classic Windows code font, very readable',
    category: 'Web-safe',
  },
  {
    name: 'Source Code Pro',
    fallback: 'Source Code Pro, monospace',
    description: 'Adobe\'s monospace font, clean and modern',
    category: 'Modern',
  },
  {
    name: 'Ubuntu Mono',
    fallback: 'Ubuntu Mono, monospace',
    description: 'Ubuntu\'s monospace font, system default on Linux',
    category: 'System',
  },
  {
    name: 'Courier New',
    fallback: 'Courier New, Courier, monospace',
    description: 'Classic, widely available web-safe font',
    category: 'Web-safe',
  },
  {
    name: 'Roboto Mono',
    fallback: 'Roboto Mono, monospace',
    description: 'Google\'s modern monospace family',
    category: 'Modern',
  },
  {
    name: 'IBM Plex Mono',
    fallback: 'IBM Plex Mono, monospace',
    description: 'IBM\'s open source monospace font',
    category: 'Professional',
  },
  {
    name: 'Iosevka',
    fallback: 'Iosevka, monospace',
    description: 'Highly customizable, versatile monospace font',
    category: 'Modern',
  },
  {
    name: 'Hack',
    fallback: 'Hack, monospace',
    description: 'Designed for source code, clear and readable',
    category: 'Modern',
  },
];
