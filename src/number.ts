import * as O from './option';

export function isNumber(value: unknown): value is number {
  return typeof value === 'number';
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

export function divide(
  divisor: number,
): (dividend: number) => O.Option<number> {
  return (dividend) =>
    O.fromPredicate(divisor, greaterThan(0)).pipe(
      O.map((safeDivisor) => dividend / safeDivisor),
    );
}

export function reminder(divisor: number): (dividend: number) => number {
  return (dividend) => dividend % divisor;
}

export const increment = add(1);

export const decrement = subtract(1);

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
