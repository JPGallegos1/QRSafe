/**
 * EMVCo Merchant Presented Mode payload parsing.
 *
 * The payload is a flat TLV string: 2-digit tag, 2-digit length, value.
 * Tags 26-51 and 62 hold nested TLV templates.
 *
 * Nothing here decides whether a code is trustworthy. This module only reports
 * what the payload says. Trust is decided in verify.ts against the registry,
 * because a payload cannot vouch for itself.
 */

export interface TLVField {
  tag: string;
  value: string;
}

export interface Template {
  tag: string;
  children: TLVField[];
}

/** A candidate identifier for the collecting account. Registry keys derive from these. */
export interface AccountRef {
  template: string;
  subTag: string;
  scheme: string | null;
  value: string;
}

export interface CRCInfo {
  embedded: string;
  computed: string;
  /**
   * Whether the payload actually ends in the mandatory `63` field of length 4.
   * Without this check a payload that OMITS the CRC TLV and simply appends
   * crc16(prefix) would compare equal to itself and look intact.
   */
  present: boolean;
  /**
   * Named `intact`, never `valid`: a well-formed forged code matches too.
   * CRC-16 detects transmission errors, not forgery. False whenever the
   * structure is malformed, so a broken payload can never read as intact.
   */
  intact: boolean;
}

export interface EMVReading {
  kind: 'emv';
  payload: string;
  fields: TLVField[];
  flat: Record<string, string>;
  templates: Template[];
  accountRefs: AccountRef[];
  declaredName: string | null;
  city: string | null;
  country: string | null;
  currency: string | null;
  isStatic: boolean;
  /** Every byte of the payload was consumed by the TLV walk. */
  wellFormed: boolean;
  crc: CRCInfo;
}

export interface URLReading {
  kind: 'url';
  payload: string;
  url: URL;
  host: string;
  path: string;
  params: Record<string, string>;
}

export type Reading = EMVReading | URLReading;

const NESTED_TAGS: ReadonlySet<string> = new Set<string>([
  '62',
  ...Array.from({ length: 26 }, (_, i) => String(i + 26)),
]);

export const FIELD_NAMES: Readonly<Record<string, string>> = {
  '00': 'Format version',
  '01': 'Initiation method',
  '52': 'Merchant category',
  '53': 'Currency',
  '54': 'Amount',
  '58': 'Country',
  '59': 'Declared name',
  '60': 'City',
  '62': 'Additional data',
  '63': 'CRC',
};

const UTF8 = new TextEncoder();
const FROM_UTF8 = new TextDecoder('utf-8', { fatal: false });

/** Length of a string in UTF-8 bytes, which is the unit EMVCo counts in. */
export function byteLength(input: string): number {
  return UTF8.encode(input).length;
}

/**
 * CRC-16/CCITT-FALSE — the checksum EMVCo mandates for field 63.
 *
 * Computed over UTF-8 BYTES, not JavaScript characters. A merchant named
 * "PANADERÍA" is 9 characters but 10 bytes, and the checksum an issuer
 * publishes is the one over its bytes.
 */
export function crc16(input: string): string {
  const bytes = UTF8.encode(input);
  let crc = 0xffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= (bytes[i] as number) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Splits one level of TLV. Returns what it managed to read; [] if not TLV-shaped.
 *
 * Walks UTF-8 BYTES, because the declared length is a byte count. Walking
 * JavaScript characters instead misaligns the whole payload as soon as any
 * value carries a non-ASCII character — an accent in a merchant name is enough,
 * and in Argentina that is the common case, not the edge case.
 */
export function splitTLV(input: string): TLVField[] {
  const bytes = UTF8.encode(input);
  const fields: TLVField[] = [];
  let i = 0;
  while (i + 4 <= bytes.length) {
    const tag = FROM_UTF8.decode(bytes.subarray(i, i + 2));
    const lengthText = FROM_UTF8.decode(bytes.subarray(i + 2, i + 4));
    if (!/^\d{2}$/.test(tag) || !/^\d{2}$/.test(lengthText)) return fields;
    const length = Number.parseInt(lengthText, 10);
    if (i + 4 + length > bytes.length) return fields;
    fields.push({ tag, value: FROM_UTF8.decode(bytes.subarray(i + 4, i + 4 + length)) });
    i += 4 + length;
  }
  return fields;
}

function looksLikeEMV(payload: string): boolean {
  return /^000201/.test(payload);
}

/** Parses an EMVCo payload. Returns null when the input is not one. */
export function parse(payload: string): EMVReading | null {
  if (!looksLikeEMV(payload)) return null;

  const fields = splitTLV(payload);
  if (fields.length === 0) return null;

  const flat: Record<string, string> = {};
  const accountRefs: AccountRef[] = [];
  const templates: Template[] = [];

  for (const field of fields) {
    flat[field.tag] = field.value;
    if (!NESTED_TAGS.has(field.tag)) continue;

    const children = splitTLV(field.value);
    templates.push({ tag: field.tag, children });
    if (field.tag === '62') continue;

    // Convention across schemes: 00 is the scheme id, the rest identify the
    // merchant or point of sale. Mercado Pago puts an https POS URL in 01.
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

  // The TLV walk must consume the whole payload: anything left over means the
  // string is not a single well-formed EMV payload. Counted in bytes, like the
  // declared lengths themselves.
  const totalBytes = byteLength(payload);
  const consumed = fields.reduce((n, f) => n + 4 + byteLength(f.value), 0);
  const last = fields[fields.length - 1];
  const crcPresent =
    consumed === totalBytes && last !== undefined && last.tag === '63' && byteLength(last.value) === 4;
  const wellFormed = consumed === totalBytes;

  // The last four bytes are the checksum; the rest is what it covers.
  const allBytes = UTF8.encode(payload);
  const embedded = FROM_UTF8.decode(allBytes.subarray(allBytes.length - 4));
  const computed = crc16(FROM_UTF8.decode(allBytes.subarray(0, allBytes.length - 4)));

  return {
    kind: 'emv',
    payload,
    fields,
    flat,
    templates,
    accountRefs,
    declaredName: flat['59'] ?? null,
    city: flat['60'] ?? null,
    country: flat['58'] ?? null,
    currency: flat['53'] ?? null,
    isStatic: flat['01'] === '11',
    wellFormed,
    // Structure first: a payload without its mandatory trailing 63 field can
    // never be reported as intact, no matter what the last four bytes say.
    crc: { embedded, computed, present: crcPresent, intact: crcPresent && embedded === computed },
  };
}

/** Parses a plain URL payload — the exploration flow. */
export function parseURL(payload: string): URLReading | null {
  let url: URL;
  try {
    url = new URL(payload);
  } catch {
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
export function read(payload: string): Reading | null {
  return parse(payload) ?? parseURL(payload);
}
