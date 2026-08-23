#!/usr/bin/env node
/**
 * CLI: qrsafe-verify <image|payload> [...]
 *
 * Development tool. Takes image paths or a raw payload and prints the verdict
 * the bot would reply with, plus the evidence behind it.
 */

import fs from 'node:fs';
import path from 'node:path';
import { decodeImage } from './decode.js';
import { verify, STATES, type Verdict } from './verify.js';

const LABEL: Record<string, string> = {
  [STATES.VERIFIED]: 'VERIFIED',
  [STATES.UNAUTHORIZED]: 'UNAUTHORIZED',
  [STATES.OUT_OF_COVERAGE]: 'OUT OF COVERAGE',
  [STATES.ANOMALY]: 'ANOMALY',
  [STATES.UNREADABLE]: 'UNREADABLE',
};

function isFile(arg: string): boolean {
  try {
    return fs.statSync(arg).isFile();
  } catch {
    return false;
  }
}

/**
 * Whether the argument was meant as a file. A mistyped path must not be read as
  * a QR payload: it would come back OUT_OF_COVERAGE and exit 0, so a typo
 * would look like a successful run that verified nothing.
 */
function looksLikePath(arg: string): boolean {
  // Only a path prefix or image extension qualifies. A lone slash is not enough:
  // an EMV payload can contain URLs and would otherwise be treated as a path.
  const prefix = /^([.]{1,2}[/\\]|[/\\]|[A-Za-z]:[/\\])/;
  return prefix.test(arg) || /[.](jpe?g|png|bmp|webp|gif)$/i.test(arg);
}

interface Source {
  payload: string | null;
  label: string;
  error: string | null;
}

async function sourceFor(arg: string): Promise<Source> {
  if (!isFile(arg)) return { payload: arg, label: 'text', error: null };
  const res = await decodeImage(arg);
  return {
    payload: res.payload,
    label: res.via !== null ? 'image · ' + res.via + ' · ' + res.dims : 'image · unreadable',
    error: res.error,
  };
}

function print(arg: string, label: string, result: Verdict): void {
  console.log('');
  console.log('── ' + path.basename(arg));
  console.log('   reading  : ' + label);
  console.log('   state    : ' + (LABEL[result.state] ?? result.state));
  console.log('   response : ' + result.message);

  const reading = result.reading;
  if (reading?.kind === 'emv') {
    console.log('   declared name : ' + (reading.declaredName ?? '—'));
    console.log(
      '   CRC : ' +
        reading.crc.embedded +
        (reading.crc.intact ? ' (intact — does not indicate legitimacy)' : ' (does NOT match)')
    );
    const refs = reading.accountRefs.map((r) => r.value);
    if (refs.length > 0) console.log('   identifiers : ' + refs.join(', '));
  }
  if (reading?.kind === 'url') {
    console.log('   final destination : ' + reading.url.href);
  }
  if (result.registry?.domain) {
    const d = result.registry.domain;
    console.log('   domain : ' + d.label + (d.closed ? ' [closed]' : ' [open]'));
  }
  for (const note of result.notes) {
    console.log('   · [' + note.level + '] ' + note.text);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('usage: qrsafe-verify <image|payload> [...]');
    process.exit(2);
  }
  let failed = 0;
  for (const arg of args) {
    if (!isFile(arg) && looksLikePath(arg)) {
      console.error('\n── ' + path.basename(arg));
      console.error('   file does not exist: ' + arg);
      failed++;
      continue;
    }
    const { payload, label, error } = await sourceFor(arg);
    if (error !== null) {
      console.log('\n── ' + path.basename(arg));
      console.log('   could not open: ' + error);
      failed++;
      continue;
    }
    print(arg, label, verify(payload));
  }
  console.log('');
  if (failed > 0) process.exit(1);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
