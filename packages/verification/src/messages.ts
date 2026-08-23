/**
 * Every string the person actually reads.
 *
 * WHY THIS FILE IS IN SPANISH WHILE THE REST OF THE REPO IS IN ENGLISH:
 * this is not code, it is the product. These lines arrive over WhatsApp to
 * someone standing in front of a QR code in Argentina, deciding whether to pay.
 * Identifiers, comments and documentation are English because developers read
 * them; this text is Spanish because users read it. Two audiences, two
 * languages, one boundary — and the boundary is this file, so nobody has to
 * remember a convention.
 *
 * It also makes a second language cheap later: swap this module, touch nothing
 * else. That is the only reason there is no i18n machinery today — one locale
 * does not justify it.
 *
 * HOW THE MESSAGES ARE SHAPED. The reader is outdoors, glancing at a phone,
 * one-handed. A chat has no colour, so the leading symbol is the only thing
 * that separates one state from another before a single word is read. The
 * asterisks are WhatsApp bold; anywhere else they render as asterisks and the
 * message still reads fine, which is why nothing more exotic is used.
 *
 * THE RULE THAT DOES NOT BEND: out-of-coverage gets a magnifying glass, never a
 * warning triangle. The glass says "I looked and found nothing". A triangle
 * would say something is wrong, and nothing is: the registry is silent. Silence
 * dressed as an alert is exactly what drains the meaning from the real warning,
 * and the real warning is the whole product. A test pins this in both
 * directions.
 *
 * NO IMPLEMENTATION LEAKS. No EMV field numbers, no CRC hex, no internal names.
 * "Field 26" means something here and nothing on the other side. The technical
 * detail is not lost: it lives in the `reading` object, which the CLI prints
 * separately.
 */

const SIMBOLO = {
  verificado: '✅',
  advertencia: '⚠️',
  /** Neutro a propósito. Ver la regla de arriba. */
  sinDatos: '🔎',
  anomalia: '🚩',
  ilegible: '📷',
} as const;

/** Símbolo, título en negrita, y la explicación en su propio renglón. */
function componer(simbolo: string, titulo: string, cuerpo: string): string {
  return simbolo + ' *' + titulo + '*\n\n' + cuerpo;
}

export const MENSAJES = {
  ilegible: (): string =>
    componer(
      SIMBOLO.ilegible,
      'No pude leer el código',
      'Probá sacar la foto con más luz, de frente y un poco más cerca.'
    ),

  noReconocido: (): string =>
    componer(
      SIMBOLO.sinDatos,
      'Leí el código pero no sé qué es',
      'No tiene formato de pago ni de enlace, así que no puedo analizarlo. Esto no es una advertencia.'
    ),

  anomalia: (motivo: string): string =>
    componer(SIMBOLO.anomalia, 'Este código tiene algo raro', motivo),

  verificado: (emisor: string): string =>
    componer(SIMBOLO.verificado, 'QR verificado', 'Este código está autorizado por ' + emisor + '.'),

  noAutorizado: (emisor: string): string =>
    componer(
      SIMBOLO.advertencia,
      'Advertencia',
      'Este QR no está registrado como un medio de cobro autorizado por ' + emisor + '.'
    ),

  fueraDeCobertura: (): string =>
    componer(
      SIMBOLO.sinDatos,
      'Todavía no tengo registro de este comercio',
      'No puedo confirmar ni descartar nada. Esto no es una advertencia.'
    ),
} as const;

/**
 * Observaciones sobre el código mismo.
 *
 * Cada una es una frase completa: aparece debajo de un título, no encastrada en
 * él, así que pegarle un prefijo adelante rompe la gramática.
 */
export const NOTAS = {
  estructuraRota: (): string => 'El contenido está incompleto, o tiene datos de más al final.',

  faltaControl: (): string =>
    'Le falta el código de seguridad que todo QR de pago tiene que llevar.',

  controlNoCoincide: (): string =>
    'El código de seguridad no coincide con el contenido. Está alterado, o se leyó mal.',

  sinNombre: (): string => 'El código no dice a nombre de qué comercio cobra.',

  nombreLibre: (nombre: string): string =>
    'Dice cobrar a nombre de «' +
    nombre +
    '», pero ese nombre lo escribe quien genera el código: no prueba quién recibe el dinero.',

  otroPais: (): string => 'Está emitido para otro país, no para Argentina.',

  otraMoneda: (): string => 'Cobra en una moneda que no es el peso argentino.',

  variasCuentas: (cuantasExtra: number): string =>
    'Declara ' +
    (cuantasExtra === 1 ? 'dos cuentas de cobro distintas' : 'varias cuentas de cobro distintas') +
    '. No hay forma de saber a cuál de ellas iría la plata.',
} as const;
