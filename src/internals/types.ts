export type Falsy = false | '' | 0 | 0n | null | undefined;

export type Task<A> = () => Promise<A>;
