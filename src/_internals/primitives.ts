export function isPrimitive(value: unknown): value is Record<'_tag', string> {
  return (
    typeof value === 'object' &&
    value != null &&
    '_tag' in value &&
    typeof value._tag === 'string'
  );
}
