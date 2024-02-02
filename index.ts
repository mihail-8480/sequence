export type SequenceProducer<TResult, TAccept> = (arg: TAccept) => TResult;
export type SerializedSequence<TAccept> = {
  current: string;
  previous:
    | { sequence: true; value: SerializedSequence<unknown> }
    | { sequence: false; value: TAccept };
};

export class Sequence<TResult, TAccept> {
  #current: SequenceProducer<TResult, TAccept>;
  #previous: Sequence<TAccept, unknown> | TAccept;
  private constructor(
    current: SequenceProducer<TResult, TAccept>,
    previous: Sequence<TAccept, unknown> | TAccept
  ) {
    this.#current = current;
    this.#previous = previous;
  }

  public next<TNextResult>(producer: SequenceProducer<TNextResult, TResult>) {
    return new Sequence(producer, this as Sequence<TResult, unknown>);
  }

  public static from<TResult, TAccept>(
    producer: SequenceProducer<TResult, TAccept>,
    previous: Sequence<TAccept, unknown> | TAccept
  ): Sequence<TResult, TAccept> {
    return new Sequence(producer, previous);
  }

  public static readonly root: Sequence<void, unknown> = new Sequence(() => {},
  undefined as unknown);

  public static start<TResult>(producer: SequenceProducer<TResult, unknown>) {
    return new Sequence<TResult, unknown>(producer, undefined);
  }

  public evaluate(): TResult {
    return this.#current(
      this.#previous instanceof Sequence
        ? this.#previous.evaluate()
        : this.#previous
    );
  }

  public serialize(): SerializedSequence<TAccept> {
    return {
      current: this.#current.toString(),
      previous:
        this.#previous instanceof Sequence
          ? { sequence: true, value: this.#previous.serialize() }
          : { sequence: false, value: this.#previous },
    };
  }

  public static parse<T>(
    sequence: SerializedSequence<T>
  ): Sequence<T, unknown> {
    return new Sequence<T, unknown>(
      new Function(`return (${sequence.current})(...arguments)`) as (
        t: unknown
      ) => T,
      sequence.previous.sequence
        ? this.parse(sequence.previous.value)
        : sequence.previous.value
    );
  }
}
