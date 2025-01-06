/* eslint-disable no-inner-declarations */
// ts-worksheet-with-variables

import { AsyncOption } from './async-option';
import { TaggedError } from './exceptions';
import { Option } from './option.bak';
import { Result } from './result';

declare const opaque: unique symbol;

type Email = string & {
  readonly [opaque]: 'EMAIL';
};

class InvalidEmailError extends TaggedError {
  readonly _tag = 'InvalidEmail';
}

{
  const validateEmail = Result.predicate(
    (email: string): email is Email => email.includes('@'),
    () => new InvalidEmailError(),
  );

  function extractProvider(email: Email) {
    const [, domain] = email.split('@'); // ?

    return Result.fromNullish(domain)
      .map((d) => d.split('.')[0])
      .filter((value) => value != null);
  }

  const output = Result.try(function* getProvider() {
    const email = yield* validateEmail('johndoe@example.com'); // ?
    const provider = yield* extractProvider(email); // ?

    return Result.ok(provider);
  });

  console.log(output);

  const outputv2 = validateEmail('johndoe@example.com').andThen(
    extractProvider,
  );

  console.log(outputv2);
}

{
  const validateEmail = Option.predicate((email: string): email is Email =>
    email.includes('@'),
  );

  function extractProvider(email: Email) {
    const [, domain] = email.split('@');

    return Option.fromNullish(domain).map((d) => d.split('.')[0]!);
  }

  const output = Option.try(function* getProvider() {
    const email = yield* validateEmail('johndoe@example.com'); // ?
    const provider = yield* extractProvider(email); // ?

    return Option.some(provider);
  });

  console.log(output);

  const outputv2 = validateEmail('johndoe@example.com').andThen(
    extractProvider,
  );

  console.log(outputv2);
}

{
  const validateEmail = Option.predicate((email: string): email is Email =>
    email.includes('@'),
  );

  function extractProvider(email: Email) {
    const [, domain] = email.split('@');

    return AsyncOption.fromNullable(domain).map((d) => d.split('.')[0]!);
  }

  async function getOutput() {
    const output = await AsyncOption.try(async function* getProvider() {
      const email = yield* await AsyncOption.fromOption(
        validateEmail('johndoe@example.com'),
      );
      const provider = yield* await extractProvider(email);

      return AsyncOption.some(provider);
    });

    return output;
  }
}
