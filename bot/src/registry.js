'use strict';

/**
 * Registry of identity binding, organised in coverage domains.
 *
 * The point of the domain is not to group merchants. It is to record whether
 * the registry is COMPLETE for that universe, because that is what decides
 * how strongly the bot may speak.
 *
 *   closed: true   every legitimate issuer of this domain is enrolled, so an
 *                  absent identifier means "not authorised by the issuer" —
 *                  real information.
 *   closed: false  the registry is partial, so an absent identifier means
 *                  "unknown" and the bot must say exactly that.
 *
 * Widening `closed` without actually enumerating the domain turns every
 * unknown merchant into an accusation. That is the failure mode the whole
 * design exists to avoid.
 */

const DOMAINS = [
  {
    id: 'sem-cordoba',
    label: 'Estacionamiento medido de la Municipalidad de Córdoba',
    issuer: 'Municipalidad de Córdoba',
    closed: false, // flips to true once the municipality enumerates its POS ids
    // A payload belongs to this domain when any of these match.
    matches: {
      schemes: ['ar.gob.cordoba.sem'],
      hosts: [],
    },
    authorized: new Set([
      // 'SEM-CBA-0412', ...
    ]),
  },
  {
    id: 'mercadopago',
    label: 'Puntos de venta de Mercado Pago',
    issuer: null, // the issuer is the merchant, not Mercado Pago
    closed: false,
    matches: {
      schemes: ['com.mercadolibre'],
      hosts: ['mpago.la'],
    },
    authorized: new Set(),
  },
];

/** Normalises an account reference into the key the registry is indexed by. */
function keyFor(ref) {
  const value = String(ref.value || '').trim();
  // Mercado Pago encodes an https POS identifier inside the EMV template.
  // The id is the stable part; the origin is not.
  const pos = value.match(/^https?:\/\/mpago\.la\/pos\/(\w+)/i);
  if (pos) return 'mpago:' + pos[1];
  return value;
}

function domainOf(reading) {
  if (!reading) return null;
  const refs = reading.accountRefs || [];
  for (const domain of DOMAINS) {
    for (const ref of refs) {
      if (ref.scheme && domain.matches.schemes.includes(ref.scheme)) return domain;
      const host = hostOf(ref.value);
      if (host && domain.matches.hosts.includes(host)) return domain;
    }
    if (reading.host && domain.matches.hosts.includes(reading.host)) return domain;
  }
  return null;
}

function hostOf(value) {
  try {
    return new URL(String(value)).hostname;
  } catch (_) {
    return null;
  }
}

/**
 * Looks up every account reference of a reading.
 * Returns { domain, key, enrolled, issuer } — `domain` null means the payload
 * fell outside every known universe.
 */
function lookup(reading) {
  const domain = domainOf(reading);
  const refs = reading && reading.accountRefs ? reading.accountRefs : [];
  const keys = refs.map(keyFor).filter(Boolean);

  if (!domain) return { domain: null, keys, enrolled: false, issuer: null };

  const enrolled = keys.some((k) => domain.authorized.has(k));
  return { domain, keys, enrolled, issuer: domain.issuer };
}

module.exports = { DOMAINS, lookup, keyFor, domainOf };
