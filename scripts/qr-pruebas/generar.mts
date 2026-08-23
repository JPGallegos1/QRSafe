/**
 * Genera una carpeta de QR para probar el motor a mano.
 *
 * No son imágenes decorativas: cada una ejercita un comportamiento distinto del
 * motor, y lleva impreso al pie qué veredicto debería devolver. La idea es
 * imprimir la hoja o mostrarla en pantalla, fotografiarla con el teléfono y
 * mandarla por WhatsApp — que es el único tramo del pipeline que todavía no se
 * probó con un código real.
 *
 * Los payloads de pago son tramas EMVCo válidas, con CRC calculado, no cadenas
 * inventadas: dos de ellas se decodificaron de fotos reales.
 *
 *   npx tsx scripts/qr-pruebas/generar.ts
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import Jimp from 'jimp';
import QRCode from 'qrcode';
import { crc16, byteLength } from '../../packages/verification/src/emv.js';

const SALIDA = path.resolve(process.cwd(), 'qr-pruebas');

/** Arma un campo TLV con la longitud contada en bytes UTF-8, como manda EMVCo. */
const tlv = (tag: string, value: string): string =>
  tag + String(byteLength(value)).padStart(2, '0') + value;

/** Cierra una trama agregándole el campo 63 con su CRC. */
const sellar = (cuerpo: string): string => {
  const conCampo = cuerpo + '6304';
  return conCampo + crc16(conCampo);
};

interface Caso {
  archivo: string;
  titulo: string;
  espera: string;
  porque: string;
  payload: string;
}

/* --- pago: tramas EMVCo --- */

const COTO_REAL =
  '00020101021143530016com.mercadolibre0129https://mpago.la/pos/1142682450150011305480831565204970053030325802AR5925COTO CENTRO INTEGRAL DE C6015CAPITAL FEDERAL63043E84';

const CARTEL_MP_REAL =
  '00020101021143530016com.mercadolibre0129https://mpago.la/pos/4223845750150011000000000005204970053030325802AR5909UNDEFINED6004CABA630442AC';

const MUNICIPAL = sellar(
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

const CON_ACENTO = sellar(
  tlv('00', '01') +
    tlv('01', '11') +
    tlv('43', tlv('00', 'com.mercadolibre') + tlv('01', 'https://mpago.la/pos/99887766')) +
    tlv('53', '032') +
    tlv('58', 'AR') +
    tlv('59', 'PANADERÍA SAN JOSÉ') +
    tlv('60', 'CÓRDOBA')
);

const DOS_VIAS = sellar(
  tlv('00', '01') +
    tlv('01', '11') +
    tlv('43', tlv('00', 'com.mercadolibre') + tlv('01', 'https://mpago.la/pos/11426824')) +
    tlv('26', tlv('00', 'com.otrobanco') + tlv('01', 'CUENTA-AJENA-001')) +
    tlv('53', '032') +
    tlv('58', 'AR') +
    tlv('59', 'COTO') +
    tlv('60', 'CABA')
);

const SIN_CRC = (() => {
  const cuerpo = COTO_REAL.slice(0, -8);
  return cuerpo + crc16(cuerpo); // se omite el campo 63 y se pega el checksum
})();

const MONEDA_RARA = sellar(
  tlv('00', '01') +
    tlv('01', '11') +
    tlv('43', tlv('00', 'com.mercadolibre') + tlv('01', 'https://mpago.la/pos/55443322')) +
    tlv('53', '840') +
    tlv('58', 'US') +
    tlv('59', 'TIENDA EJEMPLO') +
    tlv('60', 'MIAMI')
);

const NOMBRE_PUBLICO = sellar(
  tlv('00', '01') +
    tlv('01', '11') +
    tlv('43', tlv('00', 'com.mercadolibre') + tlv('01', 'https://mpago.la/pos/13131313')) +
    tlv('53', '032') +
    tlv('58', 'AR') +
    tlv('59', 'MUNICIPALIDAD DE CORDOBA') +
    tlv('60', 'CORDOBA')
);

const CASOS: Caso[] = [
  {
    archivo: '01-coto-real',
    titulo: 'QR real de Coto',
    espera: 'FUERA DE COBERTURA',
    porque: 'trama real decodificada de una foto; el registro está vacío',
    payload: COTO_REAL,
  },
  {
    archivo: '02-cartel-mercadopago-real',
    titulo: 'Cartel real de Mercado Pago',
    espera: 'FUERA DE COBERTURA',
    porque: 'su campo 59 dice literalmente UNDEFINED, sin nombre de comercio',
    payload: CARTEL_MP_REAL,
  },
  {
    archivo: '03-parquimetro-cordoba',
    titulo: 'Parquímetro municipal simulado',
    espera: 'FUERA DE COBERTURA',
    porque: 'el dominio existe pero está abierto; con el dominio cerrado daría NO AUTORIZADO',
    payload: MUNICIPAL,
  },
  {
    archivo: '04-comercio-con-acento',
    titulo: 'Comercio con acentos en el nombre',
    espera: 'FUERA DE COBERTURA',
    porque: 'las longitudes van en bytes UTF-8; si se contaran caracteres, daría ANOMALÍA',
    payload: CON_ACENTO,
  },
  {
    archivo: '05-dos-vias-de-cobro',
    titulo: 'Dos vías de cobro en un mismo código',
    espera: 'ANOMALÍA',
    porque: 'el CRC es perfecto y aun así no se puede afirmar por cuál se cobraría',
    payload: DOS_VIAS,
  },
  {
    archivo: '06-sin-campo-de-control',
    titulo: 'Sin el campo 63 obligatorio',
    espera: 'ANOMALÍA',
    porque: 'el checksum coincide consigo mismo, pero falta el campo que lo declara',
    payload: SIN_CRC,
  },
  {
    archivo: '07-moneda-extranjera',
    titulo: 'Moneda y país que no son los de acá',
    espera: 'ANOMALÍA',
    porque: 'declara dólares y Estados Unidos en un QR que se paga en Argentina',
    payload: MONEDA_RARA,
  },
  {
    archivo: '08-nombre-publico-falso',
    titulo: 'Dice cobrar a nombre de la Municipalidad',
    espera: 'FUERA DE COBERTURA, con observación',
    porque: 'el campo 59 es texto libre; el motor lo señala sin acusar',
    payload: NOMBRE_PUBLICO,
  },
  {
    archivo: '09-exploracion-museo',
    titulo: 'QR informativo de museo',
    espera: 'FUERA DE COBERTURA',
    porque: 'es una URL, el otro flujo; el motor muestra el destino real',
    payload: 'https://www.mhnv.gob.cl/sala/paleontologia',
  },
  {
    archivo: '10-exploracion-homografo',
    titulo: 'Dominio parecido al oficial',
    espera: 'FUERA DE COBERTURA',
    porque: 'mhnv-gob.cl no es mhnv.gob.cl; hoy el motor no lo distingue todavía',
    payload: 'https://mhnv-gob.cl/sala/paleontologia',
  },
];

const LADO = 620;
const MARGEN = 40;
const ALTO_PIE = 130;

async function hoja(caso: Caso, indice: number): Promise<void> {
  const qr = await Jimp.read(
    await QRCode.toBuffer(caso.payload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: LADO,
      type: 'png',
    })
  );

  const ancho = LADO + MARGEN * 2;
  const alto = LADO + MARGEN * 2 + ALTO_PIE;
  const hoja = new Jimp(ancho, alto, 0xffffffff);
  hoja.composite(qr, MARGEN, MARGEN);

  const titulo = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);
  const chico = await Jimp.loadFont(Jimp.FONT_SANS_12_BLACK);

  let y = LADO + MARGEN + 14;
  hoja.print(titulo, MARGEN, y, String(indice + 1).padStart(2, '0') + ' · ' + caso.titulo, ancho - MARGEN * 2);
  y += 26;
  hoja.print(chico, MARGEN, y, 'Esperado: ' + caso.espera, ancho - MARGEN * 2);
  y += 20;
  hoja.print(chico, MARGEN, y, caso.porque, ancho - MARGEN * 2);

  await hoja.writeAsync(path.join(SALIDA, caso.archivo + '.png'));
}

async function main(): Promise<void> {
  await fs.mkdir(SALIDA, { recursive: true });

  for (const [i, caso] of CASOS.entries()) {
    await hoja(caso, i);
    console.log('  ' + caso.archivo + '.png  →  ' + caso.espera);
  }

  const filas = CASOS.map(
    (c, i) =>
      '| ' + String(i + 1).padStart(2, '0') + ' | `' + c.archivo + '.png` | ' + c.titulo + ' | **' + c.espera + '** | ' + c.porque + ' |'
  ).join('\n');

  const readme = `# QR de prueba

Generados por \`scripts/qr-pruebas/generar.ts\`. **No los edites a mano**: volvé a
correr el script.

Cada imagen lleva impreso al pie qué veredicto debería devolver el motor. Los
payloads de pago son tramas EMVCo válidas con su CRC calculado; los casos 01 y
02 se decodificaron de fotografías reales.

## Para qué son

Para probar el tramo que todavía no se probó con un código real: sacarles una
foto con el teléfono y mandarla por WhatsApp al número de sandbox. Mostralos en
pantalla o imprimilos.

Para probar el motor directamente, sin el canal:

\`\`\`
npx tsx packages/verification/src/cli.ts qr-pruebas/01-coto-real.png
\`\`\`

## Los casos

| # | Archivo | Qué es | Veredicto esperado | Por qué |
|---|---|---|---|---|
${filas}

## Sobre los "fuera de cobertura"

Que casi todos den **fuera de cobertura** no es una falla: **el registro está
vacío**. Ningún dominio tiene \`closed: true\` y ningún identificador está
enrolado, así que el motor no tiene con qué afirmar ni con qué desmentir. Es la
respuesta correcta.

Los que dan **anomalía** son los interesantes hoy: no dependen del registro,
salen de lo que el código dice de sí mismo.
`;

  await fs.writeFile(path.join(SALIDA, 'README.md'), readme, 'utf8');
  console.log('\n  ' + CASOS.length + ' hojas + README en qr-pruebas/\n');
}

await main();
