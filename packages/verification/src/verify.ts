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

/** Observations that hold with an empty registry. */
export function structuralNotes(reading: Reading): Note[] {
  const notes: Note[] = [];
  if (reading.kind !== 'emv') return notes;

  if (!reading.wellFormed) {
    notes.push({
      level: 'alto',
      text: 'La estructura del código no cierra: sobran caracteres después del último campo válido.',
    });
  } else if (!reading.crc.present) {
    notes.push({
      level: 'alto',
      text: 'Al código le falta el campo de control obligatorio (63). Sin él no hay nada que verificar.',
    });
  } else if (!reading.crc.intact) {
    notes.push({
      level: 'alto',
      text:
        'El código de control no coincide (' +
        reading.crc.embedded +
        ' declarado, ' +
        reading.crc.computed +
        ' calculado). El contenido está alterado o mal leído.',
    });
  }

  const name = reading.declaredName;
  if (name === null || /^undefined$/i.test(name)) {
    notes.push({ level: 'medio', text: 'El código no declara un nombre de comercio.' });
  } else if (CLAIMED_PUBLIC.test(name)) {
    notes.push({
      level: 'medio',
      text:
        'El código dice cobrar a nombre de «' +
        name +
        '». Ese texto es libre y cualquiera puede escribirlo: no prueba quién recibe el dinero.',
    });
  }

  if (reading.country !== null && reading.country !== 'AR') {
    notes.push({
      level: 'alto',
      text: 'El código declara el país ' + reading.country + ', no Argentina.',
    });
  }
  if (reading.currency !== null && reading.currency !== '032') {
    notes.push({
      level: 'alto',
      text: 'El código declara una moneda distinta del peso argentino.',
    });
  }
  return notes;
}

export function verify(payload: string | null): Verdict {
  if (payload === null || payload.length === 0) {
    return {
      state: STATES.ILEGIBLE,
      message: 'No pude leer un código en la imagen. Probá con más luz, de frente y más cerca.',
      notes: [],
      reading: null,
      registry: null,
    };
  }

  const reading = emv.read(payload);
  if (!reading) {
    return {
      state: STATES.FUERA_DE_COBERTURA,
      message:
        'Leí el código pero no tiene formato de pago ni de enlace conocido, así que no puedo analizarlo. Esto no es una advertencia.',
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
        'el código declara más de una vía de cobro (' +
        [hit.domain !== null ? 'la analizada' : 'sin identificar']
          .concat(hit.otherRoutes.map((t) => 'campo ' + t))
          .join(', ') +
        '). No se puede afirmar por cuál de ellas se cobraría.',
    });
  }

  const blocking = notes.filter((n) => n.level === 'alto');

  const first = blocking[0];
  if (first !== undefined) {
    return {
      state: STATES.ANOMALIA,
      message: 'Este código tiene algo raro: ' + first.text,
      notes,
      reading,
      registry: hit,
    };
  }

  if (hit.domain !== null && hit.enrolled) {
    return {
      state: STATES.VERIFICADO,
      message: 'QR verificado. Este código está autorizado por ' + (hit.issuer ?? hit.domain.label) + '.',
      notes,
      reading,
      registry: hit,
    };
  }

  if (hit.domain !== null && hit.domain.closed) {
    return {
      state: STATES.NO_AUTORIZADO,
      message:
        'Advertencia. Este QR no está registrado como un medio de cobro autorizado por ' +
        (hit.issuer ?? hit.domain.label) +
        '.',
      notes,
      reading,
      registry: hit,
    };
  }

  // Domain unknown, or known but still open: the registry cannot speak.
  return {
    state: STATES.FUERA_DE_COBERTURA,
    message:
      'Todavía no tengo registro de este comercio, así que no puedo confirmar ni descartar nada. Esto no es una advertencia.',
    notes,
    reading,
    registry: hit,
  };
}
