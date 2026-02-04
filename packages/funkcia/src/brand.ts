import { alwaysTrue, coerce, identity } from './functions';
import { Predicate } from './predicate';
import { Result } from './result';

const BrandSymbol = Symbol.for('@funkcia/brand');

type AnyBrandId = string | symbol;

type AnyBrand = Brand.Sign<any>;

interface Constructor<in out Type extends AnyBrand> {
  (value: Brand.Unbrand<Type>): Type;
  is: (value: Brand.Unbrand<Type>) => value is Brand.Unbrand<Type> & Type;
}

interface Parser<
  in out Type extends AnyBrand,
  in out Error extends globalThis.Error,
> extends Constructor<Type> {
  parse: (value: Brand.Unbrand<Type>) => Type;
  safeParse: (value: Brand.Unbrand<Type>) => Result<Type, Error>;
}

export declare module Brand {
  interface Sign<in out BrandId extends AnyBrandId> {
    readonly [BrandSymbol]: {
      readonly [K in BrandId]: K;
    };
  }

  type Unbrand<Type> = Type extends Brand<infer Pointer, infer BrandId>
    ? Brand<Pointer, BrandId> extends infer Value & Sign<BrandId>
      ? Value
      : never
    : never;
}

export type Brand<T, BrandId extends AnyBrandId> = T & Brand.Sign<BrandId>;

interface BrandTrait {
  of<Type extends AnyBrand>(): Constructor<Type>;

  of<Type extends AnyBrand, Error extends globalThis.Error>(
    predicate: Predicate.Predicate<Brand.Unbrand<Type>>,
    onUnfulfilled: (value: Brand.Unbrand<Type>) => Error,
  ): Parser<Type, Error>;

  unbrand: <T extends AnyBrand>(value: T) => Brand.Unbrand<T>;
}

function of<Type extends AnyBrand>(): Constructor<Type>;
function of<Type extends AnyBrand, Error extends globalThis.Error>(
  predicate: Predicate.Predicate<Brand.Unbrand<Type>>,
  onUnfulfilled: (value: Brand.Unbrand<Type>) => Error,
): Parser<Type, Error>;
function of(
  predicate?: Predicate.Predicate<any>,
  onUnfulfilled?: (value: any) => globalThis.Error,
): any {
  const id = identity.bind(null);

  if (!predicate || !onUnfulfilled) {
    return Object.assign(id, {
      is: alwaysTrue,
    });
  }

  return Object.assign(id, {
    parse: (value: any) => {
      if (!predicate(value)) throw onUnfulfilled(value);
      return value as never;
    },
    safeParse: (value: any) => {
      const is = Result.predicate(predicate, onUnfulfilled);
      return is(value);
    },
    is: predicate,
  });
}

export const Brand: BrandTrait = {
  of,
  unbrand: coerce,
};
