/**
 * Test runner without a framework.
 *
 * Two parts:
 *  - assertions on parsing and on the verdict rules that must not be relaxed;
 *  - a corpus read-rate report over the repo's images/, which is gitignored, so
 *    it is reported and never asserted. The read rate is a measurement, not a
 *    contract: it moves with the corpus.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as emv from '../src/emv.js';
import { verify, STATES } from '../src/verify.js';
import { decodeImage } from '../src/decode.js';
import { DOMAINS, type Domain } from '../src/registry.js';
import QRCode from 'qrcode';
import Jimp from 'jimp';
import { onCanvas, rotate, blur, tilt } from '../bench/degrade.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

let passed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail?: string): void {
  if (condition) passed++;
  else failures.push(name + (detail !== undefined ? ' — ' + detail : ''));
}

/* Payloads decoded from real photographs in images/. Not synthetic. */
const REAL = {
  mercadoPagoSign:
    '00020101021143530016com.mercadolibre0129https://mpago.la/pos/4223845750150011000000000005204970053030325802AR5909UNDEFINED6004CABA630442AC',
  coto: '00020101021143530016com.mercadolibre0129https://mpago.la/pos/1142682450150011305480831565204970053030325802AR5925COTO CENTRO INTEGRAL DE C6015CAPITAL FEDERAL63043E84',
} as const;

/* --- parsing --- */
for (const [name, payload] of Object.entries(REAL)) {
  const reading = emv.parse(payload);
  check('parse: ' + name + ' recognized as EMV', reading !== null);
  if (!reading) continue;
  check(
    'parse: ' + name + ' CRC intact',
    reading.crc.intact,
    'embedded ' + reading.crc.embedded + ' vs computed ' + reading.crc.computed
  );
  check('parse: ' + name + ' is static', reading.isStatic);
  check('parse: ' + name + ' country AR', reading.country === 'AR');
  check(
    'parse: ' + name + ' exposes a POS identifier',
    reading.accountRefs.some((r) => /mpago\.la\/pos\//.test(r.value))
  );
}

check(
  'parse: the Mercado Pago sign declares UNDEFINED as its name',
  emv.parse(REAL.mercadoPagoSign)?.declaredName === 'UNDEFINED'
);
check(
  'crc: changing one digit breaks integrity',
  emv.parse(REAL.coto.replace('5925COTO', '5925KOTO'))?.crc.intact === false
);
check('parse: a standalone URL is not EMV', emv.parse('https://example.com/x') === null);
check('read: a standalone URL is read as a URL', emv.read('https://example.com/x')?.kind === 'url');
check('read: garbage is not read', emv.read('not a qr') === null);

/* --- rules that must not be relaxed --- */
const outOfCoverage = verify(REAL.mercadoPagoSign);
check(
   'rule: an open domain never produces UNAUTHORIZED',
   outOfCoverage.state !== STATES.UNAUTHORIZED,
   'returned ' + outOfCoverage.state
);
check(
   'rule: out of coverage makes clear that it is not a warning',
   /no es una advertencia/i.test(outOfCoverage.message),
  outOfCoverage.message
);

const unreadable = verify(null);
check('rule: no payload produces UNREADABLE', unreadable.state === STATES.UNREADABLE);
check(
  'rule: unreadable does not accuse the code',
  !/warning|fraud|unauthorized/i.test(unreadable.message),
  unreadable.message
);

const tampered = verify(REAL.coto.replace('5925COTO', '5925KOTO'));
check('rule: a broken CRC produces ANOMALY', tampered.state === STATES.ANOMALY);

/* --- registry-dependent states ---
   A test domain is injected instead of enrolling real merchants in the
   production registry. The two strong states must be reachable and must depend
   exclusively on the `closed` flag. */
function withDomain<T>(closed: boolean, authorized: [string, string][], fn: () => T): T {
  const fixture: Domain = {
    id: 'fixture',
    label: 'Test domain',
    issuer: 'Test issuer',
    closed,
    matches: { schemes: ['com.mercadolibre'], hosts: ['mpago.la'] },
    authorized: new Map(authorized),
  };
  DOMAINS.unshift(fixture);
  try {
    return fn();
  } finally {
    DOMAINS.shift();
  }
}

const enrolled = withDomain(true, [['mpago:11426824', 'Coto CICSA']], () => verify(REAL.coto));
check(
  'registry: an enrolled identifier produces VERIFIED',
  enrolled.state === STATES.VERIFIED,
  'returned ' + enrolled.state
);
check(
  'registry: VERIFIED names the MERCHANT, not the domain',
  /autorizado por Coto CICSA/.test(enrolled.message),
  enrolled.message
);
check(
  'registry: VERIFIED does not name the domain instead of the merchant',
  !/Test domain/.test(enrolled.message),
  enrolled.message
);

const missingClosed = withDomain(true, [], () => verify(REAL.coto));
check(
  'registry: a missing identifier in a CLOSED domain produces UNAUTHORIZED',
  missingClosed.state === STATES.UNAUTHORIZED,
  'returned ' + missingClosed.state
);

const missingOpen = withDomain(false, [], () => verify(REAL.coto));
check(
  'registry: the SAME case in an OPEN domain does not accuse',
  missingOpen.state === STATES.OUT_OF_COVERAGE,
  'returned ' + missingOpen.state
);
check(
  'registry: only the closed flag separates accusation from silence',
  missingClosed.state !== missingOpen.state
);

check(
  'rule: no message claims the QR is safe',
  ![outOfCoverage, unreadable, tampered, enrolled, missingClosed, missingOpen].some((r) =>
    /\bsafe\b/i.test(r.message)
  )
);

/* --- invariant: a closed domain must be able to name someone ---
   UNAUTHORIZED accuses an issuer of not authorizing the code. A domain without
   a unique issuer has no one to name, so it cannot be closed. Without this, a
   VERIFIED verdict or an accusation would name the domain rather than the
   merchant, which answers a different question. */
for (const d of DOMAINS) {
  check(
    'invariant: domain ' + d.id + ' is not closed without an issuer',
    !(d.closed && d.issuer === null),
    'closed=' + String(d.closed) + ' issuer=' + String(d.issuer)
  );
}

const noIssuer = withDomain(false, [], () => verify(REAL.coto));
check(
  'invariant: without an issuer or enrollment, the verdict does not accuse',
  noIssuer.state === STATES.OUT_OF_COVERAGE,
  'returned ' + noIssuer.state
);

/* --- security review findings --- */

/* 1. A payload WITHOUT mandatory field 63, with crc16(prefix) appended to the
      end, compared against itself and appeared intact. */
const missingCrc = (() => {
  const body = REAL.coto.slice(0, REAL.coto.length - 8); // removes "6304XXXX"
  return body + emv.crc16(body);
})();
check('structure: without field 63 the CRC is not present', emv.parse(missingCrc)?.crc.present === false);
check('structure: without field 63 the CRC cannot appear intact', emv.parse(missingCrc)?.crc.intact === false);
check(
  'structure: without field 63, the verdict is ANOMALY, never VERIFIED',
  withDomain(true, [['mpago:11426824', 'Coto CICSA']], () => verify(missingCrc)).state === STATES.ANOMALY
);

/* 2. Two payment routes in one code: one enrolled and one not. The verdict
      cannot endorse the whole QR because the wallet could choose the other. */
const twoRoutes = (() => {
  const tlv = (t: string, v: string) => t + String(v.length).padStart(2, '0') + v;
  const body =
    tlv('00', '01') +
    tlv('01', '11') +
    tlv('43', tlv('00', 'com.mercadolibre') + tlv('01', 'https://mpago.la/pos/11426824')) +
    tlv('26', tlv('00', 'com.otrobanco') + tlv('01', 'CUENTA-DEL-ATACANTE')) +
    tlv('53', '032') +
    tlv('58', 'AR') +
    tlv('59', 'COTO') +
    tlv('60', 'CABA');
  const withCrc = body + '6304';
  return withCrc + emv.crc16(withCrc);
})();
const routes = emv.parse(twoRoutes);
check('routes: the two-route payload parses and its CRC is intact', routes?.crc.intact === true);
const routesVerdict = withDomain(true, [['mpago:11426824', 'Coto CICSA']], () => verify(twoRoutes));
check(
  'routes: one enrolled and one foreign route does NOT return VERIFIED',
  routesVerdict.state !== STATES.VERIFIED,
  'returned ' + routesVerdict.state
);
check(
  'routes: the verdict is ANOMALY and names the issue',
  routesVerdict.state === STATES.ANOMALY && /cuentas de cobro distintas/.test(routesVerdict.message),
  routesVerdict.message
);
check(
  'routes: registry lookup reports routes outside coverage',
  (routesVerdict.registry?.otherRoutes.length ?? 0) > 0
);

/* 3. Decompression bomb: enormous dimensions declared in the header. */
const decompressionBombPng = (() => {
  const b = Buffer.alloc(24);
  b.writeUInt32BE(0x89504e47, 0);
  b.writeUInt32BE(0x0d0a1a0a, 4);
  b.writeUInt32BE(13, 8);
  b.write('IHDR', 12);
  b.writeUInt32BE(60000, 16);
  b.writeUInt32BE(60000, 20);
  return b;
})();
const decompressionBomb = await decodeImage(decompressionBombPng);
check(
  'security: an image declaring 60000x60000 is rejected without decoding',
  decompressionBomb.payload === null && decompressionBomb.attempts === 0 && /above the limit/.test(decompressionBomb.error ?? ''),
  'error=' + String(decompressionBomb.error) + ' attempts=' + String(decompressionBomb.attempts)
);


/* --- lengths in BYTES, not characters ---
   EMVCo counts UTF-8 bytes. An Argentine merchant with an accent in its name is
   the normal case, not an edge case: if parsing walks JavaScript characters, the
   payload becomes misaligned and a legitimate QR ends in ANOMALY. A false alarm
   about a real merchant is exactly the failure this product exists to prevent. */
const withAccent = (() => {
  const tlv = (t: string, v: string) => t + String(emv.byteLength(v)).padStart(2, '0') + v;
  const body =
    tlv('00', '01') + tlv('01', '11') + tlv('59', 'PANADERÍA SAN JOSÉ') + tlv('58', 'AR');
  const withCrc = body + '6304';
  return withCrc + emv.crc16(withCrc);
})();
const accented = emv.parse(withAccent);
check('bytes: the name with accents is read whole', accented?.declaredName === 'PANADERÍA SAN JOSÉ', String(accented?.declaredName));
check('bytes: the field after the accented one is not lost', accented?.country === 'AR', String(accented?.country));
check('bytes: the payload with accents is well formed', accented?.wellFormed === true);
check('bytes: the CRC over bytes matches', accented?.crc.intact === true);
check(
  'bytes: a merchant with an accent does not trigger a false alarm',
  verify(withAccent).state !== STATES.ANOMALY,
  'returned ' + verify(withAccent).state
);
check('bytes: byteLength counts UTF-8, not UTF-16', emv.byteLength('ÍÉ') === 4 && 'ÍÉ'.length === 2);


/* --- decoder round trip ---
   The images/ corpus is a report, not an assertion: it is gitignored and its
   rate changes with the photos. This instead generates a real QR in memory and
   verifies that the decoder reads it without depending on any file. */
const generated = await QRCode.toBuffer(REAL.coto, {
  errorCorrectionLevel: 'M',
  margin: 4,
  scale: 6,
  type: 'png',
});
const decoded = await decodeImage(generated);
check('decoder: reads an in-memory generated QR', decoded.payload !== null, 'error=' + String(decoded.error));
check('decoder: returns exactly the original payload', decoded.payload === REAL.coto);
check(
  'decoder: that payload verifies the same as the literal',
  verify(decoded.payload).state === verify(REAL.coto).state
);

/* A QR with accents must survive the complete round trip: encode, image,
   decode, byte parsing. */
const accentQr = await QRCode.toBuffer(withAccent, { margin: 4, scale: 6, type: 'png' });
const decodedAccent = await decodeImage(accentQr);
check('decoder: a QR with accents returns unchanged', decodedAccent.payload === withAccent);
check(
  'decoder: and does not trigger a false alarm',
  verify(decodedAccent.payload).state !== STATES.ANOMALY,
  'returned ' + verify(decodedAccent.payload).state
);

/* An image without any code is not suspicious: it is unreadable. */
const empty = await QRCode.toBuffer('x', { margin: 0, scale: 1, type: 'png' });
const crop = empty.subarray(0, Math.min(empty.length, 200));
const corruptImage = await decodeImage(crop);
check('decoder: a broken image does not accuse the code', verify(corruptImage.payload).state === STATES.UNREADABLE);


/* --- decoding floors ---
   The actual limits are measured with `npm run bench`. Conservative floors,
   well within measured results, are pinned here so a preprocessing-pipeline
   change that worsens decoding breaks the build rather than going unnoticed.
   They are not the limits: they are the ground that cannot be lost. */
const CANVAS_FLOOR = 900;

async function decodesIdentically(img: Awaited<ReturnType<typeof onCanvas>>): Promise<boolean> {
  const buf = await img.getBufferAsync('image/png');
  const { payload } = await decodeImage(buf);
  return payload === REAL.coto;
}

const smallQr = await onCanvas(REAL.coto, CANVAS_FLOOR, 200);
check('floor: reads a QR 200px per side', await decodesIdentically(smallQr));

const rotatedQr = rotate(await onCanvas(REAL.coto, CANVAS_FLOOR, 420), 20);
check('floor: reads with 20 degrees of rotation', await decodesIdentically(rotatedQr));

const blurredQr = blur(await onCanvas(REAL.coto, CANVAS_FLOOR, 420), 3);
check('floor: reads with 3px of blur', await decodesIdentically(blurredQr));

/* Perspective was the weakest axis: it read up to 10% before counter-tilt and
   up to 40% afterward. This floor protects that gain, which covers the real
   case of a sign photographed from the side. */
const base420 = await onCanvas(REAL.coto, CANVAS_FLOOR, 420);
for (const [label, img] of [
  ['horizontal +', tilt(base420, 0.25, 'h')],
  ['horizontal -', tilt(base420, -0.25, 'h')],
  ['vertical +', tilt(base420, 0.25, 'v')],
  ['vertical -', tilt(base420, -0.25, 'v')],
] as const) {
  check('floor: reads with 25% tilt ' + label, await decodesIdentically(img));
}

/* Orientation cannot decide how much work is done. A 1000x2600 image ran all
   twelve warps at full resolution because the cap considered only width: 27
   seconds and 636 MB, versus far less with the same landscape pixels. Compare
   attempt count, which is deterministic, not time. */
const vertical = await new Jimp(700, 1800, 0xf0f0f0ff).getBufferAsync('image/png');
const landscape = await new Jimp(1800, 700, 0xf0f0f0ff).getBufferAsync('image/png');
const verticalCost = (await decodeImage(vertical)).attempts;
const landscapeCost = (await decodeImage(landscape)).attempts;
check(
  'cost: orientation does not change worst-case work',
  verticalCost === landscapeCost,
  'vertical=' + verticalCost + ' landscape=' + landscapeCost
);


/* --- the copy is the product ---
   These strings are the only thing the person sees, and they arrive on a phone
   while someone decides whether to pay. They live in messages.ts, in Spanish,
   because that is the product surface; everything else here is English because
   developers read it. These checks defend that boundary. */
const ALL_VERDICTS = [
  verify(null),
  verify('not a qr'),
  verify(REAL.coto),
  verify(twoRoutes),
  verify(missingCrc),
  withDomain(true, [['mpago:11426824', 'Coto CICSA']], () => verify(REAL.coto)),
  withDomain(true, [], () => verify(REAL.coto)),
]

check(
  'copy: no message leaks field numbers, CRC values or internal names',
  !ALL_VERDICTS.some((v) => /field \d|CRC|tag|0x[0-9a-f]/i.test(v.message)),
  ALL_VERDICTS.map((v) => v.message).find((m) => /field \d|CRC|tag/i.test(m)) ?? ''
)
check(
  'copy: every message opens with a symbol and a bold title',
  ALL_VERDICTS.every((v) => /^\S+ \*[^*]+\*/u.test(v.message)),
  ALL_VERDICTS.map((v) => v.message.slice(0, 26)).join(' | ')
)
/* The one that matters: silence must not look like an alarm. Softening this is
   what drains the meaning from the real warning. */
check(
  'copy: out of coverage does NOT use the warning symbol',
  !verify(REAL.coto).message.startsWith('⚠'),
  verify(REAL.coto).message.slice(0, 22)
)
check(
  'copy: the real warning DOES use it',
  withDomain(true, [], () => verify(REAL.coto)).message.startsWith('⚠')
)
check(
  'copy: user-facing text is in Spanish, not English',
  ALL_VERDICTS.every((v) => !/(the code|warning\.|verified qr|I could not)/i.test(v.message))
)

/* --- image corpus --- */
async function imageCorpus(): Promise<void> {
  const root = path.resolve(HERE, '..', '..', '..', 'images');
  if (!fs.existsSync(root)) {
    console.log('\nimage corpus: images/ is not present (gitignored) - skipped');
    return;
  }
  const files: string[] = [];
  (function walk(dir: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (/\.(jpe?g|png|bmp|webp)$/i.test(entry.name)) files.push(p);
    }
  })(root);

  let read = 0;
  const misses: string[] = [];
  const states: Record<string, number> = {};
  for (const file of files) {
    const { payload } = await decodeImage(file);
    if (payload !== null) {
      read++;
      const state = verify(payload).state;
      states[state] = (states[state] ?? 0) + 1;
    } else {
      misses.push(path.relative(root, file).split(path.sep).join('/'));
    }
  }

  const rate = files.length > 0 ? Math.round((read / files.length) * 100) : 0;
  console.log('\nimage corpus: ' + read + '/' + files.length + ' read (' + rate + '%)');
  for (const [state, n] of Object.entries(states)) console.log('  ' + state + ': ' + n);
  if (misses.length > 0) {
    console.log('  unread:');
    for (const m of misses) console.log('    - ' + m);
  }
}

await imageCorpus().catch((err: unknown) => {
  console.log('\nimage corpus: error - ' + (err instanceof Error ? err.message : String(err)));
});

console.log('\n' + passed + ' checks passed, ' + failures.length + ' failed');
for (const f of failures) console.log('  FAILURE  ' + f);
process.exit(failures.length > 0 ? 1 : 0);
