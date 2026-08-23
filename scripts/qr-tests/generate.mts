/**
 * Generates a QR folder for manually testing the engine.
 *
 * These are not decorative images: each one exercises a different engine
 * behavior and has the expected verdict printed at the bottom. Print the sheet
 * or display it on screen, photograph it with a phone, and send it through
 * WhatsApp, which is the only pipeline segment not yet tested with a real code.
 *
 * The payment payloads are valid EMVCo messages with calculated CRCs, not made-up
 * strings: two were decoded from real photos.
 *
 *   npx tsx scripts/qr-tests/generate.mts
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import Jimp from 'jimp';
import QRCode from 'qrcode';
import { crc16, byteLength } from '../../packages/verification/src/emv.js';

const OUTPUT = path.resolve(process.cwd(), 'qr-tests');

/** Builds a TLV field with a length measured in UTF-8 bytes, as required by EMVCo. */
const tlv = (tag: string, value: string): string =>
  tag + String(byteLength(value)).padStart(2, '0') + value;

/** Completes a message by adding field 63 with its CRC. */
const seal = (body: string): string => {
  const withField = body + '6304';
  return withField + crc16(withField);
};

interface TestCase {
  fileName: string;
  title: string;
  expected: string;
  reason: string;
  payload: string;
}

/* --- payment: EMVCo messages --- */

const REAL_COTO =
  '00020101021143530016com.mercadolibre0129https://mpago.la/pos/1142682450150011305480831565204970053030325802AR5925COTO CENTRO INTEGRAL DE C6015CAPITAL FEDERAL63043E84';

const REAL_MERCADO_PAGO_SIGN =
  '00020101021143530016com.mercadolibre0129https://mpago.la/pos/4223845750150011000000000005204970053030325802AR5909UNDEFINED6004CABA630442AC';

const MUNICIPAL = seal(
  tlv('00', '01') +
    tlv('01', '11') +
    tlv('26', tlv('00', 'ar.gob.cordoba.sem') + tlv('01', 'SEM-CBA-0412')) +
    tlv('52', '7523') +
    tlv('53', '032') +
    tlv('58', 'AR') +
    tlv('59', 'MUNI CORDOBA SEM') +
    tlv('60', 'CORDOBA') +
    tlv('62', tlv('05', 'POSTE-0412'))
);

const WITH_ACCENT = seal(
  tlv('00', '01') +
    tlv('01', '11') +
    tlv('43', tlv('00', 'com.mercadolibre') + tlv('01', 'https://mpago.la/pos/99887766')) +
    tlv('53', '032') +
    tlv('58', 'AR') +
    tlv('59', 'PANADERÍA SAN JOSÉ') +
    tlv('60', 'CÓRDOBA')
);

const TWO_PAYMENT_PATHS = seal(
  tlv('00', '01') +
    tlv('01', '11') +
    tlv('43', tlv('00', 'com.mercadolibre') + tlv('01', 'https://mpago.la/pos/11426824')) +
    tlv('26', tlv('00', 'com.otrobanco') + tlv('01', 'CUENTA-AJENA-001')) +
    tlv('53', '032') +
    tlv('58', 'AR') +
    tlv('59', 'COTO') +
    tlv('60', 'CABA')
);

const WITHOUT_CRC = (() => {
  const body = REAL_COTO.slice(0, -8);
  return body + crc16(body); // Field 63 is omitted and the checksum is appended.
})();

const FOREIGN_CURRENCY = seal(
  tlv('00', '01') +
    tlv('01', '11') +
    tlv('43', tlv('00', 'com.mercadolibre') + tlv('01', 'https://mpago.la/pos/55443322')) +
    tlv('53', '840') +
    tlv('58', 'US') +
    tlv('59', 'TIENDA EJEMPLO') +
    tlv('60', 'MIAMI')
);

const PUBLIC_NAME = seal(
  tlv('00', '01') +
    tlv('01', '11') +
    tlv('43', tlv('00', 'com.mercadolibre') + tlv('01', 'https://mpago.la/pos/13131313')) +
    tlv('53', '032') +
    tlv('58', 'AR') +
    tlv('59', 'MUNICIPALIDAD DE CORDOBA') +
    tlv('60', 'CORDOBA')
);

const TEST_CASES: TestCase[] = [
  {
    fileName: '01-real-coto',
    title: 'Real Coto QR',
    expected: 'OUT OF COVERAGE',
    reason: 'real message decoded from a photo; the registry is empty',
    payload: REAL_COTO,
  },
  {
    fileName: '02-real-mercado-pago-sign',
    title: 'Real Mercado Pago sign',
    expected: 'OUT OF COVERAGE',
    reason: 'its field 59 literally says UNDEFINED, with no merchant name',
    payload: REAL_MERCADO_PAGO_SIGN,
  },
  {
    fileName: '03-cordoba-parking-meter',
    title: 'Simulated municipal parking meter',
    expected: 'OUT OF COVERAGE',
    reason: 'the domain exists but is open; with a closed domain it would return NOT AUTHORIZED',
    payload: MUNICIPAL,
  },
  {
    fileName: '04-merchant-with-accents',
    title: 'Merchant with accented characters in its name',
    expected: 'OUT OF COVERAGE',
    reason: 'lengths are measured in UTF-8 bytes; counting characters would return ANOMALY',
    payload: WITH_ACCENT,
  },
  {
    fileName: '05-two-payment-paths',
    title: 'Two payment paths in the same code',
    expected: 'ANOMALY',
    reason: 'the CRC is perfect, but it is still impossible to determine which path would charge',
    payload: TWO_PAYMENT_PATHS,
  },
  {
    fileName: '06-without-required-control-field',
    title: 'Without mandatory field 63',
    expected: 'ANOMALY',
    reason: 'the checksum matches itself, but the field that declares it is missing',
    payload: WITHOUT_CRC,
  },
  {
    fileName: '07-foreign-currency',
    title: 'Currency and country that do not belong here',
    expected: 'ANOMALY',
    reason: 'declares US dollars and the United States in a QR paid in Argentina',
    payload: FOREIGN_CURRENCY,
  },
  {
    fileName: '08-false-public-name',
    title: 'Claims to charge on behalf of the Municipality',
    expected: 'OUT OF COVERAGE, with a warning',
    reason: 'field 59 is free text; the engine flags it without making an accusation',
    payload: PUBLIC_NAME,
  },
  {
    fileName: '09-museum-exploration',
    title: 'Museum information QR',
    expected: 'OUT OF COVERAGE',
    reason: 'it is a URL, which follows the other flow; the engine displays the real destination',
    payload: 'https://www.mhnv.gob.cl/sala/paleontologia',
  },
  {
    fileName: '10-homograph-exploration',
    title: 'Domain similar to the official one',
    expected: 'OUT OF COVERAGE',
    reason: 'mhnv-gob.cl is not mhnv.gob.cl; the engine does not distinguish them yet',
    payload: 'https://mhnv-gob.cl/sala/paleontologia',
  },
];

const SIDE = 620;
const MARGIN = 40;
const FOOTER_HEIGHT = 130;

async function sheet(testCase: TestCase, index: number): Promise<void> {
  const qr = await Jimp.read(
    await QRCode.toBuffer(testCase.payload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: SIDE,
      type: 'png',
    })
  );

  const width = SIDE + MARGIN * 2;
  const height = SIDE + MARGIN * 2 + FOOTER_HEIGHT;
  const image = new Jimp(width, height, 0xffffffff);
  image.composite(qr, MARGIN, MARGIN);

  const titleFont = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);
  const smallFont = await Jimp.loadFont(Jimp.FONT_SANS_12_BLACK);

  let y = SIDE + MARGIN + 14;
  image.print(titleFont, MARGIN, y, String(index + 1).padStart(2, '0') + ' · ' + testCase.title, width - MARGIN * 2);
  y += 26;
  image.print(smallFont, MARGIN, y, 'Expected: ' + testCase.expected, width - MARGIN * 2);
  y += 20;
  image.print(smallFont, MARGIN, y, testCase.reason, width - MARGIN * 2);

  await image.writeAsync(path.join(OUTPUT, testCase.fileName + '.png'));
}

async function main(): Promise<void> {
  await fs.mkdir(OUTPUT, { recursive: true });

  for (const [i, testCase] of TEST_CASES.entries()) {
    await sheet(testCase, i);
    console.log('  ' + testCase.fileName + '.png  →  ' + testCase.expected);
  }

  const rows = TEST_CASES.map(
    (testCase, i) =>
      '| ' + String(i + 1).padStart(2, '0') + ' | `' + testCase.fileName + '.png` | ' + testCase.title + ' | **' + testCase.expected + '** | ' + testCase.reason + ' |'
  ).join('\n');

  const readme = `# QR Test Cases

Generated by \`scripts/qr-tests/generate.mts\`. **Do not edit them manually**: run
the script again.

Each image has the verdict that the engine should return printed at the bottom.
The payment payloads are valid EMVCo messages with their calculated CRCs; cases
01 and 02 were decoded from real photographs.

## Purpose

To test the segment not yet tested with a real code: photograph them with a
phone and send them through WhatsApp to the sandbox number. Display or print
them.

To test the engine directly, without the channel:

\`\`\`
npx tsx packages/verification/src/cli.ts qr-tests/01-real-coto.png
\`\`\`

## Test Cases

| # | File | Description | Expected Verdict | Reason |
|---|---|---|---|---|
${rows}

## About "Out of Coverage"

The fact that nearly all return **out of coverage** is not a failure: **the
registry is empty**. No domain has \`closed: true\` and no identifier is
enrolled, so the engine has nothing to confirm or refute. This is the correct
response.

The ones returning **anomaly** are the interesting cases today: they do not
depend on the registry and arise from what the code says about itself.
`;

  await fs.writeFile(path.join(OUTPUT, 'README.md'), readme, 'utf8');
  console.log('\n  ' + TEST_CASES.length + ' sheets + README in qr-tests/\n');
}

await main();
