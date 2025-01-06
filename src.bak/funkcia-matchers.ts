import { isNone, isOption, isSome, type Option } from './option.bak';
import { isError, isOk, isResult, type Result } from './result.bak';

export interface FunkciaMatchers<R = unknown, _ = {}> {
  toBeOption: () => R;
  toBeSome: () => R;
  toBeNone: () => R;
  toMatchOption: <A>(option: Option<A>) => R;
  toBeResult: () => R;
  toBeError: () => R;
  toBeOk: () => R;
  toMatchResult: <E, O>(result: Result<E, O>) => R;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R, T> extends FunkciaMatchers<R, T> {}
  }
}

expect.extend({
  toBeOption(received) {
    return {
      pass: isOption(received),
      message: () =>
        `Option ${received} is${this.isNot ? ' not' : ''} an Option`,
    };
  },
  toBeSome(received) {
    return {
      pass: isSome(received),
      message: () => `Option ${received} is${this.isNot ? ' not' : ''} Some`,
    };
  },
  toBeNone(received) {
    return {
      pass: isNone(received),
      message: () => `Option ${received} is${this.isNot ? ' not' : ''} None`,
    };
  },
  toMatchOption(received, expected) {
    return {
      pass: JSON.stringify(received) === JSON.stringify(expected),
      message: () =>
        `Option ${received} is${this.isNot ? ' not equal to' : ''} ${expected}`,
    };
  },
  toBeResult(received) {
    return {
      pass: isResult(received),
      message: () =>
        `Result ${received} is${this.isNot ? ' not' : ''} a Result`,
    };
  },
  toBeOk(received) {
    return {
      pass: isOk(received),
      message: () => `Result ${received} is${this.isNot ? ' not' : ''} an Ok`,
    };
  },
  toBeError(received) {
    return {
      pass: isError(received),
      message: () =>
        `Result ${received} is${this.isNot ? ' not' : ''} an Error`,
    };
  },
  toMatchResult(received, expected) {
    return {
      pass: JSON.stringify(received) === JSON.stringify(expected),
      message: () =>
        `Result ${received} is${this.isNot ? ' not equal to' : ''} ${expected}`,
    };
  },
});
