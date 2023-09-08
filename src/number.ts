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

export function divide(divisor: number): (dividend: number) => number {
  return (dividend) => dividend / divisor;
}

export function reminder(divisor: number): (dividend: number) => number {
  return (dividend) => dividend % divisor;
}

export const increment = add(1);

export const decrement = subtract(1);

export const negate: (value: number) => number = multiply(-1);
