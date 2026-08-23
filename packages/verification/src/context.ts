/**
 * Reading the context around the code — the port, not the implementation.
 *
 * THE IDEA. The attacker controls the QR. He does not control the sign it sits
 * on: the municipal artwork, the printing, the storefront, the table. A sticker
 * pasted over a legitimate code *shows* — it has an edge, a shadow, different
 * paper, and it covers part of the design underneath. The photo the person
 * already sent carries all of that, at no extra cost and with no hardware.
 *
 * That matters because it is the one signal that works with an EMPTY REGISTRY,
 * which is the wall this product keeps hitting: with no merchant enrolled, the
 * payload alone can only ever answer "I do not know".
 *
 * WHAT IT MAY AND MAY NOT SAY. Context is probabilistic. It cannot establish
 * belonging — only the registry can, because belonging is a claim someone makes
 * and answers for. So context produces OBSERVATIONS, never a verdict, and it
 * can never turn anything into VERIFIED. It sits beside the two sources that
 * already exist:
 *
 *   payload   what the code says about itself
 *   context   what the photo says about the code
 *   registry  what the issuer says about the code
 *
 * WHY IT RUNS CONDITIONALLY. Looking at every photo costs money per message and
 * forces an opinion on cases that do not need one. It runs only where the
 * payload already gave something to explain — see `warrantsContextCheck`.
 *
 * This module defines the shape of the analyser and when to call it. The
 * analyser itself is I/O and lives in the app, so the engine stays pure.
 */

import type { Verdict, Note } from './verify.js';
import { STATES } from './verify.js';

/** What an analyser returns. Observations only — no state, by design. */
export interface ContextFindings {
  notes: Note[];
  /** For logging and cost accounting; never shown to the person. */
  provider: string;
}

/** The port. An adapter receives the same bytes that were decoded. */
export type ContextAnalyzer = (
  image: Buffer,
  hints: ContextHints
) => Promise<ContextFindings>;

/** What the payload already revealed, so the analyser knows what to look for. */
export interface ContextHints {
  /** Field 59 — free text, and precisely what the photo can corroborate. */
  declaredName: string | null;
  /** Why the check was triggered. */
  reason: string;
}

/**
 * Whether the payload gave enough reason to spend a look at the photo.
 *
 * Pure and cheap on purpose: the decision to spend money is domain logic, and
 * it belongs where it can be tested without a network.
 *
 * The common case — a well-formed code, an empty registry, nothing odd — is
 * exactly the case that must NOT trigger a call. That is most traffic.
 */
export function warrantsContextCheck(verdict: Verdict): string | null {
  // The code contradicts itself. Whatever is wrong may also be visible.
  if (verdict.state === STATES.ANOMALY) return 'anomalía en el contenido';

  // The registry says this is not authorised. The photo may corroborate it, and
  // corroboration is worth paying for on an accusation.
  if (verdict.state === STATES.UNAUTHORIZED) return 'no autorizado por el emisor';

  // The code claims a name it cannot prove, or claims none. This is the case
  // the photo answers best: the sign either backs the name or contradicts it.
  const claim = verdict.notes.find((n) => n.level === 'medium');
  if (claim !== undefined) return 'el nombre declarado no se puede probar';

  return null;
}

/**
 * Merges findings into a verdict.
 *
 * The state never changes. Context can add to what is said, never overturn who
 * says it: an image cannot promote anything to VERIFIED, because verification
 * is somebody taking responsibility, not something looking right.
 */
export function withContext(verdict: Verdict, findings: ContextFindings): Verdict {
  if (findings.notes.length === 0) return verdict;
  return { ...verdict, notes: [...verdict.notes, ...findings.notes] };
}
