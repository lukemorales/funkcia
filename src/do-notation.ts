export const FUNKCIA_MODE = {
  NORMAL: Symbol.for('FunkciaMode::Normal'),
  DO_NOTATION: Symbol.for('FunkciaMode::DoNotation'),
} as const;

export declare namespace FunkciaMode {
  export type Normal = typeof FUNKCIA_MODE.NORMAL;
  export type DoNotation = typeof FUNKCIA_MODE.DO_NOTATION;

  export type Mode = DoNotation | Normal;

  export interface Options {
    mode: Mode;
  }
}

export abstract class DoNotation<Context> {
  readonly #mode: FunkciaMode.Mode;

  constructor(mode?: FunkciaMode.Mode) {
    this.#mode = mode ?? FUNKCIA_MODE.NORMAL;
  }

  protected assertDoNotation(property: keyof DoNotation<{}>): asserts this {
    if (this.#mode !== FUNKCIA_MODE.DO_NOTATION)
      throw new TypeError(
        `Cannot call ${property} because Do Notation has not been initialized`,
      );
  }

  protected get mode(): FunkciaMode.Mode {
    return this.#mode;
  }

  abstract bind<Key extends string>(
    key: Exclude<Key, keyof Context>,
    cb: (ctx: Context) => any,
  ): DoNotation<{
    [K in Key | keyof Context]: K extends keyof Context ? Context[K] : any;
  }>;

  abstract let<Key extends string>(
    key: Exclude<Key, keyof Context>,
    cb: (ctx: Context) => any,
  ): DoNotation<{
    [K in Key | keyof Context]: K extends keyof Context ? Context[K] : any;
  }>;
}

// export interface DoNotation<Context> {
//   bind: <Key extends string>(
//     key: Exclude<Key, keyof Context>,
//     cb: (ctx: Context) => any,
//   ) => DoNotation<{
//     [K in Key | keyof Context]: K extends keyof Context ? Context[K] : any;
//   }>;

//   let: <Key extends string>(
//     key: Exclude<Key, keyof Context>,
//     cb: (ctx: Context) => any,
//   ) => DoNotation<{
//     [K in Key | keyof Context]: K extends keyof Context ? Context[K] : any;
//   }>;
// }
