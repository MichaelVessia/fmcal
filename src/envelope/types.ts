/** Parameter descriptor for a next-action template. */
export interface NextActionParam {
  readonly description: string
  readonly required: boolean
  readonly value?: string | number
  readonly default?: string | number
  readonly enum?: readonly string[]
}

/** HATEOAS-style action the caller can take next. */
export interface NextAction {
  readonly command: string
  readonly description: string
  readonly params?: Record<string, NextActionParam> | undefined
}

/** Successful response envelope. */
export interface SuccessEnvelope<R> {
  readonly ok: true
  readonly command: string
  readonly result: R
  readonly next_actions: readonly NextAction[]
}

/** Error response envelope. */
export interface ErrorEnvelope {
  readonly ok: false
  readonly command: string
  readonly error: { readonly message: string; readonly code: string }
  readonly fix: string
  readonly next_actions: readonly NextAction[]
}

export type Envelope<R> = SuccessEnvelope<R> | ErrorEnvelope
