#!/usr/bin/env node
'use strict';

/**
 * CLI: qrsafe-verify <imagen|payload> [...]
 *
 * Takes image paths or a raw payload string and prints the verdict the bot
 * would reply with, plus the evidence behind it.
 */

const fs = require('fs');
const path = require('path');
const { decodeImage } = require('../src/decode');
const { verify, STATES } = require('../src/verify');

const LABEL = {
  [STATES.VERIFICADO]: 'VERIFICADO',
  [STATES.NO_AUTORIZADO]: 'NO AUTORIZADO',
  [STATES.FUERA_DE_COBERTURA]: 'FUERA DE COBERTURA',
  [STATES.ANOMALIA]: 'ANOMALÍA',
  [STATES.ILEGIBLE]: 'ILEGIBLE',
};

function looksLikePath(arg) {
  return fs.existsSync(arg) && fs.statSync(arg).isFile();
}

async function payloadFor(arg) {
  if (!looksLikePath(arg)) return { payload: arg, source: 'texto' };
  const res = await decodeImage(arg);
  return {
    payload: res.payload,
    source: res.via ? 'imagen · ' + res.via + ' · ' + res.dims : 'imagen · ilegible',
    error: res.error,
  };
}

function print(arg, source, result) {
  console.log('');
  console.log('── ' + path.basename(arg));
  console.log('   lectura : ' + source);
  console.log('   estado  : ' + (LABEL[result.state] || result.state));
  console.log('   respuesta: ' + result.message);

  const reading = result.reading;
  if (reading && reading.kind === 'emv') {
    console.log('   nombre declarado : ' + (reading.declaredName || '—'));
    console.log(
      '   CRC : ' +
        reading.crc.embedded +
        (reading.crc.intact ? ' (íntegro — no indica legitimidad)' : ' (NO coincide)')
    );
    const refs = reading.accountRefs.map((r) => r.value);
    if (refs.length) console.log('   identificadores : ' + refs.join(', '));
  }
  if (reading && reading.kind === 'url') {
    console.log('   destino real : ' + reading.url.href);
  }
  if (result.registry && result.registry.domain) {
    const d = result.registry.domain;
    console.log('   dominio : ' + d.label + (d.closed ? ' [cerrado]' : ' [abierto]'));
  }
  for (const note of result.notes || []) {
    console.log('   · [' + note.level + '] ' + note.text);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length) {
    console.error('uso: qrsafe-verify <imagen|payload> [...]');
    process.exit(2);
  }
  for (const arg of args) {
    const { payload, source, error } = await payloadFor(arg);
    if (error) {
      console.log('\n── ' + path.basename(arg));
      console.log('   no se pudo abrir: ' + error);
      continue;
    }
    print(arg, source, verify(payload));
  }
  console.log('');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
