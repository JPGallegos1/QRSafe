'use strict';

const Jimp = require('jimp');
const jsQR = require('jsqr');

/**
 * Image → QR payload.
 *
 * This is the hard part of the bot, not the parsing. What arrives is a photo
 * taken by a nervous person: bad light, an angle, the sign two metres away.
 * A single decode attempt on the original bitmap fails often, so we walk a
 * ladder of preprocessing variants and stop at the first one that reads.
 *
 * The ladder is ordered by cost: cheap attempts first, upscaling last, so the
 * common case stays fast and only hard images pay for the rest.
 */

const MAX_SIDE = 2600; // guard against multi-megapixel phone uploads

/** Each variant is [name, transform]. The transform gets a throwaway clone. */
const VARIANTS = [
  ['original', (im) => im],
  ['gris', (im) => im.greyscale()],
  ['gris+contraste', (im) => im.greyscale().contrast(0.5)],
  ['normalizado', (im) => im.greyscale().normalize()],
  ['x2', (im) => im.scale(2)],
  ['gris+x2+contraste', (im) => im.greyscale().scale(2).contrast(0.5)],
  ['gris+x2+normalizado', (im) => im.greyscale().scale(2).normalize()],
  ['umbral', (im) => im.greyscale().contrast(0.85).posterize(2)],
];

function scan(image) {
  const { data, width, height } = image.bitmap;
  // attemptBoth also reads codes printed light-on-dark, which happens on
  // municipal signage and on menus with inverted branding.
  const result = jsQR(new Uint8ClampedArray(data), width, height, {
    inversionAttempts: 'attemptBoth',
  });
  return result && result.data ? result.data : null;
}

/**
 * Returns { payload, via, dims, attempts } — `payload` is null when nothing
 * reads. Callers must treat null as ILEGIBLE, never as a suspicious code:
 * failing to read a photo says nothing about the code in it.
 */
async function decodeImage(source) {
  let image;
  try {
    image = await Jimp.read(source);
  } catch (err) {
    return { payload: null, error: err.message, attempts: 0 };
  }

  const dims = image.bitmap.width + 'x' + image.bitmap.height;
  if (Math.max(image.bitmap.width, image.bitmap.height) > MAX_SIDE) {
    image = image.scaleToFit(MAX_SIDE, MAX_SIDE);
  }

  let attempts = 0;
  for (const [name, transform] of VARIANTS) {
    attempts++;
    let candidate;
    try {
      candidate = transform(image.clone());
    } catch (_) {
      continue;
    }
    const payload = scan(candidate);
    if (payload) return { payload, via: name, dims, attempts };
  }

  // Whole-frame scanning fails when the code occupies a small part of a wide
  // photo — a sign photographed from two metres away. Sweeping overlapping
  // tiles gives the detector a frame where the code is large enough to lock
  // onto. This is the expensive path, so it runs only after the ladder.
  const tiled = scanTiles(image);
  attempts += tiled.attempts;
  if (tiled.payload) return { payload: tiled.payload, via: tiled.via, dims, attempts };

  return { payload: null, dims, attempts };
}

/** Sweeps overlapping crops at a few grid sizes, upscaling each tile. */
function scanTiles(image) {
  const grids = [2, 3, 4];
  const width = image.bitmap.width;
  const height = image.bitmap.height;
  let attempts = 0;

  for (const n of grids) {
    // 50% overlap so a code straddling a tile boundary still lands whole
    // inside a neighbouring tile.
    const tileW = Math.floor(width / n);
    const tileH = Math.floor(height / n);
    if (tileW < 80 || tileH < 80) continue;
    const stepX = Math.max(1, Math.floor(tileW / 2));
    const stepY = Math.max(1, Math.floor(tileH / 2));

    for (let y = 0; y + tileH <= height; y += stepY) {
      for (let x = 0; x + tileW <= width; x += stepX) {
        attempts++;
        let tile;
        try {
          tile = image.clone().crop(x, y, tileW, tileH).greyscale();
          if (tileW < 700) tile = tile.scale(2);
          tile = tile.normalize();
        } catch (_) {
          continue;
        }
        const payload = scan(tile);
        if (payload) {
          return { payload, via: 'mosaico ' + n + 'x' + n + ' @' + x + ',' + y, attempts };
        }
      }
    }
  }
  return { payload: null, attempts };
}

module.exports = { decodeImage, VARIANTS };
