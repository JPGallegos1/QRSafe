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
  /**
   * Who answers for every code of this domain, when a single party does — a
   * municipality, an agency. Null when each enrolled code belongs to a
   * different merchant; then the name comes from the entry itself.
   *
     * INVARIANT: a domain with `issuer: null` must not be `closed`. UNAUTHORIZED
   * has to name whoever failed to authorise the code, and a domain with no
   * single issuer has nobody to name. Pinned by a test.
   */
  issuer: string | null;
  closed: boolean;
  matches: DomainMatches;
  /**
   * Identifier to the name of the business that authorised it. The value is not
     * decoration: it is what the VERIFIED message says out loud, and the whole
   * product is the claim that the code belongs to the business in front of you.
   * Naming the domain instead of the merchant answers a different question.
   */
  authorized: Map<string, string>;
}

export interface Lookup {
  domain: Domain | null;
  /** Only the identifiers of the template that matched the domain. */
  keys: string[];
  enrolled: boolean;
  issuer: string | null;
  /** Other account templates present in the payload. Each is an uncovered route. */
  otherRoutes: string[];
}

export const DOMAINS: Domain[] = [
  {
    id: 'sem-cordoba',
    label: 'Municipality of Córdoba metered parking',
    issuer: 'Municipalidad de Córdoba',
    closed: false, // flips to true once the municipality enumerates its POS ids
    matches: { schemes: ['ar.gob.cordoba.sem'], hosts: [] },
    authorized: new Map<string, string>(),
  },
  {
    id: 'mercadopago',
    label: 'Mercado Pago points of sale',
    issuer: null, // the issuer is the merchant, not Mercado Pago
    closed: false,
    matches: { schemes: ['com.mercadolibre'], hosts: ['mpago.la'] },
    authorized: new Map<string, string>(),
  },
];

/**
 * The demonstration domain — deliberately NOT in DOMAINS.
 *
 * VERIFIED and UNAUTHORIZED depend on the registry, not on the code, so with an
 * empty registry no QR can produce them and the two states that carry the whole
 * product cannot be tried end to end. This domain exists to make them
 * reachable, and it must never be reachable in production.
 *
 * WHY IT CANNOT SHIP ENABLED. Its scheme and its enrolled identifier are in the
 * source, and the source is readable. Anyone can generate a QR that comes back
 * VERIFIED. It does not matter that it cannot vouch for a real merchant: it
 * teaches people to trust a verdict that anybody can manufacture, which is
 * worse than not having the demo at all. A verdict nobody can forge is the only
 * kind worth showing.
 *
 * So it is opt-in, per process, and the caller has to say so out loud.
 */
export const DEMO_DOMAIN: Domain = {
  id: 'demo',
  label: 'QRSafe demonstration codes',
  issuer: 'QRSafe (demostración)',
  closed: true,
  matches: { schemes: ['ar.qrsafe.demo'], hosts: [] },
  authorized: new Map<string, string>([['DEMO-OK-001', 'Kiosco de demostración']]),
};

/** Turns the demonstration domain on for this process. Never call it in production. */
export function enableDemoDomain(): void {
  if (!DOMAINS.some((d) => d.id === DEMO_DOMAIN.id)) DOMAINS.push(DEMO_DOMAIN);
}

export function disableDemoDomain(): void {
  const i = DOMAINS.findIndex((d) => d.id === DEMO_DOMAIN.id);
  if (i >= 0) DOMAINS.splice(i, 1);
}

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

interface Match {
  domain: Domain | null;
  /** The account template that matched, e.g. '26' or '43'. */
  template: string | null;
}

function match(reading: Reading | null): Match {
  if (!reading) return { domain: null, template: null };
  const refs: AccountRef[] = reading.kind === 'emv' ? reading.accountRefs : [];

  for (const domain of DOMAINS) {
    for (const ref of refs) {
      if (ref.scheme !== null && domain.matches.schemes.includes(ref.scheme)) {
        return { domain, template: ref.template };
      }
      const host = hostOf(ref.value);
      if (host !== null && domain.matches.hosts.includes(host)) {
        return { domain, template: ref.template };
      }
    }
    if (reading.kind === 'url' && domain.matches.hosts.includes(reading.host)) {
      return { domain, template: null };
    }
  }
  return { domain: null, template: null };
}

export function domainOf(reading: Reading | null): Domain | null {
  return match(reading).domain;
}

/**
 * Looks up the account references of a reading. A null `domain` means the
 * payload fell outside every known universe — the registry cannot speak.
 *
 * SCOPING RULE, and it is a security property, not tidiness: only the
 * references of the template that matched the domain can authorise the code.
 * An EMV payload may carry several merchant-account templates, and different
 * wallets pick different ones. Letting any enrolled key vouch for the whole QR
 * would let a crafted code keep one enrolled route beside a second, unrelated
  * payment route and still come back VERIFIED — while the money leaves through
 * the other one. `otherRoutes` reports those extra routes so the caller can
 * refuse to verify at all.
 */
export function lookup(reading: Reading | null): Lookup {
  const { domain, template } = match(reading);
  const refs: AccountRef[] =
    reading !== null && reading.kind === 'emv' ? reading.accountRefs : [];

  const scoped = template === null ? refs : refs.filter((r) => r.template === template);
  const keys = scoped.map(keyFor).filter((k) => k.length > 0);

  // Account templates other than the one that matched. Each is a payment route
  // this verdict does not cover.
  const otherRoutes = Array.from(
    new Set(refs.filter((r) => r.template !== template).map((r) => r.template))
  );

  if (!domain) return { domain: null, keys, enrolled: false, issuer: null, otherRoutes };

  // The merchant named on the enrolled entry wins over the domain-wide issuer:
  // on an open marketplace every code belongs to a different business.
  const named = keys.map((k) => domain.authorized.get(k)).find((v) => v !== undefined);

  return {
    domain,
    keys,
    enrolled: named !== undefined,
    issuer: named ?? domain.issuer,
    otherRoutes,
  };
}
