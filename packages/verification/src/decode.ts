/**
 * Image → QR payload.
 *
 * This is the hard part, not the parsing. What arrives is a photo taken by a
 * nervous person: bad light, an angle, the sign two metres away. A single
 * decode attempt on the original bitmap fails often, so we walk a ladder of
 * preprocessing variants and stop at the first one that reads.
 *
 * The ladder is ordered by cost — cheap attempts first, upscaling last — so the
 * common case stays fast and only hard images pay for the rest.
 */

import Jimp from 'jimp';
import jsQRImport from 'jsqr';

/**
 * jsqr ships CommonJS with a default export. Under NodeNext the imported
 * binding types as the module namespace rather than the function, so it is
 * narrowed here to the signature its own declaration file documents.
 */
interface QRResult {
  data: string;
}
type InversionAttempts = 'dontInvert' | 'onlyInvert' | 'attemptBoth' | 'invertFirst';
type JsQRFn = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options?: { inversionAttempts?: InversionAttempts }
) => QRResult | null;
const jsQR = jsQRImport as unknown as JsQRFn;

const MAX_SIDE = 1500; // working size once the image is safely decoded
const DESKEW_SIDE = 800; // the counter-tilt search does not need more than this
const MAX_BYTES = 20 * 1024 * 1024; // WhatsApp caps images well below this
const MAX_PIXELS = 50_000_000; // ~50 MP: above any phone camera, below a bomb
const HEADER_BYTES = 65_536; // enough to reach the SOF marker of a normal JPEG

/**
 * Reads width and height from the file header WITHOUT decoding the image.
 *
 * This exists because `Jimp.read` allocates and decodes the full RGBA bitmap
 * before returning, so any check done afterwards is too late: a small crafted
 * file that declares enormous dimensions would already have exhausted memory.
 * A decompression bomb has to be refused before it is handed to the decoder.
 *
 * Returns null when the format is unknown — the caller then falls back to the
 * byte cap alone.
 */
function probeDimensions(head: Buffer): { width: number; height: number } | null {
  // PNG: 8-byte signature, then the IHDR chunk with width/height as BE uint32.
  if (head.length >= 24 && head.readUInt32BE(0) === 0x89504e47) {
    return { width: head.readUInt32BE(16), height: head.readUInt32BE(20) };
  }

  // JPEG: walk the marker segments until a Start Of Frame.
  if (head.length >= 4 && head[0] === 0xff && head[1] === 0xd8) {
    let i = 2;
    while (i + 9 < head.length) {
      if (head[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = head[i + 1];
      if (marker === undefined) break;
      // SOF0..SOF15, excluding DHT (c4), JPG (c8) and DAC (cc).
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: head.readUInt16BE(i + 5), width: head.readUInt16BE(i + 7) };
      }
      const segment = head.readUInt16BE(i + 2);
      if (segment < 2) break;
      i += 2 + segment;
    }
  }

  return null;
}

/** Reads at most the first bytes of the source, without loading it whole. */
async function readHead(source: string | Buffer): Promise<{ head: Buffer; bytes: number }> {
  if (Buffer.isBuffer(source)) {
    return { head: source.subarray(0, HEADER_BYTES), bytes: source.length };
  }
  const { stat, open } = await import('node:fs/promises');
  const info = await stat(source);
  const handle = await open(source, 'r');
  try {
    const head = Buffer.alloc(Math.min(HEADER_BYTES, info.size));
    await handle.read(head, 0, head.length, 0);
    return { head, bytes: info.size };
  } finally {
    await handle.close();
  }
}


export interface DecodeResult {
  payload: string | null;
  via: string | null;
  dims: string | null;
  attempts: number;
  error: string | null;
}

type JimpImage = Awaited<ReturnType<typeof Jimp.read>>;
type Variant = readonly [name: string, transform: (image: JimpImage) => JimpImage];

const VARIANTS: readonly Variant[] = [
  ['original', (im) => im],
  ['gris', (im) => im.greyscale()],
  ['gris+contraste', (im) => im.greyscale().contrast(0.5)],
  ['normalizado', (im) => im.greyscale().normalize()],
  ['x2', (im) => im.scale(2)],
  ['gris+x2+contraste', (im) => im.greyscale().scale(2).contrast(0.5)],
  ['gris+x2+normalizado', (im) => im.greyscale().scale(2).normalize()],
  ['umbral', (im) => im.greyscale().contrast(0.85).posterize(2)],
];

function scan(image: JimpImage): string | null {
  const { data, width, height } = image.bitmap;
  // attemptBoth also reads codes printed light-on-dark, which happens on
  // municipal signage and on menus with inverted branding.
  const result = jsQR(new Uint8ClampedArray(data), width, height, {
    inversionAttempts: 'attemptBoth',
  });
  // An empty payload is a failed read, not a read of nothing: returning '' here
  // would count as decoded and inflate the read rate while yielding ILEGIBLE.
  const payload = result?.data ?? '';
  return payload.length > 0 ? payload : null;
}

/**
 * Returns a DecodeResult whose `payload` is null when nothing reads. Callers
 * must treat null as ILEGIBLE, never as a suspicious code: failing to read a
 * photo says nothing about the code in it.
 */
export async function decodeImage(source: string | Buffer): Promise<DecodeResult> {
  // Refuse oversized input BEFORE handing it to the decoder.
  try {
    const { head, bytes } = await readHead(source);
    if (bytes > MAX_BYTES) {
      return {
        payload: null,
        via: null,
        dims: null,
        attempts: 0,
        error: 'la imagen pesa ' + Math.round(bytes / 1024 / 1024) + ' MB, por encima del límite',
      };
    }
    const declared = probeDimensions(head);
    if (declared !== null && declared.width * declared.height > MAX_PIXELS) {
      return {
        payload: null,
        via: null,
        dims: declared.width + 'x' + declared.height,
        attempts: 0,
        error: 'la imagen declara ' + declared.width + 'x' + declared.height + ', por encima del límite',
      };
    }
  } catch (err) {
    return {
      payload: null,
      via: null,
      dims: null,
      attempts: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  let image: JimpImage;
  try {
    image = await Jimp.read(source as string);
  } catch (err) {
    return {
      payload: null,
      via: null,
      dims: null,
      attempts: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const dims = image.bitmap.width + 'x' + image.bitmap.height;
  if (Math.max(image.bitmap.width, image.bitmap.height) > MAX_SIDE) {
    image = image.scaleToFit(MAX_SIDE, MAX_SIDE);
  }

  let attempts = 0;
  for (const [name, transform] of VARIANTS) {
    attempts++;
    let candidate: JimpImage;
    try {
      candidate = transform(image.clone());
    } catch {
      continue;
    }
    const payload = scan(candidate);
    if (payload !== null) return { payload, via: name, dims, attempts, error: null };
  }

  // A tilted code is the common real case and the measured weak point, so the
  // counter-tilt sweep runs before the tile sweep: it is cheaper and it targets
  // a failure the ladder above cannot touch.
  const deskewed = scanDeskew(image);
  attempts += deskewed.attempts;
  if (deskewed.payload !== null) {
    return { payload: deskewed.payload, via: deskewed.via, dims, attempts, error: null };
  }

  // Whole-frame scanning fails when the code occupies a small part of a wide
  // photo — a sign shot from two metres away. Sweeping overlapping tiles gives
  // the detector a frame where the code is large enough to lock onto. This is
  // the expensive path, so it runs only after the ladder.
  const tiled = scanTiles(image);
  attempts += tiled.attempts;
  if (tiled.payload !== null) {
    return { payload: tiled.payload, via: tiled.via, dims, attempts, error: null };
  }

  return { payload: null, via: null, dims, attempts, error: null };
}

interface TileResult {
  payload: string | null;
  via: string | null;
  attempts: number;
}


/**
 * Applies a perspective counter-tilt.
 *
 * `h` squeezes one vertical edge toward the centre, `v` one horizontal edge.
 * Negative values squeeze the opposite side. Implemented as an inverse map —
 * for every destination pixel we ask which source pixel it came from — because
 * the forward map leaves holes.
 */
function warp(image: JimpImage, h: number, v: number): JimpImage {
  const src = image;
  const w = src.bitmap.width;
  const ht = src.bitmap.height;
  const out = new Jimp(w, ht, 0xffffffff);

  for (let x = 0; x < w; x++) {
    const hs = 1 - (h * x) / Math.max(1, w - 1);
    if (hs <= 0.05) continue;
    const topOffset = ((1 - hs) * ht) / 2;

    for (let y = 0; y < ht; y++) {
      const vs = 1 - (v * y) / Math.max(1, ht - 1);
      if (vs <= 0.05) continue;
      const leftOffset = ((1 - vs) * w) / 2;

      const sy = (y - topOffset) / hs;
      const sx = (x - leftOffset) / vs;
      if (sy < 0 || sy >= ht || sx < 0 || sx >= w) continue;
      out.setPixelColor(src.getPixelColor(Math.floor(sx), Math.floor(sy)), x, y);
    }
  }
  return out;
}

/**
 * Sweeps perspective counter-tilts.
 *
 * A sign is photographed from wherever the person is standing — beside a
 * parking meter, below a wall-mounted code — so the code arrives as a trapezoid.
 * Measurement showed this is by far the weakest axis: the decoder tolerates 45°
 * of rotation but gives up at 20% of tilt, which is the distortion that
 * actually happens.
 *
 * This is a search, not a solve: rather than locating the finder patterns and
 * computing the true homography, it tries a handful of counter-tilts in both
 * directions and on both axes. Cheap, and its value is measurable with
 * `npm run bench`.
 */
function scanDeskew(image: JimpImage): { payload: string | null; via: string | null; attempts: number } {
  // Work small. The warp is a per-pixel loop run twelve times, so the cost is
  // driven by area, not by width: checking only `width` let a 1000x2600 photo
  // through at full resolution and cost 27 seconds and 636 MB, while the same
  // pixels in landscape cost far less. Orientation must not decide the budget,
  // so the cap is on the longest side.
  const longest = Math.max(image.bitmap.width, image.bitmap.height);
  const working = longest > DESKEW_SIDE ? image.clone().scaleToFit(DESKEW_SIDE, DESKEW_SIDE) : image.clone();
  const grey = working.greyscale().normalize();

  const strengths = [0.2, 0.35, 0.5, -0.2, -0.35, -0.5];
  let attempts = 0;

  for (const s of strengths) {
    for (const axis of ['h', 'v'] as const) {
      attempts++;
      let candidate: JimpImage;
      try {
        candidate = axis === 'h' ? warp(grey, s, 0) : warp(grey, 0, s);
      } catch {
        continue;
      }
      const payload = scan(candidate);
      if (payload !== null) {
        return { payload, via: 'contra-inclinación ' + axis + '=' + s, attempts };
      }
    }
  }
  return { payload: null, via: null, attempts };
}

/** Sweeps overlapping crops at a few grid sizes, upscaling each tile. */
function scanTiles(image: JimpImage): TileResult {
  const grids = [2, 3, 4];
  const width = image.bitmap.width;
  const height = image.bitmap.height;
  let attempts = 0;

  for (const n of grids) {
    const tileW = Math.floor(width / n);
    const tileH = Math.floor(height / n);
    if (tileW < 80 || tileH < 80) continue;
    // 50% overlap so a code straddling a tile boundary still lands whole
    // inside a neighbouring tile.
    const stepX = Math.max(1, Math.floor(tileW / 2));
    const stepY = Math.max(1, Math.floor(tileH / 2));

    for (let y = 0; y + tileH <= height; y += stepY) {
      for (let x = 0; x + tileW <= width; x += stepX) {
        attempts++;
        let tile: JimpImage;
        try {
          tile = image.clone().crop(x, y, tileW, tileH).greyscale();
          if (tileW < 700) tile = tile.scale(2);
          tile = tile.normalize();
        } catch {
          continue;
        }
        const payload = scan(tile);
        if (payload !== null) {
          return { payload, via: 'mosaico ' + n + 'x' + n + ' @' + x + ',' + y, attempts };
        }
      }
    }
  }
  return { payload: null, via: null, attempts };
}

export { VARIANTS };
