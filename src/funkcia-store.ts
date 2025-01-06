import type { AsyncOption } from './async-option';
import type { AsyncResult } from './async-result';
import type { Option } from './option';
import type { Result } from './result';

class FunkciaError extends Error {}

type Store = {
  Result?: typeof Result;
  Option?: typeof Option;
  AsyncOption?: typeof AsyncOption;
  AsyncResult?: typeof AsyncResult;
};

type Primitive = keyof Store;

export class FunkciaStore {
  private static store: Store = {};

  private static assert<T>(
    primitive: T | undefined,
    name: string,
  ): asserts primitive {
    if (!primitive) throw new FunkciaError(`${name} is not registered`);
  }

  static register(primitive: Store[Primitive] & {}): () => void {
    const name = primitive.name as Primitive;
    this.store[name] = primitive as never;

    return () => {
      this.store[name] = undefined as never;
    };
  }

  static get Result(): typeof Result {
    this.assert(this.store.Result, 'Result');

    return this.store.Result;
  }

  static get Option(): typeof Option {
    this.assert(this.store.Option, 'Option');

    return this.store.Option;
  }

  static get AsyncOption(): typeof AsyncOption {
    this.assert(this.store.AsyncOption, 'AsyncOption');

    return this.store.AsyncOption;
  }

  static get AsyncResult(): typeof AsyncResult {
    this.assert(this.store.AsyncResult, 'AsyncResult');

    return this.store.AsyncResult;
  }
}
