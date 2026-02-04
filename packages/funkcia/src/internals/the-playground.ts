import { Result } from '../result';
import { ResultAsync } from '../result-async';

declare namespace Prisma {
  interface UserCreateArgs {
    id: string;
  }

  interface User {
    id: string;
  }
}

declare type Prisma = {
  user: {
    create: (args: Prisma.UserCreateArgs) => Promise<Prisma.User>;
  };
};

const prisma: Prisma = {
  user: {
    create: async (args: Prisma.UserCreateArgs) => {
      if (args.id === 'user_123') throw new Error('DatabaseFailureError');

      return { id: args.id };
    },
  },
};

export const createUser2 = ResultAsync.createFlow(async function* (
  args: Prisma.UserCreateArgs,
) {
  const user = yield* ResultAsync.try(() => prisma.user.create(args));

  return Result.ok(user);
});
