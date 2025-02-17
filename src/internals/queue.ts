type QueueItem<Target> = [keyof Target, (...args: any[]) => any, any[]];

type QueueMap<Target> = Map<number, QueueItem<Target>>;

export class Queue<Target> {
  readonly #items: QueueMap<Target>;

  #frontIndex: number;

  #backIndex: number;

  static of<Target>(queue?: Queue<Target>): Queue<Target> {
    return new Queue(queue ? queue.#items : undefined);
  }

  private constructor(queue?: QueueMap<Target>) {
    this.#items = new Map(queue);
    this.#frontIndex = this.#items.size;
    this.#backIndex = 0;
  }

  enqueue(
    method: keyof Target,
    fn: (...args: any[]) => any,
    args?: any[],
  ): this {
    this.#items.set(this.#frontIndex, [method, fn, args ?? []]);
    this.#frontIndex += 1;

    return this;
  }

  dequeue(): QueueItem<Target> | undefined {
    const item = this.#items.get(this.#backIndex);

    this.#items.delete(this.#frontIndex);
    this.#backIndex += 1;

    return item;
  }

  execute(target: Target): Target {
    for (const [method, fn, args] of this.#items.values()) {
      // eslint-disable-next-line @typescript-eslint/ban-types
      target = (target[method] as Function).call(target, fn, ...args);
    }

    return target;
  }

  *[Symbol.iterator](): Iterator<QueueItem<Target>> {
    for (const item of this.#items.values()) {
      yield item;
    }
  }
}
