/* eslint-disable import/no-extraneous-dependencies */
import * as matchers from 'jest-extended';
import { expect } from 'vitest';

import { FunkciaStore } from './funkcia-store';
import { OptionAsyncProxy } from './option.async.proxy';
import { None, Some } from './option.proxy';
import { ResultAsyncProxy } from './result.async.proxy';
import { Err, Ok } from './result.proxy';

expect.extend(matchers);

let unregisterSome: () => void;
let unregisterNone: () => void;
let unregisterOk: () => void;
let unregisterErr: () => void;
let unregisterOptionAsync: () => void;
let unregisterResultAsync: () => void;

beforeAll(() => {
  unregisterSome = FunkciaStore.register(Some);
  unregisterNone = FunkciaStore.register(None);
  unregisterOk = FunkciaStore.register(Ok);
  unregisterErr = FunkciaStore.register(Err);
  unregisterOptionAsync = FunkciaStore.register(OptionAsyncProxy);
  unregisterResultAsync = FunkciaStore.register(ResultAsyncProxy);
});

afterAll(() => {
  unregisterSome();
  unregisterNone();
  unregisterOk();
  unregisterErr();
  unregisterOptionAsync();
  unregisterResultAsync();
});
