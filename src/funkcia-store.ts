import type { OptionAsyncProxy } from './option.async.proxy';
import type { None, Some } from './option.proxy';
import type { ResultAsyncProxy } from './result.async.proxy';
import type { Err, Ok } from './result.proxy';

class FunkciaError extends Error {}

type Store = {
  Some?: typeof Some;
  None?: typeof None;
  Ok?: typeof Ok;
  Err?: typeof Err;
  OptionAsync?: typeof OptionAsyncProxy;
  ResultAsync?: typeof ResultAsyncProxy;
};

type Constructors = keyof Store & string;

export class FunkciaStore {
  private static store: Store = {};

  private static assert<T>(
    container: T | undefined,
    name: string,
  ): asserts container {
    if (!container) throw new FunkciaError(`${name} is not registered`);
  }

  static register(constructor: Store[Constructors] & {}): () => void {
    const name = constructor.name.replace('Proxy', '') as Constructors;
    this.store[name] = constructor as never;

    return () => {
      this.store[name] = undefined as never;
    };
  }

  static get Some(): typeof Some {
    this.assert(this.store.Some, 'Some');

    return this.store.Some;
  }

  static get None(): typeof None {
    this.assert(this.store.None, 'None');

    return this.store.None;
  }

  static get Ok(): typeof Ok {
    this.assert(this.store.Ok, 'Ok');

    return this.store.Ok;
  }

  static get Err(): typeof Err {
    this.assert(this.store.Err, 'Err');

    return this.store.Err;
  }

  static get OptionAsync(): typeof OptionAsyncProxy {
    this.assert(this.store.OptionAsync, 'OptionAsync');

    return this.store.OptionAsync;
  }

  static get ResultAsync(): typeof ResultAsyncProxy {
    this.assert(this.store.ResultAsync, 'ResultAsync');

    return this.store.ResultAsync;
  }
}
