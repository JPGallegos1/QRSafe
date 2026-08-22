#!/usr/bin/env node
/**
 * CLI: qrsafe-verify <imagen|payload> [...]
 *
 * Development tool. Takes image paths or a raw payload and prints the verdict
 * the bot would reply with, plus the evidence behind it.
 */

import fs from 'node:fs';
import path from 'node:path';
import { decodeImage } from './decode.js';
import { verify, STATES, type Verdict } from './verify.js';

const LABEL: Record<string, string> = {
  [STATES.VERIFICADO]: 'VERIFICADO',
  [STATES.NO_AUTORIZADO]: 'NO AUTORIZADO',
  [STATES.FUERA_DE_COBERTURA]: 'FUERA DE COBERTURA',
  [STATES.ANOMALIA]: 'ANOMALÍA',
  [STATES.ILEGIBLE]: 'ILEGIBLE',
};

function isFile(arg: string): boolean {
  try {
    return fs.statSync(arg).isFile();
  } catch {
    return false;
  }
}

interface Source {
  payload: string | null;
  label: string;
  error: string | null;
}

async function sourceFor(arg: string): Promise<Source> {
  if (!isFile(arg)) return { payload: arg, label: 'texto', error: null };
  const res = await decodeImage(arg);
  return {
    payload: res.payload,
    label: res.via !== null ? 'imagen · ' + res.via + ' · ' + res.dims : 'imagen · ilegible',
    error: res.error,
  };
}

function print(arg: string, label: string, result: Verdict): void {
  console.log('');
  console.log('── ' + path.basename(arg));
  console.log('   lectura   : ' + label);
  console.log('   estado    : ' + (LABEL[result.state] ?? result.state));
  console.log('   respuesta : ' + result.message);

  const reading = result.reading;
  if (reading?.kind === 'emv') {
    console.log('   nombre declarado : ' + (reading.declaredName ?? '—'));
    console.log(
      '   CRC : ' +
        reading.crc.embedded +
        (reading.crc.intact ? ' (íntegro — no indica legitimidad)' : ' (NO coincide)')
    );
    const refs = reading.accountRefs.map((r) => r.value);
    if (refs.length > 0) console.log('   identificadores : ' + refs.join(', '));
  }
  if (reading?.kind === 'url') {
    console.log('   destino real : ' + reading.url.href);
  }
  if (result.registry?.domain) {
    const d = result.registry.domain;
    console.log('   dominio : ' + d.label + (d.closed ? ' [cerrado]' : ' [abierto]'));
  }
  for (const note of result.notes) {
    console.log('   · [' + note.level + '] ' + note.text);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('uso: qrsafe-verify <imagen|payload> [...]');
    process.exit(2);
  }
  for (const arg of args) {
    const { payload, label, error } = await sourceFor(arg);
    if (error !== null) {
      console.log('\n── ' + path.basename(arg));
      console.log('   no se pudo abrir: ' + error);
      continue;
    }
    print(arg, label, verify(payload));
  }
  console.log('');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
