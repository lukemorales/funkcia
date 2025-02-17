import type { Option } from './option';
import type { AsyncOption } from './option.async';
import type { Result } from './result';
import type { AsyncResult } from './result.async';

class FunkciaError extends Error {}

type Store = {
  Result?: typeof Result;
  Option?: typeof Option;
  AsyncOption?: typeof AsyncOption;
  AsyncResult?: typeof AsyncResult;
};

type Container = keyof Store;

export class FunkciaStore {
  private static store: Store = {};

  private static assert<T>(
    container: T | undefined,
    name: string,
  ): asserts container {
    if (!container) throw new FunkciaError(`${name} is not registered`);
  }

  static register(container: Store[Container] & {}): () => void {
    const name = container.name as Container;
    this.store[name] = container as never;

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
