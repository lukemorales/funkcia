declare const DoNotationSymbol: unique symbol;

type Container = `${'' | 'Async'}${'Option' | 'Result'}`;

export declare namespace DoNotation {
  type $doNotationSymbol = typeof DoNotationSymbol;

  interface $Brand {
    readonly [DoNotationSymbol]: true;
  }

  export type is<T> = T extends $Brand ? true : false;

  export type Sign<T extends {} = object> = Readonly<T> & $Brand;

  export type Unsign<T> = T extends $Brand
    ? {
        [K in keyof T as K extends keyof $Brand ? never : K]: T[K];
      } & {}
    : T;

  export type Forbid<
    Class extends string,
    Key extends 'bind' | 'let',
  > = `ERROR: "${Key}" can only be used when "${Class}" is initialized with "${Class}.Do"`;

  export interface Signed<$Container extends Container, Context> {
    bindTo: <Key extends string>(key: Key) => any;

    bind: <Key extends string>(
      this: is<Context> extends true ? this : Forbid<$Container, 'bind'>,
      key: Exclude<Key, keyof Context>,
      cb: (ctx: Unsign<Context>) => any,
    ) => any;

    let: <Key extends string>(
      this: is<Context> extends true ? this : Forbid<$Container, 'let'>,
      key: Exclude<Key, keyof Context>,
      cb: (ctx: Unsign<Context>) => any,
    ) => any;
  }
}
