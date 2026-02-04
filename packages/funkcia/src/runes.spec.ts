import { Option } from './option';
import { $array, $map, RunicArray, type RunicMap } from './runes';

describe('RunicMap', () => {
  describe('constructor', () => {
    it('creates an empty RunicMap when no arguments are provided', () => {
      const map = $map();

      expectTypeOf(map).toEqualTypeOf<RunicMap<unknown, unknown>>();

      expect(map.size).toBe(0);
    });

    it('creates a RunicMap from iterable entries', () => {
      const map = $map([
        ['a', 1],
        ['b', 2],
      ]);

      expectTypeOf(map).toEqualTypeOf<RunicMap<string, number>>();

      expect(map.size).toBe(2);
      expect(map.get('a').unwrap()).toBe(1);
      expect(map.get('b').unwrap()).toBe(2);
    });
  });

  describe('get', () => {
    it('returns `Some` when key exists with non-null value', () => {
      const map = $map([
        ['key1', 1],
        ['key2', 2],
      ]);

      const option1 = map.get('key1');
      expectTypeOf(option1).toEqualTypeOf<Option<number>>();

      expect(option1.isSome()).toBeTrue();
      expect(option1.unwrap()).toBe(1);

      const option2 = map.get('key2');
      expectTypeOf(option2).toEqualTypeOf<Option<NonNullable<number>>>();

      expect(option2.isSome()).toBeTrue();
      expect(option2.unwrap()).toBe(2);
    });

    it('returns `None` when key does not exist', () => {
      const map = $map<string, number>([['key1', 1]]);

      const option = map.get('nonexistent');

      expectTypeOf(option).toEqualTypeOf<Option<NonNullable<number>>>();

      expect(option.isNone()).toBeTrue();
    });

    it('returns `None` when key exists but value is null', () => {
      const map = $map<string, string | null>([['key1', null]]);

      const option = map.get('key1');

      expectTypeOf(option).toEqualTypeOf<Option<NonNullable<string | null>>>();

      expect(option.isNone()).toBeTrue();
    });

    it('returns `None` when key exists but value is undefined', () => {
      const map = $map<string, string | undefined>([['key1', undefined]]);

      const option = map.get('key1');

      expectTypeOf(option).toEqualTypeOf<
        Option<NonNullable<string | undefined>>
      >();

      expect(option.isNone()).toBeTrue();
    });
  });
});

describe('RunicArray', () => {
  describe('constructor', () => {
    it('creates a RunicArray from iterable', () => {
      const array = $array([1, 2, 3]);

      expectTypeOf(array).toEqualTypeOf<RunicArray<number>>();

      expect(array.length).toBe(3);
      expect(array[0]).toBe(1);
      expect(array[1]).toBe(2);
      expect(array[2]).toBe(3);
    });

    it('creates a RunicArray from array-like object', () => {
      const array = $array({ 0: 'a', 1: 'b', length: 2 });

      expectTypeOf(array).toEqualTypeOf<RunicArray<string>>();

      expect(array.length).toBe(2);
      expect(array[0]).toBe('a');
      expect(array[1]).toBe('b');
    });

    it('creates a RunicArray with mapFn', () => {
      const array = $array([1, 2, 3], (value) => value * 2);

      expectTypeOf(array).toEqualTypeOf<RunicArray<number>>();

      expect(array.length).toBe(3);
      expect(array[0]).toBe(2);
      expect(array[1]).toBe(4);
      expect(array[2]).toBe(6);
    });
  });

  describe('at', () => {
    it('returns `Some` for valid positive index', () => {
      const array = $array([10, 20, 30]);

      const option = array.at(1);

      expectTypeOf(option).toEqualTypeOf<Option<NonNullable<number>>>();

      expect(option.isSome()).toBeTrue();
      expect(option.unwrap()).toBe(20);
    });

    it('returns `Some` for valid negative index', () => {
      const array = $array([10, 20, 30]);

      const option = array.at(-1);

      expectTypeOf(option).toEqualTypeOf<Option<NonNullable<number>>>();

      expect(option.isSome()).toBeTrue();
      expect(option.unwrap()).toBe(30);
    });

    it('returns `None` for out-of-bounds positive index', () => {
      const array = $array([10, 20, 30]);

      const option = array.at(10);

      expectTypeOf(option).toEqualTypeOf<Option<NonNullable<number>>>();

      expect(option.isNone()).toBeTrue();
    });

    it('returns `None` for out-of-bounds negative index', () => {
      const array = $array([10, 20, 30]);

      const option = array.at(-10);

      expectTypeOf(option).toEqualTypeOf<Option<NonNullable<number>>>();

      expect(option.isNone()).toBeTrue();
    });
  });

  describe('find', () => {
    it('returns `Some` when element is found', () => {
      const array = $array([1, 2, 3, 4, 5]);

      const option = array.find((value) => value > 3);

      expectTypeOf(option).toEqualTypeOf<Option<NonNullable<number>>>();

      expect(option.isSome()).toBeTrue();
      expect(option.unwrap()).toBe(4);
    });

    it('returns `None` when element is not found', () => {
      const array = $array([1, 2, 3, 4, 5]);

      const option = array.find((value) => value > 10);

      expectTypeOf(option).toEqualTypeOf<Option<NonNullable<number>>>();

      expect(option.isNone()).toBeTrue();
    });

    it('works with type guard predicate', () => {
      interface Circle {
        kind: 'circle';
        radius: number;
      }

      interface Square {
        kind: 'square';
        side: number;
      }

      type Shape = Circle | Square;

      const array = $array<Shape>([
        { kind: 'circle', radius: 5 },
        { kind: 'square', side: 4 },
        { kind: 'circle', radius: 3 },
      ]);

      const option = array.find(
        (shape): shape is Circle => shape.kind === 'circle',
      );

      expectTypeOf(option).toEqualTypeOf<Option<NonNullable<Circle>>>();

      expect(option.isSome()).toBeTrue();
      expect(option.unwrap().kind).toBe('circle');
      expect(option.unwrap().radius).toBe(5);
    });
  });

  describe('findIndex', () => {
    it('returns `Some` with index when found', () => {
      const array = $array([1, 2, 3, 4, 5]);

      const option = array.findIndex((value) => value > 3);

      expectTypeOf(option).toEqualTypeOf<Option<number>>();

      expect(option.isSome()).toBeTrue();
      expect(option.unwrap()).toBe(3);
    });

    it('returns `None` when not found', () => {
      const array = $array([1, 2, 3, 4, 5]);

      const option = array.findIndex((value) => value > 10);

      expectTypeOf(option).toEqualTypeOf<Option<number>>();

      expect(option.isNone()).toBeTrue();
    });
  });

  describe('indexOf', () => {
    it('returns `Some` with index when found', () => {
      const array = $array([10, 20, 30, 20]);

      const option = array.indexOf(20);

      expectTypeOf(option).toEqualTypeOf<Option<number>>();

      expect(option.isSome()).toBeTrue();
      expect(option.unwrap()).toBe(1);
    });

    it('returns `None` when not found', () => {
      const array = $array([10, 20, 30]);

      const option = array.indexOf(40);

      expectTypeOf(option).toEqualTypeOf<Option<number>>();

      expect(option.isNone()).toBeTrue();
    });

    it('works with fromIndex parameter', () => {
      const array = $array([10, 20, 30, 20]);

      const option = array.indexOf(20, 2);

      expectTypeOf(option).toEqualTypeOf<Option<number>>();

      expect(option.isSome()).toBeTrue();
      expect(option.unwrap()).toBe(3);
    });

    it('returns `None` when not found with fromIndex', () => {
      const array = $array([10, 20, 30]);

      const option = array.indexOf(10, 1);

      expectTypeOf(option).toEqualTypeOf<Option<number>>();

      expect(option.isNone()).toBeTrue();
    });
  });

  describe('lastIndexOf', () => {
    it('returns `Some` with last index when found', () => {
      const array = $array([10, 20, 30, 20]);

      const option = array.lastIndexOf(20);

      expectTypeOf(option).toEqualTypeOf<Option<number>>();

      expect(option.isSome()).toBeTrue();
      expect(option.unwrap()).toBe(3);
    });

    it('returns `None` when not found', () => {
      const array = $array([10, 20, 30]);

      const option = array.lastIndexOf(40);

      expectTypeOf(option).toEqualTypeOf<Option<number>>();

      expect(option.isNone()).toBeTrue();
    });

    it('works with fromIndex parameter', () => {
      const array = $array([10, 20, 30, 20]);

      const option = array.lastIndexOf(20, 2);

      expectTypeOf(option).toEqualTypeOf<Option<number>>();

      expect(option.isSome()).toBeTrue();
      expect(option.unwrap()).toBe(1);
    });

    it('returns `None` when not found with fromIndex', () => {
      const array = $array([10, 20, 30]);

      const option = array.lastIndexOf(30, 1);

      expectTypeOf(option).toEqualTypeOf<Option<number>>();

      expect(option.isNone()).toBeTrue();
    });
  });

  describe('pop', () => {
    it('returns `Some` with last element when array is not empty', () => {
      const array = $array([10, 20, 30]);

      const option = array.pop();

      expectTypeOf(option).toEqualTypeOf<Option<NonNullable<number>>>();

      expect(option.isSome()).toBeTrue();
      expect(option.unwrap()).toBe(30);
      expect(array.length).toBe(2);
      expect(array[0]).toBe(10);
      expect(array[1]).toBe(20);
    });

    it('returns `None` when array is empty', () => {
      const array = $array<number>([]);

      const option = array.pop();

      expectTypeOf(option).toEqualTypeOf<Option<NonNullable<number>>>();

      expect(option.isNone()).toBeTrue();
      expect(array.length).toBe(0);
    });
  });

  describe('shift', () => {
    it('returns `Some` with first element when array is not empty', () => {
      const array = $array([10, 20, 30]);

      const option = array.shift();

      expectTypeOf(option).toEqualTypeOf<Option<NonNullable<number>>>();

      expect(option.isSome()).toBeTrue();
      expect(option.unwrap()).toBe(10);
      expect(array.length).toBe(2);
      expect(array[0]).toBe(20);
      expect(array[1]).toBe(30);
    });

    it('returns `None` when array is empty', () => {
      const array = $array<number>([]);

      const option = array.shift();

      expectTypeOf(option).toEqualTypeOf<Option<NonNullable<number>>>();

      expect(option.isNone()).toBeTrue();
      expect(array.length).toBe(0);
    });
  });
});
