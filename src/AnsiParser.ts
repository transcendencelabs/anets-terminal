/**
 * ANSI Escape Sequence Parser
 * 
 * Parses raw byte streams from a terminal backend into structured
 * commands that the terminal engine can execute.
 * 
 * Supports:
 * - CSI (Control Sequence Introducer) sequences: ESC [ ... <final>
 * - OSC (Operating System Command) sequences: ESC ] ... BEL/ST
 * - ESC sequences: ESC <intermediate> <final>
 * - SGR (Select Graphic Rendition) attributes
 * - Cursor movement, scrolling, erase operations
 * - Mode setting/resetting
 * - Mouse tracking
 * - Window operations
 */

/** Parser states */
enum ParserState {
  NORMAL = 0,
  ESC = 1,
  CSI_PARAM = 2,
  CSI_INTERMEDIATE = 3,
  OSC = 4,
  OSC_ESC = 5,
  ESC_INTERMEDIATE = 6,
  DCS = 7,
  DCS_PARAM = 8,
  DCS_INTERMEDIATE = 9,
  DCS_PASSTHROUGH = 10,
  SOS = 11,
  PM = 12,
  APC = 13,
}

/** Parsed CSI sequence */
export interface CSISequence {
  prefix: string;
  params: number[];
  intermediates: string;
  final: string;
}

/** Parsed OSC sequence */
export interface OSCSequence {
  command: string;
}

/** Parsed ESC sequence */
export interface ESCSequence {
  intermediate: string;
  final: string;
}

/** Callback types for parsed sequences */
export interface IParseCallbacks {
  /** Print a character */
  print?(char: string, code: number): void;
  /** Execute a control character (C0) */
  execute?(code: number): void;
  /** CSI sequence parsed */
  CSI?(sequence: CSISequence): void;
  /** ESC sequence parsed */
  ESC?(sequence: ESCSequence): void;
  /** OSC sequence parsed */
  OSC?(sequence: OSCSequence): void;
  /** Error in parsing */
  error?(state: ParserState, data: number): void;
}

/**
 * ANSI Escape Sequence Parser
 * Implements a state machine that processes bytes one at a time
 */
export class AnsiParser {
  private _state: ParserState = ParserState.NORMAL;
  private _callbacks: IParseCallbacks;
  
  // CSI accumulator
  private _csiParams: number[] = [];
  private _csiParamStr: string = '';
  private _csiIntermediates: string = '';
  private _csiPrefix: string = '';
  
  // OSC accumulator
  private _oscStr: string = '';
  
  // ESC accumulator
  private _escIntermediate: string = '';
  
  // DCS accumulator
  private _dcsParams: number[] = [];
  private _dcsIntermediates: string = '';
  private _dcsData: string = '';

  constructor(callbacks: IParseCallbacks) {
    this._callbacks = callbacks;
  }

  /** Parse a string of data */
  parse(data: string): void {
    for (let i = 0; i < data.length; i++) {
      this._parseChar(data.charCodeAt(i), data[i]);
    }
  }

  /** Parse a single character code */
  private _parseChar(code: number, char: string): void {
    switch (this._state) {
      case ParserState.NORMAL:
        this._parseNormal(code, char);
        break;
      case ParserState.ESC:
        this._parseEsc(code);
        break;
      case ParserState.CSI_PARAM:
        this._parseCSIParam(code);
        break;
      case ParserState.CSI_INTERMEDIATE:
        this._parseCSIIntermediate(code);
        break;
      case ParserState.OSC:
        this._parseOSC(code, char);
        break;
      case ParserState.OSC_ESC:
        this._parseOSCEsc(code);
        break;
      case ParserState.ESC_INTERMEDIATE:
        this._parseEscIntermediate(code);
        break;
      case ParserState.DCS:
      case ParserState.DCS_PARAM:
      case ParserState.DCS_INTERMEDIATE:
      case ParserState.DCS_PASSTHROUGH:
        this._parseDCS(code, char);
        break;
      case ParserState.SOS:
      case ParserState.PM:
      case ParserState.APC:
        this._parseStringTerminator(code);
        break;
    }
  }

  /** Parse in NORMAL state */
  private _parseNormal(code: number, char: string): void {
    // ESC - must be checked BEFORE C0 control characters
    if (code === 0x1b) {
      this._state = ParserState.ESC;
      return;
    }
    
    // C0 control characters
    if (code < 0x20) {
      this._callbacks.execute?.(code);
      return;
    }
    // DEL - ignore
    if (code === 0x7f) {
      return;
    }
    // Normal printable character
    this._callbacks.print?.(char, code);
  }

  /** Parse in ESC state */
  private _parseEsc(code: number): void {
    // C0 control characters are still executed
    if (code < 0x20) {
      this._callbacks.execute?.(code);
      return;
    }
    if (code === 0x7f) return; // DEL - ignore

    // CSI - Control Sequence Introducer
    if (code === 0x5b) { // [
      this._csiParams = [];
      this._csiParamStr = '';
      this._csiIntermediates = '';
      this._csiPrefix = '';
      this._state = ParserState.CSI_PARAM;
      return;
    }

    // OSC - Operating System Command
    if (code === 0x5d) { // ]
      this._oscStr = '';
      this._state = ParserState.OSC;
      return;
    }

    // DCS - Device Control String
    if (code === 0x50) { // P
      this._dcsParams = [];
      this._dcsIntermediates = '';
      this._dcsData = '';
      this._state = ParserState.DCS;
      return;
    }

    // SOS - Start of String
    if (code === 0x58) { // X
      this._state = ParserState.SOS;
      return;
    }

    // PM - Privacy Message
    if (code === 0x5e) { // ^
      this._state = ParserState.PM;
      return;
    }

    // APC - Application Program Command
    if (code === 0x5f) { // _
      this._state = ParserState.APC;
      return;
    }

    // ESC with intermediate bytes (0x20-0x2F)
    if (code >= 0x20 && code <= 0x2F) {
      this._escIntermediate = String.fromCharCode(code);
      this._state = ParserState.ESC_INTERMEDIATE;
      return;
    }

    // ESC <final> - single ESC sequence
    if (code >= 0x30 && code <= 0x7e) {
      this._callbacks.ESC?.({
        intermediate: '',
        final: String.fromCharCode(code),
      });
      this._state = ParserState.NORMAL;
      return;
    }

    // Unknown, return to normal
    this._state = ParserState.NORMAL;
  }

  /** Parse in CSI_PARAM state */
  private _parseCSIParam(code: number): void {
    // C0 controls
    if (code < 0x20) {
      this._callbacks.execute?.(code);
      return;
    }
    if (code === 0x7f) return; // DEL

    // Parameter bytes: 0x30-0x3F (0-9, ;, <, =, >, ?)
    if (code >= 0x30 && code <= 0x3f) {
      // Handle private mode prefix (?)
      if (code === 0x3f) { // ?
        this._csiPrefix = '?';
        return;
      }
      // Handle > prefix
      if (code === 0x3e) { // >
        this._csiPrefix = '>';
        return;
      }
      this._csiParamStr += String.fromCharCode(code);
      return;
    }

    // Intermediate bytes: 0x20-0x2F
    if (code >= 0x20 && code <= 0x2f) {
      this._csiIntermediates += String.fromCharCode(code);
      this._state = ParserState.CSI_INTERMEDIATE;
      return;
    }

    // Final byte: 0x40-0x7E
    if (code >= 0x40 && code <= 0x7e) {
      this._csiParams = this._parseParams(this._csiParamStr);
      this._callbacks.CSI?.({
        prefix: this._csiPrefix,
        params: this._csiParams,
        intermediates: this._csiIntermediates,
        final: String.fromCharCode(code),
      });
      this._state = ParserState.NORMAL;
      return;
    }
  }

  /** Parse in CSI_INTERMEDIATE state */
  private _parseCSIIntermediate(code: number): void {
    // C0 controls
    if (code < 0x20) {
      this._callbacks.execute?.(code);
      return;
    }
    if (code === 0x7f) return; // DEL

    // More intermediate bytes
    if (code >= 0x20 && code <= 0x2f) {
      this._csiIntermediates += String.fromCharCode(code);
      return;
    }

    // Final byte
    if (code >= 0x40 && code <= 0x7e) {
      this._csiParams = this._parseParams(this._csiParamStr);
      this._callbacks.CSI?.({
        prefix: this._csiPrefix,
        params: this._csiParams,
        intermediates: this._csiIntermediates,
        final: String.fromCharCode(code),
      });
      this._state = ParserState.NORMAL;
      return;
    }
  }

  /** Parse in OSC state */
  private _parseOSC(code: number, char: string): void {
    // BEL terminates OSC
    if (code === 0x07) {
      this._callbacks.OSC?.({ command: this._oscStr });
      this._state = ParserState.NORMAL;
      return;
    }
    // ESC may start ST
    if (code === 0x1b) {
      this._state = ParserState.OSC_ESC;
      return;
    }
    // C0 controls are ignored in OSC
    if (code < 0x20) return;
    // DEL ignored
    if (code === 0x7f) return;
    this._oscStr += char;
  }

  /** Parse in OSC_ESC state (looking for ST = ESC \) */
  private _parseOSCEsc(code: number): void {
    // ST = ESC \
    if (code === 0x5c) { // \
      this._callbacks.OSC?.({ command: this._oscStr });
      this._state = ParserState.NORMAL;
      return;
    }
    // Not ST, the ESC starts a new sequence
    this._state = ParserState.NORMAL;
    this._parseEsc(code);
  }

  /** Parse in ESC_INTERMEDIATE state */
  private _parseEscIntermediate(code: number): void {
    // C0 controls
    if (code < 0x20) {
      this._callbacks.execute?.(code);
      return;
    }
    if (code === 0x7f) return;

    // More intermediate bytes
    if (code >= 0x20 && code <= 0x2f) {
      this._escIntermediate += String.fromCharCode(code);
      return;
    }

    // Final byte
    if (code >= 0x30 && code <= 0x7e) {
      this._callbacks.ESC?.({
        intermediate: this._escIntermediate,
        final: String.fromCharCode(code),
      });
      this._state = ParserState.NORMAL;
      return;
    }

    this._state = ParserState.NORMAL;
  }

  /** Parse DCS sequences (simplified - just consume) */
  private _parseDCS(code: number, char: string): void {
    // C0 controls
    if (code < 0x20) {
      if (code === 0x1b) {
        this._state = ParserState.ESC;
      }
      return;
    }
    if (code === 0x7f) return;

    // For simplicity, just consume DCS data
    // A full implementation would handle DCS passthrough
    if (code === 0x1b) {
      this._state = ParserState.ESC;
    }
  }

  /** Parse string terminator sequences (SOS, PM, APC) */
  private _parseStringTerminator(code: number): void {
    // BEL terminates
    if (code === 0x07) {
      this._state = ParserState.NORMAL;
      return;
    }
    // ESC starts possible ST
    if (code === 0x1b) {
      this._state = ParserState.ESC;
      return;
    }
    // Otherwise consume
  }

  /** Parse CSI parameter string into array of numbers */
  private _parseParams(paramStr: string): number[] {
    if (paramStr === '') return [];
    
    const parts = paramStr.split(';');
    const params: number[] = [];
    
    for (const part of parts) {
      if (part === '') {
        params.push(0); // Empty params default to 0
      } else {
        const num = parseInt(part, 10);
        params.push(isNaN(num) ? 0 : num);
      }
    }
    
    return params;
  }

  /** Reset parser state */
  reset(): void {
    this._state = ParserState.NORMAL;
    this._csiParams = [];
    this._csiParamStr = '';
    this._csiIntermediates = '';
    this._csiPrefix = '';
    this._oscStr = '';
    this._escIntermediate = '';
  }
}