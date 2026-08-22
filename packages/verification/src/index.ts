/**
 * @qrsafe/verification — motor de verificación de QR por pertenencia.
 *
 * Dominio puro: sin servidor, sin canal, sin usuarios. Recibe una imagen o un
 * payload y devuelve un veredicto. La compuerta de identidad y suscripción
 * definida en docs/flujo-b2c.md vive en la app que consume este paquete.
 */

export { decodeImage } from './decode.js';
export type { DecodeResult } from './decode.js';

export { verify, structuralNotes, STATES } from './verify.js';
export type { Verdict, State, Note } from './verify.js';

export { parse, parseURL, read, splitTLV, crc16, FIELD_NAMES } from './emv.js';
export type { Reading, EMVReading, URLReading, TLVField, AccountRef, CRCInfo } from './emv.js';

export { DOMAINS, lookup, keyFor, domainOf } from './registry.js';
export type { Domain, Lookup } from './registry.js';
