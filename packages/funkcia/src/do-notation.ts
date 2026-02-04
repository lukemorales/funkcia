declare const DoNotationSymbol: unique symbol;

type Container = `${'Option' | 'Result'}${'' | 'Async'}`;

export declare namespace DoNotation {
  interface Sign {
    readonly [DoNotationSymbol]: true;
  }

  type is<T> = T extends Sign ? true : false;

  type Unbrand<T> = T extends Sign
    ? {
        [K in keyof T as K extends keyof Sign ? never : K]: T[K];
      } & {}
    : T;

  type Forbidden<
    Class extends string,
    Key extends 'bind' | 'let',
  > = `ERROR: "${Key}" can only be used when "${Class}" is initialized with "${Class}.Do"`;

  interface Signed<$Container extends Container, Context> {
    bindTo: <Key extends string>(key: Key) => any;

    bind: <Key extends string>(
      this: is<Context> extends true ? this : Forbidden<$Container, 'bind'>,
      key: Exclude<Key, keyof Context>,
      cb: (ctx: Unbrand<Context>) => any,
    ) => any;

    let: <Key extends string>(
      this: is<Context> extends true ? this : Forbidden<$Container, 'let'>,
      key: Exclude<Key, keyof Context>,
      cb: (ctx: Unbrand<Context>) => any,
    ) => any;
  }
}

export type DoNotation<T extends {} = object> = Readonly<T> & DoNotation.Sign;
