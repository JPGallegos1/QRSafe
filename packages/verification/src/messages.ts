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

/**
 * Un carácter que puede fabricar estructura en el mensaje: saltos de línea y
 * controles. Se decide por punto de código en vez de por expresión regular —
 * un regex con caracteres de control se escribe mal con una sola capa de
 * comillas de más, y eso ya pasó en este mismo archivo.
 */
function fabricaEstructura(punto: number): boolean {
  return punto < 0x20 || (punto >= 0x7f && punto <= 0x9f) || punto === 0x2028 || punto === 0x2029;
}

/** Los caracteres con los que WhatsApp arma negrita, itálica y monoespacio. */
const FORMATO = /[*_~`]/g;

/**
 * Cleans any text that came out of the QR before it enters a message.
 *
 * THIS IS A SECURITY BOUNDARY, not tidiness. Field 59 is free text that the
 * person generating the code writes, which means an attacker writes it. A
 * merchant name carrying two line breaks and a bold check mark renders a
 * complete, convincing verification block inside a reply whose real verdict is
 * "I have no record of this merchant". The state stays correct and the person
 * reads the opposite — the worst possible failure for a product whose entire
 * value is the sentence it sends.
 *
 * So: no line breaks, because they build blocks. No WhatsApp formatting
 * characters, because they build emphasis. No control characters. And a hard
 * length cap, because EMVCo caps this field at 25 characters anyway and
 * anything longer is already an attempt at something.
 */
export function limpiarTextoDelCodigo(valor: string, maximo = 40): string {
  const plano = Array.from(valor)
    .map((c) => (fabricaEstructura(c.codePointAt(0) ?? 0) ? ' ' : c))
    .join('')
    .replace(FORMATO, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plano.length > maximo ? plano.slice(0, maximo) + '…' : plano;
}

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

  /**
   * El emisor sale del registro, no del código, así que es texto de confianza.
   * Se limpia igual: si algún día una vía de alta deja entrar un nombre sin
   * revisar, esto ya está puesto.
   */
  verificado: (emisor: string): string =>
    componer(
      SIMBOLO.verificado,
      'QR verificado',
      'Este código está autorizado por ' + limpiarTextoDelCodigo(emisor, 60) + '.'
    ),

  noAutorizado: (emisor: string): string =>
    componer(
      SIMBOLO.advertencia,
      'Advertencia',
      'Este QR no está registrado como un medio de cobro autorizado por ' +
        limpiarTextoDelCodigo(emisor, 60) +
        '.'
    ),

  fueraDeCobertura: (): string =>
    componer(
      SIMBOLO.sinDatos,
      'Todavía no tengo registro de este comercio',
      'No puedo confirmar ni descartar nada. Esto no es una advertencia.'
    ),

  /** Llegó algo que no es una imagen. */
  sinImagen: (): string =>
    componer(
      SIMBOLO.ilegible,
      'Mandame una foto del código',
      'Por ahora sólo puedo leer imágenes. Sacale una foto al QR y mandámela.'
    ),

  noSePudoAbrir: (): string =>
    componer(
      SIMBOLO.ilegible,
      'No pude abrir la imagen',
      'Algo falló al descargarla. Probá mandarla de nuevo.'
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

  /** El nombre viene del código: entrada hostil. Ver `limpiarTextoDelCodigo`. */
  nombreLibre: (nombre: string): string =>
    'Dice cobrar a nombre de «' +
    limpiarTextoDelCodigo(nombre) +
    '», pero ese nombre lo escribe quien genera el código: no prueba quién recibe el dinero.',

  otroPais: (): string => 'Está emitido para otro país, no para Argentina.',

  otraMoneda: (): string => 'Cobra en una moneda que no es el peso argentino.',

  variasCuentas: (cuantasExtra: number): string =>
    'Declara ' +
    (cuantasExtra === 1 ? 'dos cuentas de cobro distintas' : 'varias cuentas de cobro distintas') +
    '. No hay forma de saber a cuál de ellas iría la plata.',
} as const;
