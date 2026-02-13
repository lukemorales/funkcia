import { not } from './predicate';

describe('not', () => {
  it('returns negated predicate result  ', () => {
    const isPositive = (value: number) => value > 0;
    const isNotPositive = not(isPositive);

    expectTypeOf(isNotPositive).toEqualTypeOf<(value: number) => boolean>();

    expect(isNotPositive(5)).toBeFalse();
    expect(isNotPositive(10)).toBeFalse();
  });


});
