/**
 * Turns a decoded payload into one of five verdicts.
 *
 * The rules that must not be relaxed — each one is pinned by a test:
 *
 *  - NO_AUTORIZADO is only ever emitted inside a CLOSED domain. Outside one, an
 *    unknown identifier means the registry is incomplete, not that the code is
 *    forged.
 *  - FUERA_DE_COBERTURA always states, in words, that it is not a warning.
 *    Softening that sentence into a hedged alert destroys the meaning of
 *    NO_AUTORIZADO, which is the only reason this product is worth anything.
 *  - An intact CRC is never reported as reassuring. A well-formed fraudulent
 *    code passes it exactly like the legitimate one.
 *  - ILEGIBLE says nothing about the code. Failing to read a photo is a fact
 *    about the photo.
 *
 * This module knows nothing about users, channels or subscriptions. The gate
 * that decides WHETHER a query is served lives in the app in front of it; this
 * decides WHAT is answered. Mixing them would make a subscription problem read
 * as a judgement about the QR.
 */

import * as emv from './emv.js';
import * as registry from './registry.js';
import type { Reading } from './emv.js';
import type { Lookup } from './registry.js';

export const STATES = {
  VERIFICADO: 'VERIFICADO',
  NO_AUTORIZADO: 'NO_AUTORIZADO',
  FUERA_DE_COBERTURA: 'FUERA_DE_COBERTURA',
  ANOMALIA: 'ANOMALIA',
  ILEGIBLE: 'ILEGIBLE',
} as const;

export type State = (typeof STATES)[keyof typeof STATES];

export interface Note {
  level: 'alto' | 'medio';
  text: string;
}

export interface Verdict {
  state: State;
  message: string;
  notes: Note[];
  reading: Reading | null;
  registry: Lookup | null;
}

/** Names that suggest a public body or a known brand. Field 59 is free text. */
const CLAIMED_PUBLIC = /\b(municipalidad|muni|gobierno|senasa|afip|arca|rentas|banco)\b/i;

/**
 * Observations that hold with an empty registry.
 *
 * COPY RULE: the text of a note is **the only thing the person reads**, and it
 * arrives on WhatsApp while they are standing in front of a code deciding
 * whether to pay. It must never leak implementation: no EMV tag numbers, no CRC
 * hex, no field names. "Field 26" means something here and nothing there.
 *
 * The technical detail is not lost — it lives in the `reading` object, which the
 * CLI prints separately for whoever is debugging. Two audiences, two surfaces.
 *
 * Each note is a complete sentence on its own: it appears under a title, not
 * spliced into one, so gluing a prefix in front of it breaks the grammar.
 */
export function structuralNotes(reading: Reading): Note[] {
  const notes: Note[] = [];
  if (reading.kind !== 'emv') return notes;

  if (!reading.wellFormed) {
    notes.push({
      level: 'alto',
      text: 'El contenido está incompleto, o tiene datos de más al final.',
    });
  } else if (!reading.crc.present) {
    notes.push({
      level: 'alto',
      text: 'Le falta el código de seguridad que todo QR de pago tiene que llevar.',
    });
  } else if (!reading.crc.intact) {
    notes.push({
      level: 'alto',
      text: 'El código de seguridad no coincide con el contenido. Está alterado, o se leyó mal.',
    });
  }

  const name = reading.declaredName;
  if (name === null || /^undefined$/i.test(name)) {
    notes.push({ level: 'medio', text: 'El código no dice a nombre de qué comercio cobra.' });
  } else if (CLAIMED_PUBLIC.test(name)) {
    notes.push({
      level: 'medio',
      text:
        'Dice cobrar a nombre de «' +
        name +
        '», pero ese nombre lo escribe quien genera el código: no prueba quién recibe el dinero.',
    });
  }

  if (reading.country !== null && reading.country !== 'AR') {
    notes.push({
      level: 'alto',
      text: 'Está emitido para otro país, no para Argentina.',
    });
  }
  if (reading.currency !== null && reading.currency !== '032') {
    notes.push({
      level: 'alto',
      text: 'Cobra en una moneda que no es el peso argentino.',
    });
  }
  return notes;
}

/**
 * Da forma al mensaje que llega al teléfono.
 *
 * Llega por WhatsApp, a alguien parado frente a un código decidiendo si paga.
 * Se lee de reojo, en la calle, con una mano. Por eso el estado va primero y
 * como símbolo: en un chat no hay color, así que el símbolo es lo único que
 * distingue un estado de otro antes de leer una palabra.
 *
 * Los asteriscos son negrita de WhatsApp. En cualquier otro canal se ven como
 * asteriscos y el mensaje se sigue leyendo bien, que es la razón de no usar
 * nada más exótico.
 *
 * REGLA QUE NO SE RELAJA: el símbolo de FUERA_DE_COBERTURA tiene que ser
 * neutro. La lupa dice "busqué y no encontré". Un triángulo de advertencia
 * diría que hay algo mal, y no lo hay: hay silencio del registro. Ese silencio
 * disfrazado de alerta es justamente lo que vacía de significado a la
 * advertencia de verdad.
 */
function componer(simbolo: string, titulo: string, cuerpo: string): string {
  return simbolo + ' *' + titulo + '*' + String.fromCharCode(10, 10) + cuerpo
}

export function verify(payload: string | null): Verdict {
  if (payload === null || payload.length === 0) {
    return {
      state: STATES.ILEGIBLE,
      message: componer(
        '📷',
        'No pude leer el código',
        'Probá sacar la foto con más luz, de frente y un poco más cerca.'
      ),
      notes: [],
      reading: null,
      registry: null,
    };
  }

  const reading = emv.read(payload);
  if (!reading) {
    return {
      state: STATES.FUERA_DE_COBERTURA,
      message: componer(
        '🔎',
        'Leí el código pero no sé qué es',
        'No tiene formato de pago ni de enlace, así que no puedo analizarlo. Esto no es una advertencia.'
      ),
      notes: [],
      reading: null,
      registry: null,
    };
  }

  const notes = structuralNotes(reading);
  const hit = registry.lookup(reading);

  // Several payment routes in one code: whichever one this verdict looked at,
  // the wallet may take another. Verifying one route while a second is present
  // would vouch for a payment that could leave through the other. Refuse.
  if (hit.otherRoutes.length > 0) {
    notes.push({
      level: 'alto',
      text:
        'Declara ' +
        (hit.otherRoutes.length === 1 ? 'dos cuentas de cobro distintas' : 'varias cuentas de cobro distintas') +
        '. No hay forma de saber a cuál de ellas iría la plata.',
    });
  }

  const blocking = notes.filter((n) => n.level === 'alto');

  const first = blocking[0];
  if (first !== undefined) {
    return {
      state: STATES.ANOMALIA,
      message: componer('🚩', 'Este código tiene algo raro', first.text),
      notes,
      reading,
      registry: hit,
    };
  }

  if (hit.domain !== null && hit.enrolled) {
    return {
      state: STATES.VERIFICADO,
      message: componer(
        '✅',
        'QR verificado',
        'Este código está autorizado por ' + (hit.issuer ?? hit.domain.label) + '.'
      ),
      notes,
      reading,
      registry: hit,
    };
  }

  if (hit.domain !== null && hit.domain.closed) {
    return {
      state: STATES.NO_AUTORIZADO,
      message: componer(
        '⚠️',
        'Advertencia',
        'Este QR no está registrado como un medio de cobro autorizado por ' +
          (hit.issuer ?? hit.domain.label) +
          '.'
      ),
      notes,
      reading,
      registry: hit,
    };
  }

  // Domain unknown, or known but still open: the registry cannot speak.
  return {
    state: STATES.FUERA_DE_COBERTURA,
    message: componer(
      '🔎',
      'Todavía no tengo registro de este comercio',
      'No puedo confirmar ni descartar nada. Esto no es una advertencia.'
    ),
    notes,
    reading,
    registry: hit,
  };
}
