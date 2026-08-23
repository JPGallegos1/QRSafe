/**
 * Controlled degradations of a QR image.
 *
 * The point is not to make pretty test pictures. It is to move ONE variable at
 * a time so the failure can be attributed: "reads down to 90 px of QR side" is
 * actionable, "56% of a folder of photos" is not.
 *
 * Every function takes a Jimp image and returns a new one; none mutate.
 */

import Jimp from 'jimp';
import QRCode from 'qrcode';

export type Image = Awaited<ReturnType<typeof Jimp.read>>;

const PAPER = 0xf2f2f2ff; // off-white, like a printed sign under room light

/** Renders the payload as a QR of `side` pixels. */
export async function makeQR(payload: string, side: number): Promise<Image> {
  const buffer = await QRCode.toBuffer(payload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: side,
    type: 'png',
  });
  return Jimp.read(buffer);
}

/**
 * Places the QR on a larger canvas, the way a photo frames a sign. `qrSide` is
 * what actually matters for the decoder: the number of pixels the code occupies.
 */
export async function onCanvas(payload: string, canvas: number, qrSide: number): Promise<Image> {
  const qr = await makeQR(payload, qrSide);
  const sheet = new Jimp(canvas, canvas, PAPER);
  const offset = Math.floor((canvas - qrSide) / 2);
  return sheet.composite(qr, offset, offset);
}

export function rotate(image: Image, degrees: number): Image {
  // Jimp grows the canvas to fit, which is what a tilted photo looks like.
  return image.clone().rotate(degrees, false);
}

export function blur(image: Image, radius: number): Image {
  return radius <= 0 ? image.clone() : image.clone().blur(radius);
}

/** Dims and flattens the image, the way a badly lit sign photographs. */
export function dim(image: Image, amount: number): Image {
  return image.clone().brightness(-amount).contrast(-amount);
}

/** Re-encodes as JPEG at the given quality and decodes the bytes back. */
export async function jpeg(image: Image, quality: number): Promise<Buffer> {
  return image.clone().quality(quality).getBufferAsync(Jimp.MIME_JPEG);
}

/**
 * Horizontal perspective tilt: the right edge is squeezed toward the centre, as
 * when a sign is photographed from one side. `strength` is the fraction of
 * height the far edge loses, 0 to 0.8.
 *
 * Implemented as an inverse map — for every destination pixel we ask which
 * source pixel it came from — because the forward map leaves holes.
 */
export function tilt(image: Image, strength: number, axis: 'h' | 'v' = 'h'): Image {
  if (strength === 0) return image.clone();

  // The warp below only squeezes one side. The other three directions are the
  // same transform on a flipped image, so they are covered by flipping back.
  if (axis === 'v') {
    return tilt(image.clone().rotate(90, false), Math.abs(strength) * Math.sign(strength))
      .rotate(-90, false);
  }
  if (strength < 0) {
    return tilt(image.clone().flip(true, false), -strength).flip(true, false);
  }
  const src = image.clone();
  const w = src.bitmap.width;
  const h = src.bitmap.height;
  const out = new Jimp(w, h, PAPER);

  for (let x = 0; x < w; x++) {
    // How much of the original height is visible at this column.
    const scale = 1 - (strength * x) / (w - 1);
    if (scale <= 0.02) continue;
    const top = ((1 - scale) * h) / 2;

    for (let y = 0; y < h; y++) {
      const sy = (y - top) / scale;
      if (sy < 0 || sy >= h) continue;
      out.setPixelColor(src.getPixelColor(x, Math.floor(sy)), x, y);
    }
  }
  return out;
}
