export type EqualityFn<Value> = (a: Value, b: Value) => boolean;

export function isEqual<Value>(a: Value, b: Value): boolean {
  return a === b;
}
