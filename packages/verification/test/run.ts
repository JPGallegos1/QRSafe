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
function withDomain<T>(closed: boolean, authorized: string[], fn: () => T): T {
  const fixture: Domain = {
    id: 'fixture',
    label: 'Dominio de prueba',
    issuer: 'Emisor de Prueba',
    closed,
    matches: { schemes: ['com.mercadolibre'], hosts: ['mpago.la'] },
    authorized: new Set(authorized),
  };
  DOMAINS.unshift(fixture);
  try {
    return fn();
  } finally {
    DOMAINS.shift();
  }
}

const enrolled = withDomain(true, ['mpago:11426824'], () => verify(REAL.coto));
check(
  'registro: identificador enrolado produce VERIFICADO',
  enrolled.state === STATES.VERIFICADO,
  'devolvió ' + enrolled.state
);
check(
  'registro: VERIFICADO nombra al emisor',
  /autorizado por Emisor de Prueba/.test(enrolled.message),
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
