/**
 * Turns a decoded payload into one of five verdicts.
 *
 * The rules that must not be relaxed — each one is pinned by a test:
 *
 *  - UNAUTHORIZED is only ever emitted inside a CLOSED domain. Outside one, an
 *    unknown identifier means the registry is incomplete, not that the code is
 *    forged.
 *  - OUT_OF_COVERAGE always states, in words, that it is not a warning.
 *    Softening that sentence into a hedged alert destroys the meaning of
 *    UNAUTHORIZED, which is the only reason this product is worth anything.
 *  - An intact CRC is never reported as reassuring. A well-formed fraudulent
 *    code passes it exactly like the legitimate one.
 *  - UNREADABLE says nothing about the code. Failing to read a photo is a fact
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
import { MENSAJES, NOTAS } from './messages.js';

export const STATES = {
  VERIFIED: 'VERIFIED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  OUT_OF_COVERAGE: 'OUT_OF_COVERAGE',
  ANOMALY: 'ANOMALY',
  UNREADABLE: 'UNREADABLE',
} as const;

export type State = (typeof STATES)[keyof typeof STATES];

export interface Note {
  level: 'high' | 'medium';
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
      level: 'high',
      text: NOTAS.estructuraRota(),
    });
  } else if (!reading.crc.present) {
    notes.push({
      level: 'high',
      text: NOTAS.faltaControl(),
    });
  } else if (!reading.crc.intact) {
    notes.push({
      level: 'high',
      text: NOTAS.controlNoCoincide(),
    });
  }

  const name = reading.declaredName;
  if (name === null || /^undefined$/i.test(name)) {
    notes.push({ level: 'medium', text: NOTAS.sinNombre() });
  } else if (CLAIMED_PUBLIC.test(name)) {
    notes.push({
      level: 'medium',
      text: NOTAS.nombreLibre(name),
    });
  }

  if (reading.country !== null && reading.country !== 'AR') {
    notes.push({
      level: 'high',
      text: NOTAS.otroPais(),
    });
  }
  if (reading.currency !== null && reading.currency !== '032') {
    notes.push({
      level: 'high',
      text: NOTAS.otraMoneda(),
    });
  }
  return notes;
}

export function verify(payload: string | null): Verdict {
  if (payload === null || payload.length === 0) {
    return {
      state: STATES.UNREADABLE,
      message: MENSAJES.ilegible(),
      notes: [],
      reading: null,
      registry: null,
    };
  }

  const reading = emv.read(payload);
  if (!reading) {
    return {
      state: STATES.OUT_OF_COVERAGE,
      message: MENSAJES.noReconocido(),
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
      level: 'high',
      text: NOTAS.variasCuentas(hit.otherRoutes.length),
    });
  }

  const blocking = notes.filter((n) => n.level === 'high');

  const first = blocking[0];
  if (first !== undefined) {
    return {
      state: STATES.ANOMALY,
      message: MENSAJES.anomalia(first.text),
      notes,
      reading,
      registry: hit,
    };
  }

  if (hit.domain !== null && hit.enrolled) {
    return {
      state: STATES.VERIFIED,
      message: MENSAJES.verificado(hit.issuer ?? hit.domain.label),
      notes,
      reading,
      registry: hit,
    };
  }

  if (hit.domain !== null && hit.domain.closed) {
    return {
      state: STATES.UNAUTHORIZED,
      message: MENSAJES.noAutorizado(hit.issuer ?? hit.domain.label),
      notes,
      reading,
      registry: hit,
    };
  }

  // Domain unknown, or known but still open: the registry cannot speak.
  return {
    state: STATES.OUT_OF_COVERAGE,
    message: MENSAJES.fueraDeCobertura(),
    notes,
    reading,
    registry: hit,
  };
}
