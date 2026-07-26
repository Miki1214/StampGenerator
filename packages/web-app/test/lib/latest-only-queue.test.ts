import { describe, expect, it } from "vitest";
import { createLatestOnlyQueue } from "../../src/lib/latest-only-queue";

describe("createLatestOnlyQueue", () => {
  it("runs only the latest enqueued job when a newer one arrives while one is in flight", async () => {
    const started: number[] = [];
    const completed: number[] = [];
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const queue = createLatestOnlyQueue(async (id: number) => {
      started.push(id);
      if (id === 1) {
        await firstGate;
      }
      completed.push(id);
      return id;
    });

    const p1 = queue.enqueue(1);
    // Let the first job start before enqueueing superseding work.
    await Promise.resolve();
    expect(started).toEqual([1]);

    const p2 = queue.enqueue(2);
    const p3 = queue.enqueue(3);

    releaseFirst();
    await Promise.allSettled([p1, p2, p3]);

    expect(started).toEqual([1, 3]);
    expect(completed).toEqual([1, 3]);
    await expect(p3).resolves.toBe(3);
  });
});
