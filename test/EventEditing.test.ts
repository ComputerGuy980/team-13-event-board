import { CreateEventService } from "../src/event/EventService";
import { CreateInMemoryEventRepository } from "../src/event/InMemoryEventRepository";

describe("Event Editing Service", () => {
  let repo: any;
  let service: any;

  const owner = { userId: "1", role: "user" } as any;
  const otherUser = { userId: "2", role: "user" } as any;

  beforeEach(() => {
    repo = CreateInMemoryEventRepository();
    service = CreateEventService(repo);
  });

  it("edits event successfully", async () => {
    const created = await repo.create_event({
      id: 0,
      title: "Test",
      description: "Test",
      location: "Test",
      category: "Test",
      status: "draft",
      capacity: 10,
      startDatetime: Date.now() + 10000,
      endDatetime: Date.now() + 20000,
      organizerId: "1",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const result = await service.editEvent(
      created.value.id,
      { ...created.value, title: "Updated" },
      owner
    );

    expect(result.ok).toBe(true);
  });

  it("fails if event not found", async () => {
    const result = await service.editEvent(999, {} as any, owner);

    expect(result.ok).toBe(false);
    expect(result.error.name).toBe("EventNotFound");
  });

  it("fails if unauthorized", async () => {
    const created = await repo.create_event({
      id: 0,
      title: "Test",
      description: "Test",
      location: "Test",
      category: "Test",
      status: "draft",
      capacity: 10,
      startDatetime: Date.now() + 10000,
      endDatetime: Date.now() + 20000,
      organizerId: "1",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const result = await service.editEvent(
      created.value.id,
      created.value,
      otherUser
    );

    expect(result.ok).toBe(false);
    expect(result.error.name).toBe("Unauthorized");
  });

  it("fails if invalid input", async () => {
    const created = await repo.create_event({
      id: 0,
      title: "Test",
      description: "Test",
      location: "Test",
      category: "Test",
      status: "draft",
      capacity: 10,
      startDatetime: Date.now() + 10000,
      endDatetime: Date.now() + 20000,
      organizerId: "1",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const result = await service.editEvent(
      created.value.id,
      { ...created.value, title: "" },
      owner
    );

    expect(result.ok).toBe(false);
    expect(result.error.name).toBe("InvalidInput");
  });
});