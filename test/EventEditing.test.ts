import { IEventRepository } from "../src/event/EventRepository";
import { CreateEventService, IEventService } from "../src/event/EventService";
import { CreateInMemoryEventRepository } from "../src/event/InMemoryEventRepository";
import { IAuthenticatedUserSession } from "../src/session/AppSession";

describe("Event Editing Service", () => {
  let repo: IEventRepository;
  let service: IEventService;

  const owner: IAuthenticatedUserSession = {
    userId: "1",
    role: "user",
    email: "test1@app.test",
    displayName: "test1",
    signedInAt: new Date().toISOString(),
  };
  const otherUser: IAuthenticatedUserSession = {
    userId: "2",
    role: "user",
    email: "test2@app.test",
    displayName: "test2",
    signedInAt: new Date().toISOString(),
  };

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

    expect(created.ok).toBe(true);
    if (created.ok !== true) return;
    expect(created.value).toBeTruthy();
    if (!created.value) return;

    const result = await service.editEvent(
      created.value.id,
      { ...created.value, title: "Updated" },
      owner
    );

    console.warn(result.value);
    console.warn(created.value);

    expect(result.ok).toBe(true);
  });

  it("fails if event not found", async () => {
    const result = await service.editEvent(999, {} as any, owner);

    expect(result.ok).toBe(false);
    if (result.ok === true) return;
    expect(result.value.name).toBe("EventNotFound");
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

    expect(created.ok).toBe(true);
    if (created.ok !== true) return;
    expect(created.value).toBeTruthy();
    if (!created.value) return;

    const result = await service.editEvent(
      created.value.id,
      created.value,
      otherUser
    );

    expect(result.ok).toBe(false);
    if (result.ok !== false) return;
    expect(result.value.name).toBe("Unauthorized");
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

    expect(created.ok).toBe(true);
    if (created.ok !== true) return;
    expect(created.value).toBeTruthy();
    if (!created.value) return;

    const result = await service.editEvent(
      created.value.id,
      { ...created.value, title: "" },
      owner
    );

    expect(result.ok).toBe(false);
    if (result.ok !== false) return;
    expect(result.value.name).toBe("InvalidInput");
  });
});