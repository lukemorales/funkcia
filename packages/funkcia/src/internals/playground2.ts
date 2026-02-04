import { TaggedError } from '../exceptions';
import { Result } from '../result';
import { ResultAsync } from '../result-async';

interface Drizzle {
  query: {
    users: {
      findMany: () => Promise<Array<{ id: string }>>;
      findFirst: () => Promise<{ id: string } | undefined>;
    };
  };
}

const drizzle: Drizzle = {
  query: {
    users: {
      findMany() {
        return Promise.resolve([{ id: 'user_01' }]);
      },
      findFirst() {
        return Promise.resolve({ id: 'user_01' });
      },
    },
  },
};

class DrizzleError extends TaggedError('DRIZZLE_ERROR') {}

const db = ResultAsync.resource(drizzle, (e) => new DrizzleError(e as string));

const result = ResultAsync.use(async function* () {
  const a = yield* db
    .run((client) => client.query.users.findFirst())
    .andThen((user) => Result.fromNullable(user));

  return ResultAsync.ok(a);
});

console.log(await result);
