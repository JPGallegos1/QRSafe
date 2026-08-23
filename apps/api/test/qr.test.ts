import assert from 'node:assert/strict'
import test from 'node:test'

import { analyzePayload, fingerprintPayload } from '../src/qr.js'
import { crc16 } from '@qrsafe/verification'

const STATIC_EMV =
  '00020101021143530016com.mercadolibre0129https://mpago.la/pos/1142682450150011305480831565204970053030325802AR5925COTO CENTRO INTEGRAL DE C6015CAPITAL FEDERAL63043E84'

test('fingerprintPayload calcula SHA-256 sobre el payload exacto', () => {
  assert.equal(
    fingerprintPayload('abc'),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
  )
  assert.notEqual(fingerprintPayload('abc'), fingerprintPayload('abc '))
})

test('analyzePayload acepta un EMV estatico estructuralmente valido', () => {
  const result = analyzePayload(STATIC_EMV)
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.extractedData.isStatic, true)
    assert.equal(result.extractedData.country, 'AR')
    assert.equal(result.extractedData.accounts.length, 1)
  }
})

test('analyzePayload rechaza formatos ajenos y alteraciones estructurales', () => {
  assert.equal(analyzePayload('https://example.com').ok, false)
  const tampered = analyzePayload(STATIC_EMV.replace('COTO', 'KOTO'))
  assert.equal(tampered.ok, false)
  if (!tampered.ok) assert.equal(tampered.code, 'qr_anomalo')
})

test('analyzePayload rechaza un EMV dinamico aunque su estructura sea valida', () => {
  const withoutCrc = STATIC_EMV.replace('010211', '010212').slice(0, -4)
  const dynamic = withoutCrc + crc16(withoutCrc)
  const result = analyzePayload(dynamic)
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.code, 'qr_no_estatico')
})
