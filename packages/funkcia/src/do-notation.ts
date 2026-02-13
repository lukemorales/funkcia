declare const DoNotationSymbol: unique symbol;

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
}

export type DoNotation<T extends {} = object> = Readonly<T> & DoNotation.Sign;
