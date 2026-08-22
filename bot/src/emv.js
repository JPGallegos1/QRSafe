'use strict';

/**
 * EMVCo Merchant Presented Mode payload parsing.
 *
 * The payload is a flat TLV string: 2-digit tag, 2-digit length, value.
 * Tags 26-51 and 62 hold nested TLV templates.
 *
 * Nothing in this module decides whether a code is trustworthy. It only
 * reports what the payload says. Trust is decided in verify.js against the
 * registry, because the payload cannot vouch for itself.
 */

const NESTED_TAGS = new Set(['62']);
for (let t = 26; t <= 51; t++) NESTED_TAGS.add(String(t));

const FIELD_NAMES = {
  '00': 'Versión del formato',
  '01': 'Modo de inicio',
  '52': 'Rubro del comercio',
  '53': 'Moneda',
  '54': 'Importe',
  '58': 'País',
  '59': 'Nombre declarado',
  '60': 'Ciudad',
  '62': 'Datos adicionales',
  '63': 'CRC',
};

/** CRC-16/CCITT-FALSE — the checksum EMVCo mandates for field 63. */
function crc16(input) {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** Splits one level of TLV. Returns [] for anything that is not TLV-shaped. */
function splitTLV(input) {
  const fields = [];
  let i = 0;
  while (i + 4 <= input.length) {
    const tag = input.substr(i, 2);
    const length = parseInt(input.substr(i + 2, 2), 10);
    if (!/^\d{2}$/.test(tag) || Number.isNaN(length)) return fields;
    if (i + 4 + length > input.length) return fields;
    fields.push({ tag, value: input.substr(i + 4, length) });
    i += 4 + length;
  }
  return fields;
}

function looksLikeEMV(payload) {
  return /^000201/.test(payload);
}

/**
 * Parses a payload into a structure the rest of the bot can reason about.
 * `accountRefs` collects every candidate identifier found in the merchant
 * account templates — these are what the registry is keyed on.
 */
function parse(payload) {
  if (!looksLikeEMV(payload)) return null;

  const fields = splitTLV(payload);
  if (!fields.length) return null;

  const flat = {};
  const accountRefs = [];
  const templates = [];

  for (const field of fields) {
    flat[field.tag] = field.value;
    if (!NESTED_TAGS.has(field.tag)) continue;

    const children = splitTLV(field.value);
    templates.push({ tag: field.tag, children });
    if (field.tag === '62') continue;

    // Convention across schemes: 00 is the scheme id, the rest identify the
    // merchant or point of sale. Mercado Pago puts an https URL in 01.
    const scheme = children.find((c) => c.tag === '00');
    for (const child of children) {
      if (child.tag === '00') continue;
      accountRefs.push({
        template: field.tag,
        subTag: child.tag,
        scheme: scheme ? scheme.value : null,
        value: child.value,
      });
    }
  }

  const embeddedCRC = payload.slice(-4);
  const computedCRC = crc16(payload.slice(0, -4));

  return {
    kind: 'emv',
    payload,
    fields,
    flat,
    templates,
    accountRefs,
    declaredName: flat['59'] || null,
    city: flat['60'] || null,
    country: flat['58'] || null,
    currency: flat['53'] || null,
    isStatic: flat['01'] === '11',
    crc: {
      embedded: embeddedCRC,
      computed: computedCRC,
      // Intentionally named `intact`, never `valid`: a forged code that is
      // well formed matches too. See notes in verify.js.
      intact: embeddedCRC === computedCRC,
    },
  };
}

/** Parses a plain URL payload — the exploration flow. */
function parseURL(payload) {
  let url;
  try {
    url = new URL(payload);
  } catch (_) {
    return null;
  }
  if (!/^https?:$/.test(url.protocol)) return null;
  return {
    kind: 'url',
    payload,
    url,
    host: url.hostname,
    path: url.pathname,
    params: Object.fromEntries(url.searchParams.entries()),
  };
}

/** Dispatches on payload shape. Returns null when neither form applies. */
function read(payload) {
  return parse(payload) || parseURL(payload);
}

module.exports = { crc16, splitTLV, parse, parseURL, read, FIELD_NAMES };
