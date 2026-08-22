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

const MAX_SIDE = 2600; // guard against multi-megapixel phone uploads

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
