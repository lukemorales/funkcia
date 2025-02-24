type AnyAsyncDataType = (...args: any) => Promise<any>;

const map = new WeakMap<any, any[]>();

export const Queue = {
  createEnqueuer<SyncDataType extends {}, Keys extends keyof SyncDataType>() {
    return <DataType extends AnyAsyncDataType, Key extends Keys>(
      task: DataType,
      key: Key,
      ...params: SyncDataType[Key] extends (...args: any) => any
        ? Parameters<SyncDataType[Key]>
        : never
    ) => {
      const clonedTask = (() => task()) as DataType;

      const queue = map.get(task)?.slice() ?? [];
      queue.push([key, params]);

      map.set(clonedTask, queue);

      return clonedTask;
    };
  },

  of<DataType extends AnyAsyncDataType>(task: DataType) {
    const queue = map.get(task) ?? [];

    return {
      execute<SyncDataType extends {}>(dataType: SyncDataType) {
        for (const [method, args] of queue) {
          // eslint-disable-next-line @typescript-eslint/ban-types
          dataType = (dataType[method as never] as Function).apply(
            dataType,
            args,
          );
        }

        return dataType;
      },
    };
  },
};
