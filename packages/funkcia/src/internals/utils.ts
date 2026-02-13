import { Panic, panic } from '../exceptions';

export function beautify(value: unknown): string | number | boolean {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (value instanceof Error) return value.message;

  return JSON.stringify(value, null, 2);
}

export function catchDefect<Output>(fn: () => Output, message: string): Output {
  try {
    return fn();
  } catch (error) {
    panic(message, error);
  }
}

export function failOnDefect(error: unknown) {
  if (error instanceof Panic) throw error;
}
