// news-image-20261122: draws a one-page newspaper front page summing up
// Sunday, 22 November 2026, and writes it to $MAKEFUN_OUTPUT_DIR/entry.png.
// Node 22, standard library only, no network. Output is deterministic:
// the same bytes on every run.

import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------
type RGB = [number, number, number];
const PAPER: RGB = [248, 244, 233];
const INK: RGB = [18, 18, 18];
const RED: RGB = [139, 26, 26];
const BLUE: RGB = [30, 64, 120];
const STEEL: RGB = [107, 124, 140];
const STEEL_DARK: RGB = [74, 90, 106];
const GOLD: RGB = [176, 132, 32];
const GOLD_LIGHT: RGB = [212, 175, 55];
const SKY: RGB = [232, 238, 244];
const BROWN: RGB = [122, 90, 60];
const GREEN: RGB = [46, 110, 60];
const GREY: RGB = [96, 96, 90];
const WHITE: RGB = [255, 255, 255];

// ---------------------------------------------------------------------------
// 5x7 bitmap font. Each glyph is 7 rows of 5 cells; '#' is ink, '.' is blank.
// ---------------------------------------------------------------------------
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  a: ["00000", "00000", "01110", "00001", "01111", "10001", "01111"],
  b: ["10000", "10000", "10110", "11001", "10001", "10001", "11110"],
  c: ["00000", "00000", "01110", "10001", "10000", "10001", "01110"],
  d: ["00001", "00001", "01101", "10011", "10001", "10001", "01111"],
  e: ["00000", "00000", "01110", "10001", "11111", "10000", "01110"],
  f: ["00110", "01001", "01000", "11110", "01000", "01000", "01000"],
  g: ["00000", "01111", "10001", "10001", "01111", "00001", "01110"],
  h: ["10000", "10000", "10110", "11001", "10001", "10001", "10001"],
  i: ["00100", "00000", "01100", "00100", "00100", "00100", "01110"],
  j: ["00010", "00000", "00110", "00010", "00010", "00010", "01100"],
  k: ["10000", "10000", "10010", "10100", "11000", "10100", "10010"],
  l: ["01100", "00100", "00100", "00100", "00100", "00100", "01110"],
  m: ["00000", "00000", "11010", "10101", "10101", "10101", "10101"],
  n: ["00000", "00000", "10110", "11001", "10001", "10001", "10001"],
  o: ["00000", "00000", "01110", "10001", "10001", "10001", "01110"],
  p: ["00000", "00000", "10110", "11001", "10001", "11110", "10000"],
  q: ["00000", "00000", "01101", "10011", "10001", "01111", "00001"],
  r: ["00000", "00000", "10110", "11001", "10000", "10000", "10000"],
  s: ["00000", "00000", "01111", "10000", "01110", "00001", "11110"],
  t: ["01000", "01000", "11100", "01000", "01000", "01001", "00110"],
  u: ["00000", "00000", "10001", "10001", "10001", "10011", "01101"],
  v: ["00000", "00000", "10001", "10001", "10001", "01010", "00100"],
  w: ["00000", "00000", "10001", "10101", "10101", "10101", "01010"],
  x: ["00000", "00000", "10001", "01010", "00100", "01010", "10001"],
  y: ["00000", "00000", "10001", "10001", "01111", "00001", "01110"],
  z: ["00000", "00000", "11111", "00010", "00100", "01000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "01100", "01000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  '"': ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00010", "00100", "00000", "00100"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "01100", "01000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "*": ["00000", "10101", "01110", "11111", "01110", "10101", "00000"],
  "[": ["01110", "01000", "01000", "01000", "01000", "01000", "01110"],
  "]": ["01110", "00010", "00010", "00010", "00010", "00010", "01110"],
};
const BLANK = ["00000", "00000", "00000", "00000", "00000", "00000", "00000"];

// ---------------------------------------------------------------------------
// Canvas: an RGB pixel buffer with simple drawing primitives.
// ---------------------------------------------------------------------------
class Canvas {
  w: number;
  h: number;
  data: Uint8Array;

  constructor(w: number, h: number, bg: RGB) {
    this.w = w;
    this.h = h;
    this.data = new Uint8Array(w * h * 3);
    for (let i = 0; i < w * h; i++) {
      this.data[i * 3] = bg[0];
      this.data[i * 3 + 1] = bg[1];
      this.data[i * 3 + 2] = bg[2];
    }
  }

  set(x: number, y: number, c: RGB): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 3;
    this.data[i] = c[0];
    this.data[i + 1] = c[1];
    this.data[i + 2] = c[2];
  }

  fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) this.set(xx, yy, c);
    }
  }

  rect(x: number, y: number, w: number, h: number, c: RGB, t = 1): void {
    this.fillRect(x, y, w, t, c);
    this.fillRect(x, y + h - t, w, t, c);
    this.fillRect(x, y, t, h, c);
    this.fillRect(x + w - t, y, t, h, c);
  }

  hline(x0: number, x1: number, y: number, c: RGB, t = 1): void {
    for (let yy = y; yy < y + t; yy++) {
      for (let xx = x0; xx <= x1; xx++) this.set(xx, yy, c);
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, c: RGB, t = 1): void {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = x0;
    let y = y0;
    const half = Math.floor(t / 2);
    for (;;) {
      for (let yy = -half; yy <= half; yy++) {
        for (let xx = -half; xx <= half; xx++) this.set(x + xx, y + yy, c);
      }
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  }

  circle(cx: number, cy: number, r: number, c: RGB): void {
    for (let yy = -r; yy <= r; yy++) {
      const half = Math.floor(Math.sqrt(r * r - yy * yy));
      for (let xx = -half; xx <= half; xx++) this.set(cx + xx, cy + yy, c);
    }
  }

  ring(cx: number, cy: number, r: number, c: RGB, t = 2): void {
    for (let a = 0; a < 360; a++) {
      const rad = (a * Math.PI) / 180;
      for (let rr = r - t; rr <= r; rr++) {
        this.set(Math.round(cx + rr * Math.cos(rad)), Math.round(cy + rr * Math.sin(rad)), c);
      }
    }
  }

  triangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: RGB): void {
    const minX = Math.min(x0, x1, x2);
    const maxX = Math.max(x0, x1, x2);
    const minY = Math.min(y0, y1, y2);
    const maxY = Math.max(y0, y1, y2);
    const d = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
    if (d === 0) return;
    for (let yy = minY; yy <= maxY; yy++) {
      for (let xx = minX; xx <= maxX; xx++) {
        const a = ((y1 - y2) * (xx - x2) + (x2 - x1) * (yy - y2)) / d;
        const b = ((y2 - y0) * (xx - x2) + (x0 - x2) * (yy - y2)) / d;
        const cc = 1 - a - b;
        if (a >= 0 && b >= 0 && cc >= 0) this.set(xx, yy, c);
      }
    }
  }

  fillPolygon(pts: Array<[number, number]>, c: RGB): void {
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [, y] of pts) {
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    for (let y = minY; y <= maxY; y++) {
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [x0, y0] = pts[i];
        const [x1, y1] = pts[(i + 1) % pts.length];
        if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
          xs.push(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0));
        }
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        for (let x = Math.ceil(xs[i]); x <= Math.floor(xs[i + 1]); x++) {
          this.set(x, y, c);
        }
      }
    }
  }

  star(cx: number, cy: number, rOuter: number, rInner: number, c: RGB): void {
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? rOuter : rInner;
      const ang = -Math.PI / 2 + (i * Math.PI) / 5;
      pts.push([Math.round(cx + r * Math.cos(ang)), Math.round(cy + r * Math.sin(ang))]);
    }
    this.fillPolygon(pts, c);
  }

  // -- text ---------------------------------------------------------------
  textWidth(s: string, scale: number): number {
    if (s.length === 0) return 0;
    return s.length * 6 * scale - scale;
  }

  drawText(x: number, y: number, s: string, scale: number, c: RGB): void {
    let cx = x;
    for (const ch of s) {
      const glyph = FONT[ch] ?? BLANK;
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 5; col++) {
          if (glyph[row][col] === "1") {
            this.fillRect(cx + col * scale, y + row * scale, scale, scale, c);
          }
        }
      }
      cx += 6 * scale;
    }
  }

  drawTextCentered(cx: number, y: number, s: string, scale: number, c: RGB): void {
    this.drawText(cx - Math.floor(this.textWidth(s, scale) / 2), y, s, scale, c);
  }

  wrap(s: string, maxWidth: number, scale: number): string[] {
    const words = s.split(" ");
    const lines: string[] = [];
    let cur = "";
    for (const word of words) {
      const trial = cur === "" ? word : cur + " " + word;
      if (this.textWidth(trial, scale) <= maxWidth) {
        cur = trial;
      } else {
        if (cur !== "") lines.push(cur);
        cur = word;
      }
    }
    if (cur !== "") lines.push(cur);
    return lines;
  }

  drawWrapped(x: number, y: number, s: string, maxWidth: number, scale: number, leading: number, c: RGB): number {
    const lines = this.wrap(s, maxWidth, scale);
    for (let i = 0; i < lines.length; i++) {
      this.drawText(x, y + i * leading, lines[i], scale, c);
    }
    return y + lines.length * leading;
  }
}

// ---------------------------------------------------------------------------
// Minimal deterministic PNG encoder (truecolour, filter 0, zlib level 9).
// ---------------------------------------------------------------------------
const CRC_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(canvas: Canvas): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(canvas.w, 0);
  ihdr.writeUInt32BE(canvas.h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc(canvas.h * (1 + canvas.w * 3));
  for (let y = 0; y < canvas.h; y++) {
    raw[y * (1 + canvas.w * 3)] = 0; // filter: none
    raw.set(canvas.data.subarray(y * canvas.w * 3, (y + 1) * canvas.w * 3), y * (1 + canvas.w * 3) + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Page layout.
// ---------------------------------------------------------------------------
const MX = 40; // side margin
const RX = W - MX; // right edge of content

function drawFrontPage(): Canvas {
  const cv = new Canvas(W, H, PAPER);

  // Masthead.
  cv.hline(MX, RX, 24, INK, 3);
  cv.drawTextCentered(512, 40, "THE WORLD TODAY", 8, INK);
  cv.drawTextCentered(512, 104, "Sunday, 22 November 2026", 4, INK);
  cv.hline(MX, RX, 142, INK, 5);
  cv.hline(MX, RX, 151, INK, 2);

  // ---- Lead story: Mexico ----------------------------------------------
  cv.drawText(MX, 168, "MEXICO - SINALOA", 2, RED);
  cv.drawTextCentered(512, 192, "MEXICO CAPTURES", 5, INK);
  cv.drawTextCentered(512, 234, "'EL CHAPO ISIDRO'", 5, INK);
  const deck1 =
    "Mexican special forces captured Fausto Isidro Meza Flores, 44, in a gunbattle in Guasave, Sinaloa, on Friday night. Eleven people died and eight were arrested. He was flown to Mexico City on Saturday. The FBI had offered $5 million for the Beltran Leyva kingpin, and US intelligence helped in the raid.";
  cv.drawWrapped(MX, 286, deck1, RX - MX, 3, 27, INK);

  // Lead illustration: desert raid scene with a badge and handcuffs.
  const ix0 = MX;
  const iy0 = 452;
  const iw = RX - MX;
  const ih = 104;
  cv.fillRect(ix0, iy0, iw, ih, SKY);
  cv.rect(ix0, iy0, iw, ih, INK, 2);
  cv.circle(880, iy0 + 26, 18, GOLD_LIGHT);
  cv.triangle(60, iy0 + ih, 210, iy0 + 18, 360, iy0 + ih, STEEL);
  cv.triangle(300, iy0 + ih, 470, iy0 + 8, 640, iy0 + ih, STEEL_DARK);
  cv.triangle(600, iy0 + ih, 740, iy0 + 26, 880, iy0 + ih, STEEL);
  cv.fillRect(ix0, iy0 + ih - 14, iw, 14, BROWN);
  // Badge (left).
  cv.circle(150, iy0 + 58, 30, GOLD);
  cv.ring(150, iy0 + 58, 30, INK, 2);
  cv.star(150, iy0 + 58, 20, 8, WHITE);
  // Handcuffs (right).
  cv.ring(770, iy0 + 62, 20, INK, 4);
  cv.ring(838, iy0 + 62, 20, INK, 4);
  cv.line(788, iy0 + 54, 820, iy0 + 54, INK, 4);
  cv.line(788, iy0 + 70, 820, iy0 + 70, INK, 4);
  cv.drawTextCentered(512, iy0 + ih + 10, "Guasave, Sinaloa - the raid on Friday night", 2, GREY);

  cv.hline(MX, RX, 596, INK, 3);

  // ---- Two columns -------------------------------------------------------
  const colW = 452;
  const lx = MX;
  const rx = 532;
  const colTop = 614;
  // Vertical divider.
  for (let y = colTop; y <= 958; y++) cv.set(512, y, GREY);

  // Story 2: Shenzhen trilateral.
  cv.drawText(lx, colTop, "CHINA - SHENZHEN", 2, RED);
  cv.drawText(lx, colTop + 24, "TRUMP, XI AND", 4, INK);
  cv.drawText(lx, colTop + 54, "PUTIN MEET IN", 4, INK);
  cv.drawText(lx, colTop + 84, "SHENZHEN", 4, INK);
  const deck2 =
    "The first trilateral of the US, Chinese and Russian leaders met for 90 minutes at Kylin Villa on Thursday. Their joint statement said a nuclear war cannot be won and must never be fought, and opened dialogue on reducing nuclear risks.";
  cv.drawWrapped(lx, colTop + 128, deck2, colW, 2, 17, INK);

  // Illustration: three leaders at a table, three flags.
  const p2y = 870;
  const p2h = 88;
  cv.fillRect(lx, p2y, colW, p2h, SKY);
  cv.rect(lx, p2y, colW, p2h, INK, 2);
  cv.drawText(lx + 10, p2y + 8, "AT THE TABLE", 2, GREY);
  const heads = [lx + 90, lx + 226, lx + 362];
  const skins: RGB[] = [
    [232, 190, 150],
    [240, 205, 160],
    [228, 185, 145],
  ];
  const suits: RGB[] = [BLUE, RED, INK];
  for (let i = 0; i < 3; i++) {
    cv.circle(heads[i], p2y + 46, 15, skins[i]);
    cv.fillRect(heads[i] - 18, p2y + 60, 36, 12, suits[i]);
  }
  // Table.
  cv.fillRect(lx + 20, p2y + 72, colW - 40, 10, BROWN);
  // Flags on the table: US, China, Russia.
  const flagY = p2y + 54;
  // US flag: red stripes on white, blue corner.
  cv.fillRect(lx + 52, flagY, 30, 18, WHITE);
  for (let s = 0; s < 4; s++) cv.fillRect(lx + 52, flagY + s * 5, 30, 2, RED);
  cv.fillRect(lx + 52, flagY, 13, 9, BLUE);
  // China flag: red field, gold stars.
  cv.fillRect(lx + 188, flagY, 30, 18, RED);
  cv.star(lx + 198, flagY + 7, 4, 2, GOLD_LIGHT);
  cv.circle(lx + 210, flagY + 5, 1, GOLD_LIGHT);
  cv.circle(lx + 212, flagY + 11, 1, GOLD_LIGHT);
  // Russia flag: white, blue, red stripes.
  cv.fillRect(lx + 324, flagY, 30, 6, WHITE);
  cv.fillRect(lx + 324, flagY + 6, 30, 6, BLUE);
  cv.fillRect(lx + 324, flagY + 12, 30, 6, RED);

  // Story 3: COP31 overtime.
  cv.drawText(rx, colTop, "CLIMATE - ANTALYA", 2, RED);
  cv.drawText(rx, colTop + 24, "COP31 IN", 4, INK);
  cv.drawText(rx, colTop + 54, "OVERTIME IN", 4, INK);
  cv.drawText(rx, colTop + 84, "ANTALYA", 4, INK);
  const deck3 =
    "UN climate talks ran into a second day of overtime on Sunday, with 200 nations deadlocked over fossil fuels. An Antalya Accords draft from COP31 president Murat Kurum would acknowledge, for the first time, the world is on track to breach 1.5 C.";
  cv.drawWrapped(rx, colTop + 128, deck3, colW, 2, 17, INK);

  // Illustration: globe and thermometer.
  const p3y = 870;
  const p3h = 88;
  cv.fillRect(rx, p3y, colW, p3h, SKY);
  cv.rect(rx, p3y, colW, p3h, INK, 2);
  const gx = rx + 92;
  const gy = p3y + 44;
  const gr = 38;
  cv.circle(gx, gy, gr, [210, 228, 240]);
  cv.ring(gx, gy, gr, BLUE, 3);
  for (const dy of [-19, 0, 19]) {
    const half = Math.floor(Math.sqrt(gr * gr - dy * dy));
    cv.hline(gx - half, gx + half, gy + dy, BLUE, 1);
  }
  for (const dx of [-19, 0, 19]) {
    const half = Math.floor(Math.sqrt(gr * gr - dx * dx));
    for (let y = gy - half; y <= gy + half; y++) cv.set(gx + dx, y, BLUE);
  }
  cv.circle(gx - 12, gy - 12, 9, GREEN);
  cv.circle(gx + 14, gy + 8, 11, GREEN);
  cv.circle(gx + 6, gy - 20, 6, GREEN);
  // Thermometer.
  const tx = rx + 300;
  cv.fillRect(tx, p3y + 12, 18, 52, WHITE);
  cv.rect(tx, p3y + 12, 18, 52, INK, 2);
  cv.fillRect(tx + 4, p3y + 36, 10, 28, RED);
  cv.circle(tx + 9, p3y + 70, 12, RED);
  cv.ring(tx + 9, p3y + 70, 12, INK, 2);
  cv.circle(tx + 9, p3y + 70, 7, RED);
  cv.drawText(tx + 30, p3y + 34, "1.5 C", 3, RED);

  // ---- Footer ------------------------------------------------------------
  cv.hline(MX, RX, 972, INK, 3);
  cv.drawTextCentered(512, 984, "Three stories that defined Sunday, 22 November 2026", 2, INK);

  return cv;
}

function main(): void {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  fs.mkdirSync(outDir, { recursive: true });
  const canvas = drawFrontPage();
  const png = encodePng(canvas);
  fs.writeFileSync(path.join(outDir, "entry.png"), png);
}

main();
