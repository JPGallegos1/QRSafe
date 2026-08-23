/**
 * @qrsafe/verification — QR identity-binding verification engine.
 *
 * Pure domain layer: no server, channel, or users. It accepts an image or
 * payload and returns a verdict. The identity and subscription gate defined in
 * docs/b2c-flow.md lives in the application that consumes this package.
 */

export { decodeImage } from './decode.js';
export type { DecodeResult } from './decode.js';

export { verify, structuralNotes, STATES } from './verify.js';
export type { Verdict, State, Note } from './verify.js';

export { parse, parseURL, read, splitTLV, crc16, FIELD_NAMES } from './emv.js';
export type { Reading, EMVReading, URLReading, TLVField, AccountRef, CRCInfo } from './emv.js';

export { DOMAINS, lookup, keyFor, domainOf, DEMO_DOMAIN, enableDemoDomain, disableDemoDomain } from './registry.js';
export type { Domain, Lookup } from './registry.js';

export { MENSAJES, NOTAS } from './messages.js';

export { warrantsContextCheck, withContext } from './context.js';
export type { ContextAnalyzer, ContextFindings, ContextHints } from './context.js';
