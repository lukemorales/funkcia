import { compose } from './functions';
import { greaterThanOrEqualTo } from './number';
import {
  fromNullable as optionFromNullable,
  fromPredicate as optionFromPredicate,
  type Option,
} from './option';
import { not } from './predicate';

export const empty = '' as const;

export const isBlank = compose(trim, isEmpty);

export const isNonBlank = not(isBlank);

export function isEmpty(self: string): boolean {
  return self === empty;
}

export const isNonEmpty = not(isEmpty);

export function isString(self: unknown): self is string {
  return typeof self === 'string';
}

export function length(self: string): number {
  return self.length;
}

export function trim(self: string): string {
  return self.trim();
}

export function trimStart(self: string): string {
  return self.trimStart();
}

export function trimEnd(self: string): string {
  return self.trimEnd();
}

export function toUpperCase(self: string): string {
  return self.toUpperCase();
}

export function toLocaleUpperCase(self: string): string {
  return self.toLocaleUpperCase();
}

export function toLowerCase(self: string): string {
  return self.toLowerCase();
}

export function toLocaleLowerCase(self: string): string {
  return self.toLocaleLowerCase();
}

export function split(
  separator: string | RegExp,
  limit?: number | undefined,
): (self: string) => [string, ...string[]] {
  return (self) => {
    const out = self.split(separator, limit);

    return (out.length ? out : [self]) as any;
  };
}

export function replace(
  searchValue: string | RegExp,
  replaceValue: string,
): (self: string) => string {
  return (self) => self.replace(searchValue, replaceValue);
}

export function slice(start?: number, end?: number): (self: string) => string {
  return (self) => self.slice(start, end);
}

export function substring(
  start: number,
  end?: number,
): (self: string) => string {
  return (self) => self.substring(start, end);
}

export function includes(
  searchString: string,
  position?: number,
): (self: string) => boolean {
  return (self) => self.includes(searchString, position);
}

export function startsWith(
  searchString: string,
  position?: number,
): (self: string) => boolean {
  return (self) => self.startsWith(searchString, position);
}

export function endsWith(
  searchString: string,
  position?: number,
): (self: string) => boolean {
  return (self) => self.endsWith(searchString, position);
}

export function padStart(
  maxLength: number,
  fillString?: string,
): (self: string) => string {
  return (self) => self.padStart(maxLength, fillString);
}

export function padEnd(
  maxLength: number,
  fillString?: string,
): (self: string) => string {
  return (self) => self.padEnd(maxLength, fillString);
}

export function repeat(count: number): (self: string) => string {
  return (self) => self.repeat(count);
}

export function normalize(
  form?: 'NFC' | 'NFD' | 'NFKC' | 'NFKD',
): (self: string) => string {
  return (self) => self.normalize(form);
}

export function charAt(index: number): (self: string) => Option<string> {
  return (self) => optionFromPredicate(self.charAt(index), isNonEmpty);
}

export function indexOf(
  searchString: string,
): (self: string) => Option<number> {
  return (self) =>
    optionFromPredicate(self.indexOf(searchString), greaterThanOrEqualTo(0));
}

export function lastIndexOf(
  searchString: string,
): (self: string) => Option<number> {
  return (self) =>
    optionFromPredicate(
      self.lastIndexOf(searchString),
      greaterThanOrEqualTo(0),
    );
}

export function match(
  regexp: RegExp | string,
): (self: string) => Option<RegExpMatchArray> {
  return (self) => optionFromNullable(self.match(regexp));
}
