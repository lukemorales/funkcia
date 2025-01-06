import { type Option } from './option.bak';

export type Task<T> = () => Promise<T>;

export type Lazy<T> = () => T;

export type Nullish<T> = T | null | undefined;

export type StrictOptional<T> = {
  [K in keyof T]-?: Option<NonNullable<T[K]>>;
};

export type Optional<T> = {
  [K in keyof T]-?: undefined extends T[K] ? Option<NonNullable<T[K]>>
  : null extends T[K] ? Option<NonNullable<T[K]>>
  : T[K];
};

export type RemoveOptional<T> = {
  [K in keyof T]: T[K] extends Option<infer U> ? U | null | undefined : T[K];
};
