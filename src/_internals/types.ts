export type Nullable<T> = T | null | undefined;

export type Mutable<T> = { -readonly [P in keyof T]: T[P] };

export type Falsy = false | '' | 0 | 0n | null | undefined;
