/* eslint-disable @typescript-eslint/ban-types */

/**
 * Immediately invokes a function and returns its return value.
 *
 * This is a syntax sugar for `IIFE`s.
 *
 * @example
 * ```ts
 * import { invoke } from 'funkcia/functions';
 *
 * declare const shape: Shape;
 *
 * const humanReadableShape = invoke(() => {
 *   switch (shape.kind) {
 *     case 'CIRCLE':
 *       return 'Circle';
 *     case 'SQUARE':
 *       return 'Square';
 *     default:
 *       const invalidKind: never = shape.kind;
 *       throw new Error(`Invalid shape: ${invalidKind}`);
 *   }
 * });
 * ```
 */
export function invoke<T extends (...args: any[]) => any>(
  fn: T,
): ReturnType<T> {
  return fn();
}

/**
 * Lazily computes a value by invoking a function.
 *
 * The value only computed only once when the value is first accessed.
 *
 * @example
 * ```ts
 * import { lazyCompute } from 'funkcia/functions';
 *
 * declare function expensiveComputation(target: object[]): string;
 *
 * declare const userLogs: object[];
 *
 * const computation = lazyCompute(() => expensiveComputation(userLogs));
 *
 * const output = computation.value; // value is computed only when accessed
 * const repeatedOutput = computation.value; // value is cached and computed only once
 */
export function lazyCompute<T>(fn: () => T): { value: T } {
  return {
    get value() {
      const value = fn();

      Reflect.defineProperty(this, 'value', {
        value,
        writable: false,
        configurable: false,
      });

      return value;
    },
  };
}

/**
 * A ⁠noop function is an intentionally empty function that does nothing,
 * and returns nothing when called.
 *
 * @example
 * ```ts
 * import { noop } from 'funkcia/functions';
 *
 * noop(); // do nothing
 * ```
 */
export function noop(): void;
export function noop(): undefined;
export function noop(): void {
  // do nothing
}

/**
 * Returns a function that will always return the provided value.
 *
 * @example
 * ```ts
 * import { always } from 'funkcia/functions';
 *
 * const alwaysTen = always(10);
 *
 * const result = alwaysTen();
 * // Output: 10
 * ```
 */
export function always<T>(value: T): () => T {
  return () => value;
}

/**
 * Returns the provided value.
 *
 * @example
 * ```ts
 * import { identity } from 'funkcia/functions';
 *
 * const output = identity(10);
 * // Output: 10
 * ```
 */
export function identity<T>(value: T): T {
  return value;
}

/**
 * Returns `null`.
 */
export const alwaysNull: () => null = always(null);

/**
 * Returns `undefined`.
 */
export const alwaysUndefined: () => undefined = always(undefined);

/**
 * Returns `void`.
 */
export const alwaysVoid: () => void = alwaysUndefined;

/**
 * Returns `never`.
 */
export const ignore: () => never = always(undefined as never);

/**
 * Returns `true`.
 */
export const alwaysTrue: () => true = always(true);

/**
 * Returns `false`.
 */
export const alwaysFalse: () => false = always(false);

/**
 * Returns the provided value coerced to the desired type.
 *
 * @example
 * ```ts
 * import { coerce, Result } from 'funkcia/functions';
 *
 * //       ┌─── Result<any, SyntaxError>
 * //       ▼
 * const result = Result.try(
 *   () => JSON.parse('{ "name": John }'),
 *   error => coerce<SyntaxError>(error) // JSON.parse throws a `SyntaxError`
 * );
 * ```
 */
export function coerce<T>(value: any): T {
  return value;
}

/**
 * Composes two or more functions into a single function.
 *
 * @example
 * ```ts
 * import { compose } from 'funkcia/functions';
 *
 * declare function increment(value: number): number;
 * declare function double(value: number): number;
 * declare function stringify(value: number): string;
 *
 * const compute = compose(increment, double, stringify);
 *
 * const output = compute(9);
 * // Output: "20"
 */
export function compose<A extends readonly unknown[], B>(
  ab: (...a: A) => B,
): (...a: A) => B;
export function compose<A extends readonly unknown[], B, C>(
  ab: (...a: A) => B,
  bc: (b: B) => C,
): (...a: A) => C;
export function compose<A extends readonly unknown[], B, C, D>(
  ab: (...a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
): (...a: A) => D;
export function compose<A extends readonly unknown[], B, C, D, E>(
  ab: (...a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
): (...a: A) => E;
export function compose<A extends readonly unknown[], B, C, D, E, F>(
  ab: (...a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
): (...a: A) => F;
export function compose<A extends readonly unknown[], B, C, D, E, F, G>(
  ab: (...a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
): (...a: A) => G;
export function compose<A extends readonly unknown[], B, C, D, E, F, G, H>(
  ab: (...a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
): (...a: A) => H;
export function compose<A extends readonly unknown[], B, C, D, E, F, G, H, I>(
  ab: (...a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
  hi: (h: H) => I,
): (...a: A) => I;
export function compose<
  A extends readonly unknown[],
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
>(
  ab: (...a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
  hi: (h: H) => I,
  ij: (i: I) => J,
): (...a: A) => J;
export function compose(fn: Function, ...fns: Function[]): unknown {
  return function composed(this: unknown) {
    return fns.reduce(
      (result, f) => f(result),
      // eslint-disable-next-line prefer-rest-params
      fn.apply(this, arguments as never),
    );
  };
}

/**
 * Pipes a value into a series of functions, returning the final result.
 *
 * @example
 * ```ts
 * import { pipe } from 'funkcia/functions';
 *
 * declare function increment(value: number): number;
 * declare function double(value: number): number;
 * declare function stringify(value: number): string;
 *
 * const output = pipe(9, increment, double, stringify);
 * // Output: "20"
 */
export function pipe<A>(a: A): A;
export function pipe<A, B>(a: A, ab: (a: A) => B): B;
export function pipe<A, B, C>(a: A, ab: (a: A) => B, bc: (b: B) => C): C;
export function pipe<A, B, C, D>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
): D;
export function pipe<A, B, C, D, E>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
): E;
export function pipe<A, B, C, D, E, F>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
): F;
export function pipe<A, B, C, D, E, F, G>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
): G;
export function pipe<A, B, C, D, E, F, G, H>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
): H;
export function pipe<A, B, C, D, E, F, G, H, I>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
  hi: (h: H) => I,
): I;
export function pipe<A, B, C, D, E, F, G, H, I, J>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
  hi: (h: H) => I,
  ij: (i: I) => J,
): J;
export function pipe<A, B, C, D, E, F, G, H, I, J, K>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
  hi: (h: H) => I,
  ij: (i: I) => J,
  jk: (j: J) => K,
): K;
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
  hi: (h: H) => I,
  ij: (i: I) => J,
  jk: (j: J) => K,
  kl: (k: K) => L,
): L;
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
  hi: (h: H) => I,
  ij: (i: I) => J,
  jk: (j: J) => K,
  kl: (k: K) => L,
  lm: (l: L) => M,
): M;
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
  hi: (h: H) => I,
  ij: (i: I) => J,
  jk: (j: J) => K,
  kl: (k: K) => L,
  lm: (l: L) => M,
  mn: (m: M) => N,
): N;
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
  hi: (h: H) => I,
  ij: (i: I) => J,
  jk: (j: J) => K,
  kl: (k: K) => L,
  lm: (l: L) => M,
  mn: (m: M) => N,
  no: (n: N) => O,
): O;
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
  hi: (h: H) => I,
  ij: (i: I) => J,
  jk: (j: J) => K,
  kl: (k: K) => L,
  lm: (l: L) => M,
  mn: (m: M) => N,
  no: (n: N) => O,
  op: (o: O) => P,
): P;
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
  hi: (h: H) => I,
  ij: (i: I) => J,
  jk: (j: J) => K,
  kl: (k: K) => L,
  lm: (l: L) => M,
  mn: (m: M) => N,
  no: (n: N) => O,
  op: (o: O) => P,
  pq: (p: P) => Q,
): Q;
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
  hi: (h: H) => I,
  ij: (i: I) => J,
  jk: (j: J) => K,
  kl: (k: K) => L,
  lm: (l: L) => M,
  mn: (m: M) => N,
  no: (n: N) => O,
  op: (o: O) => P,
  pq: (p: P) => Q,
  qr: (q: Q) => R,
): R;
export function pipe<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
  hi: (h: H) => I,
  ij: (i: I) => J,
  jk: (j: J) => K,
  kl: (k: K) => L,
  lm: (l: L) => M,
  mn: (m: M) => N,
  no: (n: N) => O,
  op: (o: O) => P,
  pq: (p: P) => Q,
  qr: (q: Q) => R,
  rs: (r: R) => S,
): S;
export function pipe(value: unknown, ...fns: Function[]): unknown {
  return fns.reduce((result, fn) => fn(result), value);
}
