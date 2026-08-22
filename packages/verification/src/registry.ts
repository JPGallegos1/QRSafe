/**
 * Registry of identity binding, organised in coverage domains.
 *
 * The point of a domain is not to group merchants. It is to record whether the
 * registry is COMPLETE for that universe, because that is what decides how
 * strongly the bot may speak.
 *
 *   closed: true   every legitimate issuer of this domain is enrolled, so an
 *                  absent identifier means "not authorised by the issuer" —
 *                  real information.
 *   closed: false  the registry is partial, so an absent identifier means
 *                  "unknown", and the bot must say exactly that.
 *
 * Setting `closed` without actually enumerating the domain turns every unknown
 * merchant into an accusation. That is the failure mode this design exists to
 * prevent, and test/run.ts pins it.
 */

import type { AccountRef, Reading } from './emv.js';

export interface DomainMatches {
  schemes: string[];
  hosts: string[];
}

export interface Domain {
  id: string;
  label: string;
  /** Who answers for the codes of this domain. Null when it is the merchant itself. */
  issuer: string | null;
  closed: boolean;
  matches: DomainMatches;
  authorized: Set<string>;
}

export interface Lookup {
  domain: Domain | null;
  keys: string[];
  enrolled: boolean;
  issuer: string | null;
}

export const DOMAINS: Domain[] = [
  {
    id: 'sem-cordoba',
    label: 'Estacionamiento medido de la Municipalidad de Córdoba',
    issuer: 'Municipalidad de Córdoba',
    closed: false, // flips to true once the municipality enumerates its POS ids
    matches: { schemes: ['ar.gob.cordoba.sem'], hosts: [] },
    authorized: new Set<string>([]),
  },
  {
    id: 'mercadopago',
    label: 'Puntos de venta de Mercado Pago',
    issuer: null, // the issuer is the merchant, not Mercado Pago
    closed: false,
    matches: { schemes: ['com.mercadolibre'], hosts: ['mpago.la'] },
    authorized: new Set<string>([]),
  },
];

/**
 * Normalises an account reference into the key the registry is indexed by.
 * Mercado Pago encodes an https POS identifier inside the EMV template; the id
 * is the stable part, the origin is not.
 */
export function keyFor(ref: AccountRef): string {
  const value = String(ref.value ?? '').trim();
  const pos = /^https?:\/\/mpago\.la\/pos\/(\w+)/i.exec(value);
  return pos?.[1] !== undefined ? 'mpago:' + pos[1] : value;
}

function hostOf(value: string): string | null {
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

export function domainOf(reading: Reading | null): Domain | null {
  if (!reading) return null;
  const refs: AccountRef[] = reading.kind === 'emv' ? reading.accountRefs : [];

  for (const domain of DOMAINS) {
    for (const ref of refs) {
      if (ref.scheme !== null && domain.matches.schemes.includes(ref.scheme)) return domain;
      const host = hostOf(ref.value);
      if (host !== null && domain.matches.hosts.includes(host)) return domain;
    }
    if (reading.kind === 'url' && domain.matches.hosts.includes(reading.host)) return domain;
  }
  return null;
}

/**
 * Looks up every account reference of a reading. A null `domain` means the
 * payload fell outside every known universe — the registry cannot speak.
 */
export function lookup(reading: Reading | null): Lookup {
  const domain = domainOf(reading);
  const refs: AccountRef[] =
    reading !== null && reading.kind === 'emv' ? reading.accountRefs : [];
  const keys = refs.map(keyFor).filter((k) => k.length > 0);

  if (!domain) return { domain: null, keys, enrolled: false, issuer: null };

  return {
    domain,
    keys,
    enrolled: keys.some((k) => domain.authorized.has(k)),
    issuer: domain.issuer,
  };
}
