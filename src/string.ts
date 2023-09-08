import { compose } from './utils';

export const empty = '';

export const isBlank = compose(trim, isEmpty);

export function isEmpty(string: string): boolean {
  return string === empty;
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function length(string: string): number {
  return string.length;
}

export function trim(string: string): string {
  return string.trim();
}

export function trimStart(string: string): string {
  return string.trimStart();
}

export function trimEnd(string: string): string {
  return string.trimEnd();
}

export function toUpperCase(string: string): string {
  return string.toUpperCase();
}

export function toLocaleUpperCase(string: string): string {
  return string.toLocaleUpperCase();
}

export function toLowerCase(string: string): string {
  return string.toLowerCase();
}

export function toLocaleLowerCase(string: string): string {
  return string.toLocaleLowerCase();
}
