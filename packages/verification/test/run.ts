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
import { onCanvas, rotate, blur } from '../bench/degrade.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

let passed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail?: string): void {
  if (condition) passed++;
  else failures.push(name + (detail !== undefined ? ' — ' + detail : ''));
}

/* Payloads decoded from real photographs in images/. Not synthetic. */
const REAL = {
  cartelMP:
    '00020101021143530016com.mercadolibre0129https://mpago.la/pos/4223845750150011000000000005204970053030325802AR5909UNDEFINED6004CABA630442AC',
  coto: '00020101021143530016com.mercadolibre0129https://mpago.la/pos/1142682450150011305480831565204970053030325802AR5925COTO CENTRO INTEGRAL DE C6015CAPITAL FEDERAL63043E84',
} as const;

/* --- parsing --- */
for (const [name, payload] of Object.entries(REAL)) {
  const reading = emv.parse(payload);
  check('parse: ' + name + ' reconocido como EMV', reading !== null);
  if (!reading) continue;
  check(
    'parse: ' + name + ' CRC íntegro',
    reading.crc.intact,
    'embebido ' + reading.crc.embedded + ' vs calculado ' + reading.crc.computed
  );
  check('parse: ' + name + ' es estático', reading.isStatic);
  check('parse: ' + name + ' país AR', reading.country === 'AR');
  check(
    'parse: ' + name + ' expone un identificador de POS',
    reading.accountRefs.some((r) => /mpago\.la\/pos\//.test(r.value))
  );
}

check(
  'parse: el cartel de Mercado Pago declara UNDEFINED como nombre',
  emv.parse(REAL.cartelMP)?.declaredName === 'UNDEFINED'
);
check(
  'crc: alterar un dígito rompe la integridad',
  emv.parse(REAL.coto.replace('5925COTO', '5925KOTO'))?.crc.intact === false
);
check('parse: una URL suelta no es EMV', emv.parse('https://ejemplo.com/x') === null);
check('read: una URL suelta se lee como url', emv.read('https://ejemplo.com/x')?.kind === 'url');
check('read: basura no se lee', emv.read('no soy un qr') === null);

/* --- las reglas que no se relajan --- */
const outOfCoverage = verify(REAL.cartelMP);
check(
  'regla: un dominio abierto nunca produce NO_AUTORIZADO',
  outOfCoverage.state !== STATES.NO_AUTORIZADO,
  'devolvió ' + outOfCoverage.state
);
check(
  'regla: fuera de cobertura aclara que no es una advertencia',
  /no es una advertencia/i.test(outOfCoverage.message),
  outOfCoverage.message
);

const unreadable = verify(null);
check('regla: sin payload el estado es ILEGIBLE', unreadable.state === STATES.ILEGIBLE);
check(
  'regla: ilegible no acusa al código',
  !/advertencia|fraud|no autorizado/i.test(unreadable.message),
  unreadable.message
);

const tampered = verify(REAL.coto.replace('5925COTO', '5925KOTO'));
check('regla: CRC roto produce ANOMALIA', tampered.state === STATES.ANOMALIA);

/* --- estados que dependen del registro ---
   Se inyecta un dominio de prueba en vez de enrolar comercios reales en el
   registro de producción. Los dos estados fuertes tienen que ser alcanzables y
   tienen que depender exclusivamente del flag `closed`. */
function withDomain<T>(closed: boolean, authorized: [string, string][], fn: () => T): T {
  const fixture: Domain = {
    id: 'fixture',
    label: 'Dominio de prueba',
    issuer: 'Emisor de Prueba',
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
  'registro: identificador enrolado produce VERIFICADO',
  enrolled.state === STATES.VERIFICADO,
  'devolvió ' + enrolled.state
);
check(
  'registro: VERIFICADO nombra al COMERCIO, no al dominio',
  /autorizado por Coto CICSA/.test(enrolled.message),
  enrolled.message
);
check(
  'registro: VERIFICADO no nombra al dominio en lugar del comercio',
  !/Dominio de prueba/.test(enrolled.message),
  enrolled.message
);

const missingClosed = withDomain(true, [], () => verify(REAL.coto));
check(
  'registro: ausente en dominio CERRADO produce NO_AUTORIZADO',
  missingClosed.state === STATES.NO_AUTORIZADO,
  'devolvió ' + missingClosed.state
);

const missingOpen = withDomain(false, [], () => verify(REAL.coto));
check(
  'registro: el MISMO caso en dominio ABIERTO no acusa',
  missingOpen.state === STATES.FUERA_DE_COBERTURA,
  'devolvió ' + missingOpen.state
);
check(
  'registro: sólo el flag closed separa la acusación del silencio',
  missingClosed.state !== missingOpen.state
);

check(
  'regla: ningún mensaje afirma que el QR sea seguro',
  ![outOfCoverage, unreadable, tampered, enrolled, missingClosed, missingOpen].some((r) =>
    /\bsegur[oa]\b/i.test(r.message)
  )
);

/* --- invariante: un dominio cerrado tiene que poder nombrar a alguien ---
   NO_AUTORIZADO acusa a un emisor por no haber autorizado el código. Un dominio
   sin emisor único no tiene a quién nombrar, así que no puede estar cerrado.
   Sin esto, un VERIFICADO o una acusación nombrarían al dominio en lugar del
   comercio, que es responder otra pregunta. */
for (const d of DOMAINS) {
  check(
    'invariante: el dominio ' + d.id + ' no está cerrado sin emisor',
    !(d.closed && d.issuer === null),
    'closed=' + String(d.closed) + ' issuer=' + String(d.issuer)
  );
}

const sinEmisor = withDomain(false, [], () => verify(REAL.coto));
check(
  'invariante: sin emisor y sin enrolar, el veredicto no acusa',
  sinEmisor.state === STATES.FUERA_DE_COBERTURA,
  'devolvió ' + sinEmisor.state
);

/* --- hallazgos del review de seguridad --- */

/* 1. Un payload SIN el campo 63 obligatorio, con crc16(prefijo) pegado al final,
      se comparaba consigo mismo y parecía íntegro. */
const sinCRC = (() => {
  const cuerpo = REAL.coto.slice(0, REAL.coto.length - 8); // saca "6304XXXX"
  return cuerpo + emv.crc16(cuerpo);
})();
check('estructura: sin campo 63 el CRC no está presente', emv.parse(sinCRC)?.crc.present === false);
check('estructura: sin campo 63 el CRC NO puede figurar íntegro', emv.parse(sinCRC)?.crc.intact === false);
check(
  'estructura: sin campo 63 el veredicto es ANOMALIA, nunca VERIFICADO',
  withDomain(true, [['mpago:11426824', 'Coto CICSA']], () => verify(sinCRC)).state === STATES.ANOMALIA
);

/* 2. Dos vías de cobro en un mismo código: una enrolada y otra no. El veredicto
      no puede avalar el QR entero, porque la billetera podría tomar la otra. */
const dosRutas = (() => {
  const tlv = (t: string, v: string) => t + String(v.length).padStart(2, '0') + v;
  const cuerpo =
    tlv('00', '01') +
    tlv('01', '11') +
    tlv('43', tlv('00', 'com.mercadolibre') + tlv('01', 'https://mpago.la/pos/11426824')) +
    tlv('26', tlv('00', 'com.otrobanco') + tlv('01', 'CUENTA-DEL-ATACANTE')) +
    tlv('53', '032') +
    tlv('58', 'AR') +
    tlv('59', 'COTO') +
    tlv('60', 'CABA');
  const conCRC = cuerpo + '6304';
  return conCRC + emv.crc16(conCRC);
})();
const rutas = emv.parse(dosRutas);
check('rutas: el payload de dos vías parsea y su CRC es íntegro', rutas?.crc.intact === true);
const veredictoRutas = withDomain(true, [['mpago:11426824', 'Coto CICSA']], () => verify(dosRutas));
check(
  'rutas: con una vía enrolada y otra ajena NO devuelve VERIFICADO',
  veredictoRutas.state !== STATES.VERIFICADO,
  'devolvió ' + veredictoRutas.state
);
check(
  'rutas: el veredicto es ANOMALIA y nombra el problema',
  veredictoRutas.state === STATES.ANOMALIA && /más de una vía de cobro/.test(veredictoRutas.message),
  veredictoRutas.message
);
check(
  'rutas: la búsqueda en el registro reporta las vías no cubiertas',
  (veredictoRutas.registry?.otherRoutes.length ?? 0) > 0
);

/* 3. Bomba de descompresión: dimensiones enormes declaradas en la cabecera. */
const bombaPNG = (() => {
  const b = Buffer.alloc(24);
  b.writeUInt32BE(0x89504e47, 0);
  b.writeUInt32BE(0x0d0a1a0a, 4);
  b.writeUInt32BE(13, 8);
  b.write('IHDR', 12);
  b.writeUInt32BE(60000, 16);
  b.writeUInt32BE(60000, 20);
  return b;
})();
const bomba = await decodeImage(bombaPNG);
check(
  'seguridad: una imagen que declara 60000x60000 se rechaza sin decodificar',
  bomba.payload === null && bomba.attempts === 0 && /por encima del límite/.test(bomba.error ?? ''),
  'error=' + String(bomba.error) + ' intentos=' + String(bomba.attempts)
);


/* --- longitudes en BYTES, no en caracteres ---
   EMVCo cuenta bytes UTF-8. Un comercio argentino con acento en el nombre es el
   caso común, no el borde: si el parseo camina caracteres de JavaScript, el
   payload se desalinea y un QR legítimo termina en ANOMALIA. Falsa alarma sobre
   un comercio real es exactamente el fallo que este producto existe para evitar. */
const conAcento = (() => {
  const tlv = (t: string, v: string) => t + String(emv.byteLength(v)).padStart(2, '0') + v;
  const cuerpo =
    tlv('00', '01') + tlv('01', '11') + tlv('59', 'PANADERÍA SAN JOSÉ') + tlv('58', 'AR');
  const conCRC = cuerpo + '6304';
  return conCRC + emv.crc16(conCRC);
})();
const acentuado = emv.parse(conAcento);
check('bytes: el nombre con acentos se lee entero', acentuado?.declaredName === 'PANADERÍA SAN JOSÉ', String(acentuado?.declaredName));
check('bytes: el campo siguiente al acentuado no se pierde', acentuado?.country === 'AR', String(acentuado?.country));
check('bytes: el payload con acentos cierra bien', acentuado?.wellFormed === true);
check('bytes: el CRC sobre bytes coincide', acentuado?.crc.intact === true);
check(
  'bytes: un comercio con acento NO dispara una falsa alarma',
  verify(conAcento).state !== STATES.ANOMALIA,
  'devolvió ' + verify(conAcento).state
);
check('bytes: byteLength cuenta UTF-8, no UTF-16', emv.byteLength('ÍÉ') === 4 && 'ÍÉ'.length === 2);


/* --- ida y vuelta del decodificador ---
   El corpus de images/ es un informe, no una aserción: está gitignorado y su
   tasa se mueve con las fotos. Esto en cambio genera un QR real en memoria y
   verifica que el decodificador lo lee, sin depender de ningún archivo. */
const generado = await QRCode.toBuffer(REAL.coto, {
  errorCorrectionLevel: 'M',
  margin: 4,
  scale: 6,
  type: 'png',
});
const leido = await decodeImage(generado);
check('decoder: lee un QR generado en memoria', leido.payload !== null, 'error=' + String(leido.error));
check('decoder: devuelve exactamente el payload original', leido.payload === REAL.coto);
check(
  'decoder: ese payload verifica igual que el literal',
  verify(leido.payload).state === verify(REAL.coto).state
);

/* Un QR con acentos tiene que sobrevivir la ida y vuelta completa: encode,
   imagen, decode, parseo por bytes. */
const qrAcento = await QRCode.toBuffer(conAcento, { margin: 4, scale: 6, type: 'png' });
const leidoAcento = await decodeImage(qrAcento);
check('decoder: un QR con acentos vuelve idéntico', leidoAcento.payload === conAcento);
check(
  'decoder: y no dispara una falsa alarma',
  verify(leidoAcento.payload).state !== STATES.ANOMALIA,
  'devolvió ' + verify(leidoAcento.payload).state
);

/* Una imagen sin ningún código no es sospechosa: es ilegible. */
const vacia = await QRCode.toBuffer('x', { margin: 0, scale: 1, type: 'png' });
const recorte = vacia.subarray(0, Math.min(vacia.length, 200));
const rota = await decodeImage(recorte);
check('decoder: una imagen rota no acusa al código', verify(rota.payload).state === STATES.ILEGIBLE);


/* --- pisos de lectura ---
   Los límites reales se miden con `npm run bench`. Acá se clavan pisos
   conservadores, bien adentro de lo medido, para que un cambio en la escalera
   de preproceso que empeore la lectura rompa el build en vez de pasar
   desapercibido. No son los límites: son el suelo que no se puede perder. */
const PISO_CANVAS = 900;

async function leeIgual(img: Awaited<ReturnType<typeof onCanvas>>): Promise<boolean> {
  const buf = await img.getBufferAsync('image/png');
  const { payload } = await decodeImage(buf);
  return payload === REAL.coto;
}

const qrChico = await onCanvas(REAL.coto, PISO_CANVAS, 200);
check('piso: lee un QR de 200px de lado', await leeIgual(qrChico));

const qrGirado = rotate(await onCanvas(REAL.coto, PISO_CANVAS, 420), 20);
check('piso: lee con 20 grados de rotación', await leeIgual(qrGirado));

const qrBorroso = blur(await onCanvas(REAL.coto, PISO_CANVAS, 420), 3);
check('piso: lee con 3px de desenfoque', await leeIgual(qrBorroso));


/* --- corpus --- */
async function corpus(): Promise<void> {
  const root = path.resolve(HERE, '..', '..', '..', 'images');
  if (!fs.existsSync(root)) {
    console.log('\ncorpus: images/ no está presente (gitignored) — omitido');
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
  console.log('\ncorpus: ' + read + '/' + files.length + ' leídas (' + rate + '%)');
  for (const [state, n] of Object.entries(states)) console.log('  ' + state + ': ' + n);
  if (misses.length > 0) {
    console.log('  no leídas:');
    for (const m of misses) console.log('    - ' + m);
  }
}

await corpus().catch((err: unknown) => {
  console.log('\ncorpus: error — ' + (err instanceof Error ? err.message : String(err)));
});

console.log('\n' + passed + ' comprobaciones OK, ' + failures.length + ' fallidas');
for (const f of failures) console.log('  FALLA  ' + f);
process.exit(failures.length > 0 ? 1 : 0);
