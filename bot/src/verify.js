'use strict';

const emv = require('./emv');
const registry = require('./registry');

/**
 * Turns a decoded payload into one of four verdicts.
 *
 * The rules that must not be relaxed:
 *
 *  - NO_AUTORIZADO is only ever emitted inside a CLOSED domain. Outside one,
 *    an unknown identifier means the registry is incomplete, not that the code
 *    is forged.
 *  - FUERA_DE_COBERTURA always states, in words, that it is not a warning.
 *    Softening that sentence into a hedged alert destroys the meaning of
 *    NO_AUTORIZADO, which is the only reason the product is worth anything.
 *  - An intact CRC is never reported as reassuring. CRC-16 detects
 *    transmission errors, not forgery: a well-formed fraudulent code passes it
 *    exactly like the legitimate one.
 */

const STATES = {
  VERIFICADO: 'VERIFICADO',
  NO_AUTORIZADO: 'NO_AUTORIZADO',
  FUERA_DE_COBERTURA: 'FUERA_DE_COBERTURA',
  ANOMALIA: 'ANOMALIA',
  ILEGIBLE: 'ILEGIBLE',
};

/** Public-sector or well-known names that should not appear on a private account. */
const CLAIMED_PUBLIC = /\b(municipalidad|muni|gobierno|senasa|afip|arca|rentas|banco)\b/i;

/** Observations that hold with an empty registry. */
function structuralNotes(reading) {
  const notes = [];
  if (reading.kind !== 'emv') return notes;

  if (!reading.crc.intact) {
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
  if (!name || /^undefined$/i.test(name)) {
    notes.push({
      level: 'medio',
      text: 'El código no declara un nombre de comercio.',
    });
  } else if (CLAIMED_PUBLIC.test(name)) {
    notes.push({
      level: 'medio',
      text:
        'El código dice cobrar a nombre de «' +
        name +
        '». Ese texto es libre y cualquiera puede escribirlo: no prueba quién recibe el dinero.',
    });
  }

  if (reading.country && reading.country !== 'AR') {
    notes.push({
      level: 'alto',
      text: 'El código declara el país ' + reading.country + ', no Argentina.',
    });
  }
  if (reading.currency && reading.currency !== '032') {
    notes.push({
      level: 'alto',
      text: 'El código declara una moneda distinta del peso argentino.',
    });
  }
  return notes;
}

function verify(payload) {
  if (!payload) {
    return {
      state: STATES.ILEGIBLE,
      message: 'No pude leer un código en la imagen. Probá con más luz, de frente y más cerca.',
      notes: [],
    };
  }

  const reading = emv.read(payload);
  if (!reading) {
    return {
      state: STATES.FUERA_DE_COBERTURA,
      message:
        'Leí el código pero no tiene formato de pago ni de enlace conocido, así que no puedo analizarlo. Esto no es una advertencia.',
      notes: [],
      raw: payload,
    };
  }

  const notes = structuralNotes(reading);
  const hit = registry.lookup(reading);
  const blocking = notes.filter((n) => n.level === 'alto');

  if (blocking.length) {
    return {
      state: STATES.ANOMALIA,
      message: 'Este código tiene algo raro: ' + blocking[0].text,
      notes,
      reading,
      registry: hit,
    };
  }

  if (hit.domain && hit.enrolled) {
    const who = hit.issuer || hit.domain.label;
    return {
      state: STATES.VERIFICADO,
      message: 'QR verificado. Este código está autorizado por ' + who + '.',
      notes,
      reading,
      registry: hit,
    };
  }

  if (hit.domain && hit.domain.closed) {
    const who = hit.issuer || hit.domain.label;
    return {
      state: STATES.NO_AUTORIZADO,
      message:
        'Advertencia. Este QR no está registrado como un medio de cobro autorizado por ' + who + '.',
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

module.exports = { verify, STATES, structuralNotes };
