import request from "supertest";
import { CreateApp } from "../../src/app";
import { CreateAuthController } from "../../src/auth/AuthController";
import { CreateAuthService } from "../../src/auth/AuthService";
import { CreateAdminUserService } from "../../src/auth/AdminUserService";
import { CreateInMemoryUserRepository } from "../../src/auth/InMemoryUserRepository";
import { CreatePasswordHasher } from "../../src/auth/PasswordHasher";
import { CreateEventController } from "../../src/event/EventController";
import { CreateEventService } from "../../src/event/EventService";
import { InMemoryEventRepository } from "../../src/event/InMemoryEventRepository";
import { CreateRsvpController } from "../../src/rsvp/RsvpController";
import { InMemoryRsvpRepository } from "../../src/rsvp/InMemoryRepoRSVP";
import { RsvpService } from "../../src/rsvp/ServiceRSVP";
import type { IEventRecord } from "../../src/event/Event";
import type { ILoggingService } from "../../src/service/LoggingService";

const logger: ILoggingService = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

const createEvent = (overrides: Partial<IEventRecord> = {}): IEventRecord => {
  const now = Date.now();
  return {
    id: 1,
    title: "API RSVP Event",
    description: "Event used by RSVP route tests",
    location: "Test Lab",
    category: "Testing",
    status: "published",
    capacity: 1,
    startDatetime: now + 100000,
    endDatetime: now + 200000,
    organizerId: "user-reader",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};

interface TestAppContext {
  app: ReturnType<typeof CreateApp>;
  eventRepository: InMemoryEventRepository;
  adminUserService: ReturnType<typeof CreateAdminUserService>;
}

const buildTestApp = (events: IEventRecord[]): TestAppContext => {
  const authUsers = CreateInMemoryUserRepository();
  const passwordHasher = CreatePasswordHasher();
  const authService = CreateAuthService(authUsers, passwordHasher);
  const adminUserService = CreateAdminUserService(authUsers, passwordHasher);
  const authController = CreateAuthController(authService, adminUserService, logger);

  const eventRepository = new InMemoryEventRepository(events);
  const eventService = CreateEventService(eventRepository);
  const rsvpRepository = new InMemoryRsvpRepository();
  const rsvpService = new RsvpService(rsvpRepository, eventRepository);
  const rsvpController = CreateRsvpController(rsvpService, eventRepository);
  const eventController = CreateEventController(eventService, logger, rsvpRepository);

  const app = CreateApp(authController, eventController, eventService, logger, rsvpController);
  return { app, eventRepository, adminUserService };
};

const loginAs = async (agent: any, email: string): Promise<void> => {
  const response = await agent
    .post("/login")
    .type("form")
    .send({ email, password: "password123" });

  expect(response.status).toBe(302);
};

describe("RSVP endpoints", () => {
  it("returns 401 for unauthenticated RSVP requests", async () => {
    const { app } = buildTestApp([createEvent({ id: 1 })]);
    const response = await request(app.getExpressApp()).post("/events/1/rsvp");

    expect(response.status).toBe(401);
    expect(response.text).toContain("Please log in to continue.");
  });

  it("allows a member to toggle RSVP and returns JSON status", async () => {
    const { app } = buildTestApp([createEvent({ id: 1, capacity: 1 })]);
    const agent = request.agent(app.getExpressApp());

    await loginAs(agent, "user@app.test");

    const firstResponse = await agent.post("/events/1/rsvp");
    expect(firstResponse.status).toBe(200);
    expect(firstResponse.body).toEqual({ status: "going" });

    const secondResponse = await agent.post("/events/1/rsvp");
    expect(secondResponse.status).toBe(200);
    expect(secondResponse.body).toEqual({ status: "cancelled" });
  });

  it("waitlists a second member when the event has reached capacity", async () => {
    const { app } = buildTestApp([createEvent({ id: 1, capacity: 1 })]);
    const firstAgent = request.agent(app.getExpressApp());
    const secondAgent = request.agent(app.getExpressApp());

    await loginAs(firstAgent, "user@app.test");
    await loginAs(secondAgent, "staff@app.test");

    const firstResult = await firstAgent.post("/events/1/rsvp");
    expect(firstResult.status).toBe(200);
    expect(firstResult.body).toEqual({ status: "going" });

    const secondResult = await secondAgent.post("/events/1/rsvp");
    expect(secondResult.status).toBe(200);
    expect(secondResult.body).toEqual({ status: "waitlisted" });
  });

  it("rejects admin RSVP attempts with a 400 status code", async () => {
    const { app } = buildTestApp([createEvent({ id: 1, capacity: 1 })]);
    const agent = request.agent(app.getExpressApp());

    await loginAs(agent, "admin@app.test");

    const response = await agent.post("/events/1/rsvp");
    expect(response.status).toBe(400);
    expect(response.text).toContain("Admins cannot RSVP to events.");
  });

  it("returns 403 for admin access to the My RSVPs dashboard", async () => {
    const { app } = buildTestApp([createEvent({ id: 1 })]);
    const agent = request.agent(app.getExpressApp());

    await loginAs(agent, "admin@app.test");

    const response = await agent.get("/my-rsvps");
    expect(response.status).toBe(403);
    expect(response.text).toContain("Admins do not have an RSVPs dashboard.");
  });
});
