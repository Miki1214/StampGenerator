/**
 * Serial async queue that keeps only the latest pending args when a job is
 * already running. Superseded enqueues reject with {@link LatestOnlySupersededError}.
 */
export function createLatestOnlyQueue<TArg, TResult>(
  run: (arg: TArg) => Promise<TResult>,
): {
  enqueue(arg: TArg): Promise<TResult>;
} {
  let inFlight = false;
  let pending: {
    arg: TArg;
    resolve: (value: TResult) => void;
    reject: (reason: unknown) => void;
  } | null = null;

  const drain = async () => {
    if (inFlight) {
      return;
    }
    inFlight = true;
    try {
      while (pending) {
        const next = pending;
        pending = null;
        try {
          next.resolve(await run(next.arg));
        } catch (error) {
          next.reject(error);
        }
      }
    } finally {
      inFlight = false;
    }
    if (pending) {
      void drain();
    }
  };

  return {
    enqueue(arg: TArg): Promise<TResult> {
      return new Promise<TResult>((resolve, reject) => {
        if (pending) {
          pending.reject(new LatestOnlySupersededError());
        }
        pending = { arg, resolve, reject };
        void drain();
      });
    },
  };
}

export class LatestOnlySupersededError extends Error {
  constructor() {
    super("LatestOnlyQueue: job superseded");
    this.name = "LatestOnlySupersededError";
  }
}
