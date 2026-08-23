/**
 * Where the decoder stops reading.
 *
 * Sweeps one degradation at a time from easy to hard and reports the last value
 * that still decodes into exactly the original payload. The output is a set of
 * limits — "reads down to 90 px of QR side", "up to 30° of rotation" — which is
 * something a change to the preprocessing ladder can be measured against.
 *
 * This is a benchmark, not a test: it prints, it does not assert. The floors
 * worth defending are asserted in test/run.ts so a regression fails the build.
 *
 *   npm run bench --workspace @qrsafe/verification
 */

import Jimp from 'jimp';
import { decodeImage } from '../src/decode.js';
import { blur, dim, jpeg, makeQR, onCanvas, rotate, tilt, type Image } from './degrade.js';

/** The Coto payload, decoded from a real photograph. */
const PAYLOAD =
  '00020101021143530016com.mercadolibre0129https://mpago.la/pos/1142682450150011305480831565204970053030325802AR5925COTO CENTRO INTEGRAL DE C6015CAPITAL FEDERAL63043E84';

const CANVAS = 900;
const BASE_QR = 420;

async function reads(source: Image | Buffer): Promise<boolean> {
  const input = Buffer.isBuffer(source)
    ? source
    : await source.getBufferAsync(Jimp.MIME_PNG);
  const { payload } = await decodeImage(input);
  return payload === PAYLOAD;
}

interface Sweep {
  axis: string;
  unit: string;
  /** Values ordered from easiest to hardest. */
  values: number[];
  build: (value: number) => Promise<Image | Buffer>;
  /** How to phrase the limit once found. */
  phrase: (last: number | null) => string;
}

async function run(sweep: Sweep): Promise<void> {
  let lastOK: number | null = null;
  const trail: string[] = [];

  for (const value of sweep.values) {
    const ok = await reads(await sweep.build(value));
    trail.push(value + (ok ? '' : '✗'));
    if (!ok) break;
    lastOK = value;
  }

  const label = (sweep.axis + ' '.repeat(22)).slice(0, 22);
  console.log('  ' + label + sweep.phrase(lastOK));
  console.log('  ' + ' '.repeat(22) + 'probado: ' + trail.join(' → '));
}

async function main(): Promise<void> {
  console.log('\nLímites de lectura — una variable por vez, sobre un QR generado\n');
  console.log('  lienzo ' + CANVAS + 'px, QR base ' + BASE_QR + 'px, payload real de Coto\n');

  await run({
    axis: 'tamaño del QR',
    unit: 'px',
    values: [420, 300, 200, 150, 120, 100, 90, 80, 70, 60, 50, 40],
    build: (px) => onCanvas(PAYLOAD, CANVAS, px),
    phrase: (v) => (v === null ? 'no lee ni el más grande' : 'lee hasta ' + v + ' px de lado'),
  });

  const base = await onCanvas(PAYLOAD, CANVAS, BASE_QR);

  await run({
    axis: 'rotación',
    unit: '°',
    values: [0, 5, 10, 15, 20, 30, 40, 45],
    build: async (deg) => rotate(base, deg),
    phrase: (v) => (v === null ? 'no lee ni de frente' : 'lee hasta ' + v + '°'),
  });

  await run({
    axis: 'desenfoque',
    unit: 'px',
    values: [0, 1, 2, 3, 4, 5, 6, 8, 10],
    build: async (r) => blur(base, r),
    phrase: (v) => (v === null ? 'no lee ni nítido' : 'lee hasta ' + v + ' px de radio'),
  });

  await run({
    axis: 'perspectiva',
    unit: 'fracción',
    values: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7],
    build: async (s) => tilt(base, s),
    phrase: (v) => (v === null ? 'no lee ni de frente' : 'lee hasta ' + Math.round((v ?? 0) * 100) + '% de inclinación'),
  });

  await run({
    axis: 'poca luz',
    unit: 'fracción',
    values: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
    build: async (a) => dim(base, a),
    phrase: (v) => (v === null ? 'no lee ni bien iluminado' : 'lee hasta ' + Math.round((v ?? 0) * 100) + '% de caída'),
  });

  await run({
    axis: 'compresión JPEG',
    unit: 'calidad',
    values: [95, 80, 60, 40, 30, 20, 15, 10, 5],
    build: (q) => jpeg(base, q),
    phrase: (v) => (v === null ? 'no lee ni a calidad 95' : 'lee hasta calidad ' + v),
  });

  // El caso realista no es una degradación sola: es varias a la vez.
  console.log('\n  combinado — lo que se parece a una foto de la calle\n');
  const combos: [string, () => Promise<Image | Buffer>][] = [
    ['QR 150px + 10° + blur 1', async () => blur(rotate(await onCanvas(PAYLOAD, CANVAS, 150), 10), 1)],
    ['QR 120px + 15° + blur 2', async () => blur(rotate(await onCanvas(PAYLOAD, CANVAS, 120), 15), 2)],
    ['QR 200px + 20% tilt + JPEG 40', async () => jpeg(tilt(await onCanvas(PAYLOAD, CANVAS, 200), 0.2), 40)],
    ['QR 100px + poca luz 0.3', async () => dim(await onCanvas(PAYLOAD, CANVAS, 100), 0.3)],
  ];
  for (const [name, build] of combos) {
    const ok = await reads(await build());
    console.log('    ' + (ok ? 'lee   ' : 'FALLA ') + name);
  }
  console.log('');
}

await main();
