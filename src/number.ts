import {
  map as mapOption,
  fromPredicate as optionFromPredicate,
  type Option,
} from './option';

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}

export function add(addend: number): (augend: number) => number {
  return (augend) => augend + addend;
}

export function subtract(subtrahend: number): (minuend: number) => number {
  return (minuend) => minuend - subtrahend;
}

export function multiply(multiplier: number): (multiplicand: number) => number {
  return (multiplicand) => multiplicand * multiplier;
}

export function divide(divisor: number): (dividend: number) => number {
  return (dividend) => dividend / divisor;
}

export function safeDivide(
  divisor: number,
): (dividend: number) => Option<number> {
  return (dividend) =>
    optionFromPredicate(divisor, greaterThan(0)).pipe(
      mapOption((safeDivisor) => dividend / safeDivisor),
    );
}

export function reminder(divisor: number): (dividend: number) => number {
  return (dividend) => dividend % divisor;
}

export const increment: (value: number) => number = add(1);

export const decrement: (value: number) => number = subtract(1);

export const negate: (value: number) => number = multiply(-1);

export function lessThan(target: number): (self: number) => boolean {
  return (self) => self < target;
}

export function lessThanOrEqualTo(target: number): (self: number) => boolean {
  return (self) => self <= target;
}

export function equalTo(target: number): (self: number) => boolean {
  return (self) => self === target;
}

export function greaterThanOrEqualTo(
  target: number,
): (self: number) => boolean {
  return (self) => self >= target;
}

export function greaterThan(target: number): (self: number) => boolean {
  return (self) => self > target;
}
