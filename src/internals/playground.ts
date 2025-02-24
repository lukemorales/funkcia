import { invoke } from '../functions';
import { Option } from '../option';

const parse = Option.createUse((_name: string, _lastName: string) => {
  const realName = Option.fromFalsy(_name);
  const lastname = Option.fromFalsy(_lastName);

  return invoke(function* () {
    const name = yield* realName;

    return Option.of(`${name} ${yield* lastname}`).map((n) => n.trim());
  });
});

const result = parse('John', 'Doe');

if (result.isSome()) {
  console.log(result.unwrap()); // ?
}

function createFn() {
  return () => Promise.resolve(10);
}

const map = new WeakMap();

const a = createFn();
map.set(a, []);

const b = createFn();
map.set(b, []);
