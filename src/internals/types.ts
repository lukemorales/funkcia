export type Nullable<T> = T | null | undefined;

export type Falsy = false | '' | 0 | 0n | null | undefined;

export type UnaryFn<Input, Output> = (value: Input) => Output;

export type AnyUnaryFn = UnaryFn<any, any>;

export type Tuple<A, B> = [A, B];

export type Thunk<T> = () => T;

export type Task<T> = () => Promise<T>;

export interface BetterIterable<T, U> {
  [Symbol.iterator](): Iterator<T, U>;
}
export interface BetterAsyncIterable<T, U> {
  [Symbol.asyncIterator](): AsyncIterator<T, U>;
}
