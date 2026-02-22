import { Console, Effect } from "effect"
import type { ErrorEnvelope, NextAction, SuccessEnvelope } from "./types.ts"

export { truncateList } from "./truncate.ts"
export type { Envelope, ErrorEnvelope, NextAction, NextActionParam, SuccessEnvelope } from "./types.ts"

/** Build a success envelope. */
export const success = <R>(
  command: string,
  result: R,
  nextActions: readonly NextAction[] = [],
): SuccessEnvelope<R> => ({
  ok: true,
  command,
  result,
  next_actions: nextActions,
})

/** Build an error envelope. */
export const error = (
  command: string,
  message: string,
  code: string,
  fix: string,
  nextActions: readonly NextAction[] = [],
): ErrorEnvelope => ({
  ok: false,
  command,
  error: { message, code },
  fix,
  next_actions: nextActions,
})

/** Serialize an envelope to compact JSON on stdout. */
export const output = (envelope: SuccessEnvelope<unknown> | ErrorEnvelope): Effect.Effect<void> =>
  Console.log(JSON.stringify(envelope))
