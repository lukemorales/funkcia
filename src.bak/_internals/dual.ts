export function dual<T extends (...args: any[]) => any>(
  params: Parameters<T>['length'],
  definition: T,
) {
  return function impl(...args: any[]) {
    if (args.length === params) {
      return definition(...args);
    }

    return (param: any) => definition(param, ...args);
  };
}
