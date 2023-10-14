import * as A from './array';
import { pipe } from './functions';
import * as O from './option';

describe('Array', () => {
  describe('constructors', () => {
    describe('create', () => {
      it('creates an array with the specified size', () => {
        expect(A.create(0)).toEqual([]);
        expect(A.create(3)).toEqual([0, 1, 2]);
      });

      it('creates an array with the specified size and with the mapped values', () => {
        expect(A.create(2, (index) => index + 1)).toEqual([1, 2]);
        expect(A.create(3, (index) => index.toString())).toEqual([
          '0',
          '1',
          '2',
        ]);
      });
    });

    describe('empty', () => {
      it('creates an empty array with the specified type', () => {
        expect(A.empty()).toEqual([]);

        expectTypeOf(A.empty()).toMatchTypeOf<unknown[]>();
        expectTypeOf(A.empty<number>()).toMatchTypeOf<number[]>();
        expectTypeOf(A.empty<string>()).toMatchTypeOf<string[]>();

        interface Profile {
          age: number;
        }

        expectTypeOf(A.empty<Profile>()).toMatchTypeOf<Profile[]>();
      });
    });

    describe('range', () => {
      it('creates an array filled with numbers in the provided range', () => {
        expect(A.range(0, 5)).toEqual([0, 1, 2, 3, 4, 5]);

        expect(A.range(0, -5)).toEqual([0, -1, -2, -3, -4, -5]);
        expect(A.range(-5, 0)).toEqual([-5, -4, -3, -2, -1, 0]);
      });
    });
  });

  describe('refinements', () => {
    describe('isArray', () => {
      it('asserts whether or not a value is an array', () => {
        expect(A.isArray(0)).toBe(false);
        expect(A.isArray([1, 2, 3])).toBe(true);
      });
    });

    describe('isEmpty', () => {
      it('asserts whether or not an array is empty', () => {
        expect(A.isEmpty([1, 2, 3])).toBe(false);
        expect(A.isEmpty([])).toBe(true);
      });
    });

    describe('isNonEmpty', () => {
      it('asserts whether or not an array is not empty', () => {
        expect(A.isNonEmpty([])).toBe(false);
        expect(A.isNonEmpty([1, 2, 3])).toBe(true);
      });
    });
  });

  describe('getters', () => {
    describe('take', () => {
      describe('data-first', () => {
        it('returns a new array with only the amount to be taken', () => {
          expect(A.take([1, 2, 3], 2)).toEqual([1, 2]);
        });
      });

      describe('data-last', () => {
        it('returns a new array with only the amount to be taken', () => {
          expect(pipe([1, 2, 3], A.take(2))).toEqual([1, 2]);
        });
      });
    });

    describe('takeWhile', () => {
      describe('data-first', () => {
        it('returns a new array with all elements until the first index that does not satisfy the predicate', () => {
          expect(A.takeWhile([1, 2, 3, 2, 1], (number) => number < 3)).toEqual([
            1, 2,
          ]);
        });
      });

      describe('data-last', () => {
        it('returns a new array with all elements until the first index that does not satisfy the predicate', () => {
          expect(
            pipe(
              [1, 2, 3, 2, 1],
              A.takeWhile((number) => number < 3),
            ),
          ).toEqual([1, 2]);
        });
      });
    });

    describe('head', () => {
      it('returns a Some with the first element if the array is not empty', () => {
        expect(A.head([1, 2, 3, 4, 5])).toMatchOption(O.some(1));
      });

      it('returns a None if the array is empty', () => {
        expect(A.head([])).toBeNone();
      });
    });

    describe('last', () => {
      it('returns a Some with the last element if the array is not empty', () => {
        expect(A.last([1, 2, 3, 4, 5])).toMatchOption(O.some(5));
      });

      it('returns a None if the array is empty', () => {
        expect(A.last([])).toBeNone();
      });
    });

    describe('init', () => {
      it('returns a Some with all elements but the last if the array is not empty', () => {
        expect(A.init([1, 2, 3, 4, 5])).toMatchOption(O.some([1, 2, 3, 4]));
      });

      it('returns a None if the array is empty', () => {
        expect(A.init([])).toBeNone();
      });
    });

    describe('tail', () => {
      it('returns a Some with all elements but the first if the array is not empty', () => {
        expect(A.tail([1, 2, 3, 4, 5])).toMatchOption(O.some([2, 3, 4, 5]));
      });

      it('returns a None if the array is empty', () => {
        expect(A.tail([])).toBeNone();
      });
    });

    describe('at', () => {
      it('returns a Some if index is within the array range', () => {
        expect(pipe([1, 2, 3, 4, 5], A.at(0))).toMatchOption(O.some(1));
        expect(pipe([1, 2, 3, 4, 5], A.at(-1))).toMatchOption(O.some(5));
      });

      it('returns a None if index is out of bounds', () => {
        expect(pipe([1, 2, 3, 4, 5], A.at(10))).toBeNone();
      });
    });

    describe('find', () => {
      it('returns a Some if an element that satisfies the predicate is found', () => {
        expect(
          pipe(
            [1, 2, 3, 4, 5],
            A.find((number) => number >= 3),
          ),
        ).toMatchOption(O.some(3));
      });

      it('returns a None if an element that satisfies the predicate is not found', () => {
        expect(
          pipe(
            [1, 2, 3, 4, 5],
            A.find((number) => number > 10),
          ),
        ).toBeNone();
      });
    });

    describe('findIndex', () => {
      it('returns a Some if the index of the element that satisfies the predicate is greater than or equal to zero', () => {
        expect(
          pipe(
            [1, 2, 3, 4, 5],
            A.findIndex((number) => number >= 3),
          ),
        ).toMatchOption(O.some(2));
      });

      it('returns a None if the index for an element that satisfies the predicate is not found', () => {
        expect(
          pipe(
            [1, 2, 3, 4, 5],
            A.findIndex((number) => number > 10),
          ),
        ).toBeNone();
      });
    });

    describe('length', () => {
      it('returns the length of the array', () => {
        expect(A.length([1, 2, 3, 4, 5])).toBe(5);
      });
    });
  });

  describe('transforming', () => {
    describe('map', () => {
      it('returns a new array with the results of the applied callback', () => {
        expect(
          pipe(
            [0, 1, 2, 3, 4],
            A.map((item) => item + 1),
          ),
        ).toEqual([1, 2, 3, 4, 5]);
      });
    });

    describe('flatMap', () => {
      it('returns a new array with the flattened results of the applied callback', () => {
        expect(
          pipe(
            [0, 1, 2, 3, 4],
            A.flatMap((item) => (item % 2 === 0 ? item : [item])),
          ),
        ).toEqual([0, 1, 2, 3, 4]);
      });
    });

    describe('drop', () => {
      describe('data-first', () => {
        it('returns a new array dropping the amount of items informed', () => {
          expect(A.drop([0, 1, 2, 3, 4], 2)).toEqual([2, 3, 4]);
        });
      });

      describe('data-last', () => {
        it('returns a new array dropping the amount of items informed', () => {
          expect(pipe([0, 1, 2, 3, 4], A.drop(2))).toEqual([2, 3, 4]);
        });
      });
    });

    describe('dropWhile', () => {
      describe('data-first', () => {
        it('returns a new array dropping all items until the first value that does not satisfy the predicate', () => {
          expect(A.dropWhile([0, 1, 2, 3, 4], (item) => item < 2)).toEqual([
            2, 3, 4,
          ]);
        });
      });

      describe('data-last', () => {
        it('returns a new array dropping all items until the first value that does not satisfy the predicate', () => {
          expect(
            pipe(
              [0, 1, 2, 3, 4],
              A.dropWhile((item) => item < 2),
            ),
          ).toEqual([2, 3, 4]);
        });
      });
    });

    describe('append', () => {
      describe('data-first', () => {
        it('returns a new array adding the item to the end of the array', () => {
          expect(A.append([0, 1, 2, 3], 4)).toEqual([0, 1, 2, 3, 4]);
        });
      });

      describe('data-last', () => {
        it('returns a new array adding the item to the end of the array', () => {
          expect(pipe([0, 1, 2, 3], A.append(4))).toEqual([0, 1, 2, 3, 4]);
        });
      });
    });

    describe('prepend', () => {
      describe('data-first', () => {
        it('returns a new array adding the item to the start of the array', () => {
          expect(A.prepend([1, 2, 3, 4], 0)).toEqual([0, 1, 2, 3, 4]);
        });
      });

      describe('data-last', () => {
        it('returns a new array adding the item to the start of the array', () => {
          expect(pipe([1, 2, 3, 4], A.prepend(0))).toEqual([0, 1, 2, 3, 4]);
        });
      });
    });

    describe('reduce', () => {
      it('consolidates the array into a single value outputted by the reducer callback', () => {
        expect(
          pipe(
            [0, 1, 2, 3, 4],
            A.reduce(0, (acc, value) => acc + value),
          ),
        ).toBe(10);
      });
    });

    describe('sort', () => {
      it('sorts the array in the correct order', () => {
        expect(pipe([5, 3, 2, 4, 1, 0], A.sort())).toEqual([0, 1, 2, 3, 4, 5]);
      });
    });

    describe('quickSort', () => {
      describe('data-first', () => {
        it('sorts the array in the correct order', () => {
          expect(A.quickSort([5, 3, 2, 4, 1, 0])).toEqual([0, 1, 2, 3, 4, 5]);

          expect(
            A.quickSort(
              [{ age: 37 }, { age: 23 }, { age: 15 }, { age: 10 }],
              (item) => item.age,
            ),
          ).toEqual([{ age: 10 }, { age: 15 }, { age: 23 }, { age: 37 }]);
        });
      });

      describe('data-last', () => {
        it('sorts the array in the correct order', () => {
          expect(pipe([5, 3, 2, 4, 1, 0], A.quickSort())).toEqual([
            0, 1, 2, 3, 4, 5,
          ]);

          expect(
            pipe(
              [{ age: 37 }, { age: 23 }, { age: 15 }, { age: 10 }],
              A.quickSort((item) => item.age),
            ),
          ).toEqual([{ age: 10 }, { age: 15 }, { age: 23 }, { age: 37 }]);
        });
      });
    });

    describe('shuffle', () => {
      it('shuffles the array', () => {
        // TODO: is there a better way to test shuffle algorithms?
        expect(A.shuffle([0, 1, 2, 3, 4])).not.toEqual([0, 1, 2, 3, 4]);
      });
    });

    describe('reverse', () => {
      it('reverses the array', () => {
        expect(A.reverse([0, 1, 2, 3, 4])).toEqual([4, 3, 2, 1, 0]);
      });
    });

    describe('join', () => {
      it('joins the values in the array into a string using the provided separator', () => {
        expect(pipe([0, 1, 2, 3, 4], A.join(' | '))).toBe('0 | 1 | 2 | 3 | 4');
      });
    });
  });

  describe('filtering', () => {
    describe('filter', () => {
      it('returns the elements of the array that satisfy the predicate', () => {
        expect(
          pipe(
            [0, 1, 2, 3, 4],
            A.filter((number) => number >= 3),
          ),
        ).toEqual([3, 4]);
      });
    });

    describe('filterMap', () => {
      it('returns a new array unwrapping the mapped values and filtering out the None options', () => {
        expect(
          pipe(
            [0, 1, 2, 3, 4],
            A.filterMap((number) =>
              number >= 2 ? O.some(number * 2) : O.none(),
            ),
          ),
        ).toEqual([4, 6, 8]);
      });
    });
  });

  describe('asserting', () => {
    describe('every', () => {
      it('returns true when all elements satisfy the predicate', () => {
        expect(
          pipe(
            [1, 2, 3],
            A.every((number) => number > 0),
          ),
        ).toBe(true);
      });

      it('returns false when some of the elements does not satisfy the predicate', () => {
        expect(
          pipe(
            [1, 2, 3],
            A.every((number) => number > 1),
          ),
        ).toBe(false);
      });
    });

    describe('some', () => {
      it('returns true when some of the elements satisfy the predicate', () => {
        expect(
          pipe(
            [1, 2, 3],
            A.some((number) => number > 1),
          ),
        ).toBe(true);
      });

      it('returns false when none of the elements satisfy the predicate', () => {
        expect(
          pipe(
            [1, 2, 3],
            A.some((number) => number > 5),
          ),
        ).toBe(false);
      });
    });

    describe('includes', () => {
      it('returns true when array includes the provided element', () => {
        expect(pipe([1, 2, 3], A.includes(1))).toBe(true);
      });

      it('returns false when the array does not include the provided element', () => {
        expect(pipe([1, 2, 3], A.includes(0))).toBe(false);
      });
    });
  });

  describe('composing', () => {
    describe('concat', () => {
      it('combines two or more arrays', () => {
        expect(pipe([1, 2, 3], A.concat([4, 5, 6], [7, 8, 9]))).toEqual([
          1, 2, 3, 4, 5, 6, 7, 8, 9,
        ]);
      });
    });

    describe('difference', () => {
      describe('data-first', () => {
        it('returns a new array containing the elements that do not appear in both arrays', () => {
          expect(A.difference([], [])).toEqual([]);

          expect(A.difference([1, 2, 3, 4], [])).toEqual([1, 2, 3, 4]);
          expect(A.difference([], [3, 4, 5])).toEqual([3, 4, 5]);

          expect(A.difference([1, 2, 3, 4], [3, 4, 5])).toEqual([1, 2, 5]);
        });
      });

      describe('data-last', () => {
        it('returns a new array containing the elements that do not appear in both arrays', () => {
          expect(pipe([], A.difference([]))).toEqual([]);

          expect(pipe([1, 2, 3, 4], A.difference<number>([]))).toEqual([
            1, 2, 3, 4,
          ]);
          expect(pipe([], A.difference([3, 4, 5]))).toEqual([3, 4, 5]);

          expect(pipe([1, 2, 3, 4], A.difference([3, 4, 5]))).toEqual([
            1, 2, 5,
          ]);
        });
      });
    });

    describe('intersection', () => {
      describe('data-first', () => {
        it('returns a new array containing the elements that are common to both arrays', () => {
          expect(A.intersection([], [])).toEqual([]);

          expect(A.intersection([1, 2, 3, 4], [])).toEqual([]);
          expect(A.intersection([], [3, 4, 5])).toEqual([]);

          expect(A.intersection([1, 2, 3, 4], [3, 4, 5])).toEqual([3, 4]);
        });
      });

      describe('data-last', () => {
        it('returns a new array containing the elements that are common to both arrays', () => {
          expect(pipe([], A.intersection([]))).toEqual([]);

          expect(pipe([1, 2, 3, 4], A.intersection<number>([]))).toEqual([]);
          expect(pipe([], A.intersection([3, 4, 5]))).toEqual([]);

          expect(pipe([1, 2, 3, 4], A.intersection([3, 4, 5]))).toEqual([3, 4]);
        });
      });
    });
  });
});
