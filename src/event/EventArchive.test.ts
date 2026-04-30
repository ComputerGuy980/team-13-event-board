import type { IEventRecord } from "./Event";
import { CreateEventService } from "./EventService";
import { CreateInMemoryEventRepository } from "./InMemoryEventRepository";
 
// ── Seed helpers ──────────────────────────────────────────────────────────────
 
const now = Date.now();
 
function makePublished(id: number, overrides: Partial<IEventRecord> = {}): IEventRecord {
  return {
    id,
    title: `Published Event ${id}`,
    description: "A published event.",
    location: "Online",
    category: "Technology",
    status: "published",
    capacity: 50,
    startDatetime: now - 4 * 3600000,  // started 4 hours ago
    endDatetime: now + 4 * 3600000,    // ends in 4 hours — not expired
    organizerId: "user-1",
    createdAt: now - 86400000,
    updatedAt: now - 86400000,
    ...overrides,
  };
}
 
function makeExpired(id: number, overrides: Partial<IEventRecord> = {}): IEventRecord {
  return makePublished(id, {
    startDatetime: now - 10 * 3600000,
    endDatetime: now - 2 * 3600000,   // ended 2 hours ago
    ...overrides,
  });
}
 
function makePast(id: number, overrides: Partial<IEventRecord> = {}): IEventRecord {
  return makePublished(id, {
    status: "past",
    startDatetime: now - 10 * 3600000,
    endDatetime: now - 2 * 3600000,
    ...overrides,
  });
}
 
function makeService(seed: IEventRecord[]) {
  const repo = CreateInMemoryEventRepository();
  const service = CreateEventService(repo);
  return { repo, service };
}
 
// ── transitionExpiredEvents ───────────────────────────────────────────────────
 
describe("EventService.transitionExpiredEvents", () => {
  it("transitions a published event whose end time has passed to past", async () => {
    const expired = makeExpired(1);
    const { service, repo } = makeService([expired]);
 
    await service.transitionExpiredEvents();
 
    const result = await repo.get_event(1);
    expect(result.ok).toBe(true);
    if (result.ok && result.value) {
      expect(result.value.status).toBe("past");
    }
  });
 
  it("does not transition a published event that has not yet ended", async () => {
    const active = makePublished(1);
    const { service, repo } = makeService([active]);
 
    await service.transitionExpiredEvents();
 
    const result = await repo.get_event(1);
    expect(result.ok).toBe(true);
    if (result.ok && result.value) {
      expect(result.value.status).toBe("published");
    }
  });
 
  it("transitions only expired events when both kinds are present", async () => {
    const active = makePublished(1);
    const expired = makeExpired(2);
    const { service, repo } = makeService([active, expired]);
 
    await service.transitionExpiredEvents();
 
    const activeResult = await repo.get_event(1);
    const expiredResult = await repo.get_event(2);
 
    expect(activeResult.ok && activeResult.value?.status).toBe("published");
    expect(expiredResult.ok && expiredResult.value?.status).toBe("past");
  });
 
  it("does not affect draft events even if their end time has passed", async () => {
    const expiredDraft = makeExpired(1, { status: "draft" });
    const { service, repo } = makeService([expiredDraft]);
 
    await service.transitionExpiredEvents();
 
    const result = await repo.get_event(1);
    expect(result.ok).toBe(true);
    if (result.ok && result.value) {
      expect(result.value.status).toBe("draft");
    }
  });
 
  it("does not affect cancelled events", async () => {
    const cancelled = makeExpired(1, { status: "cancelled" });
    const { service, repo } = makeService([cancelled]);
 
    await service.transitionExpiredEvents();
 
    const result = await repo.get_event(1);
    expect(result.ok).toBe(true);
    if (result.ok && result.value) {
      expect(result.value.status).toBe("cancelled");
    }
  });
 
  it("handles an empty repository without throwing", async () => {
    const { service } = makeService([]);
    await expect(service.transitionExpiredEvents()).resolves.toBeUndefined();
  });
 
  it("transitions multiple expired events in one call", async () => {
    const seed = [makeExpired(1), makeExpired(2), makeExpired(3)];
    const { service, repo } = makeService(seed);
 
    await service.transitionExpiredEvents();
 
    for (const id of [1, 2, 3]) {
      const result = await repo.get_event(id);
      expect(result.ok && result.value?.status).toBe("past");
    }
  });
});
