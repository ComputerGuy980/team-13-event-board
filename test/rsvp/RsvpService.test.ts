import { RsvpService } from "../../src/rsvp/ServiceRSVP";
import { InMemoryRsvpRepository } from "../../src/rsvp/InMemoryRepoRSVP";
import { InMemoryEventRepository } from "../../src/event/InMemoryEventRepository";
import type { IEventRecord } from "../../src/event/Event";
import {
  OrganizerCannotRSVP,
  AdminCannotRSVP,
  EventCancelled,
  EventInPast,
  AccessDenied,
} from "../../src/rsvp/ServiceErrorRSVP";

const createEvent = (overrides: Partial<IEventRecord> = {}): IEventRecord => {
  const now = Date.now();
  return {
    id: 1,
    title: "Test event",
    description: "Some event description",
    location: "Virtual",
    category: "Testing",
    status: "published",
    capacity: 2,
    startDatetime: now + 100000,
    endDatetime: now + 200000,
    organizerId: "user-reader",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};

describe("RsvpService", () => {
  it("creates a going RSVP when capacity is available", async () => {
    const eventRepo = new InMemoryEventRepository([createEvent({ id: 1, capacity: 2 })]);
    const rsvpRepo = new InMemoryRsvpRepository();
    const service = new RsvpService(rsvpRepo, eventRepo);

    const firstResult = await service.toggleRsvp("member-1", "member", "1");

    expect(firstResult.ok).toBe(true);
    if (firstResult.ok) {
      expect(firstResult.value.status).toBe("going");
      expect(firstResult.value.userId).toBe("member-1");
      expect(firstResult.value.eventId).toBe("1");
    }
  });

  it("cancels an active RSVP and reactivates a cancelled RSVP", async () => {
    const eventRepo = new InMemoryEventRepository([createEvent({ id: 1, capacity: 2 })]);
    const rsvpRepo = new InMemoryRsvpRepository();
    const service = new RsvpService(rsvpRepo, eventRepo);

    const created = await service.toggleRsvp("member-1", "member", "1");
    expect(created.ok).toBe(true);
    if (created.ok) {
      expect(created.value.status).toBe("going");
    }

    const cancelled = await service.toggleRsvp("member-1", "member", "1");
    expect(cancelled.ok).toBe(true);
    if (cancelled.ok) {
      expect(cancelled.value.status).toBe("cancelled");
    }

    const reactivated = await service.toggleRsvp("member-1", "member", "1");
    expect(reactivated.ok).toBe(true);
    if (reactivated.ok) {
      expect(reactivated.value.status).toBe("going");
    }
  });

  it("waitlists a new RSVP when the event is full", async () => {
    const eventRepo = new InMemoryEventRepository([createEvent({ id: 1, capacity: 1 })]);
    const rsvpRepo = new InMemoryRsvpRepository();
    await rsvpRepo.create("member-a", "1", "going");

    const service = new RsvpService(rsvpRepo, eventRepo);
    const waitlistResult = await service.toggleRsvp("member-b", "member", "1");

    expect(waitlistResult.ok).toBe(true);
    if (waitlistResult.ok) {
      expect(waitlistResult.value.status).toBe("waitlisted");
    }
  });

  it("reactivates a cancelled RSVP to waitlisted when the event is still full", async () => {
    const eventRepo = new InMemoryEventRepository([createEvent({ id: 1, capacity: 1 })]);
    const rsvpRepo = new InMemoryRsvpRepository();
    await rsvpRepo.create("member-a", "1", "going");
    await rsvpRepo.create("member-c", "1", "cancelled");

    const service = new RsvpService(rsvpRepo, eventRepo);
    const reactivated = await service.toggleRsvp("member-c", "member", "1");

    expect(reactivated.ok).toBe(true);
    if (reactivated.ok) {
      expect(reactivated.value.status).toBe("waitlisted");
    }
  });

  it("rejects organizer RSVP attempts", async () => {
    const eventRepo = new InMemoryEventRepository([createEvent({ id: 1 })]);
    const service = new RsvpService(new InMemoryRsvpRepository(), eventRepo);

    const result = await service.toggleRsvp("organizer-1", "organizer", "1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("OrganizerCannotRSVP");
    }
  });

  it("rejects admin RSVP attempts", async () => {
    const eventRepo = new InMemoryEventRepository([createEvent({ id: 1 })]);
    const service = new RsvpService(new InMemoryRsvpRepository(), eventRepo);

    const result = await service.toggleRsvp("admin-1", "admin", "1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("AdminCannotRSVP");
    }
  });

  it("rejects RSVP for cancelled and past events with typed service errors", async () => {
    const cancelledEvent = createEvent({ id: 1, status: "cancelled" });
    const pastEvent = createEvent({ id: 2, status: "past" });

    const eventRepo = new InMemoryEventRepository([cancelledEvent, pastEvent]);
    const service = new RsvpService(new InMemoryRsvpRepository(), eventRepo);

    const cancelledResult = await service.toggleRsvp("member-1", "member", "1");
    expect(cancelledResult.ok).toBe(false);
    if (!cancelledResult.ok) {
      expect(cancelledResult.value.name).toBe("EventCancelled");
    }

    const pastResult = await service.toggleRsvp("member-1", "member", "2");
    expect(pastResult.ok).toBe(false);
    if (!pastResult.ok) {
      expect(pastResult.value.name).toBe("EventInPast");
    }
  });

  it("groups dashboard RSVPs into upcoming, noLongerRSVPd, and cancelled categories with correct sorting", async () => {
    const now = Date.now();
    const events: IEventRecord[] = [
      createEvent({ id: 1, startDatetime: now + 10_000, endDatetime: now + 20_000 }),
      createEvent({ id: 2, startDatetime: now + 30_000, endDatetime: now + 40_000 }),
      createEvent({ id: 3, startDatetime: now + 50_000, endDatetime: now + 60_000, status: "published" }),
      createEvent({ id: 4, startDatetime: now + 70_000, endDatetime: now + 80_000, status: "published" }),
      createEvent({ id: 5, startDatetime: now - 120_000, endDatetime: now - 60_000, status: "past" }),
    ];

    const rsvpRepo = new InMemoryRsvpRepository();
    await rsvpRepo.create("member-1", "1", "going");
    await rsvpRepo.create("member-1", "2", "waitlisted");
    await rsvpRepo.create("member-1", "3", "cancelled");
    await rsvpRepo.create("member-1", "4", "cancelled");
    await rsvpRepo.create("member-1", "5", "going");

    const service = new RsvpService(rsvpRepo, new InMemoryEventRepository(events));
    const dashboard = await service.getDashboard("member-1", "member");

    expect(dashboard.ok).toBe(true);
    if (dashboard.ok) {
      expect(dashboard.value.upcoming.map((item) => item.event.id)).toEqual([1, 2]);
      expect(dashboard.value.noLongerRSVPd.map((item) => item.event.id)).toEqual([4, 3]);
      expect(dashboard.value.cancelled.map((item) => item.event.id)).toEqual([5]);
    }
  });

  it("denies organizer access to the RSVPs dashboard", async () => {
    const eventRepo = new InMemoryEventRepository([createEvent({ id: 1 })]);
    const service = new RsvpService(new InMemoryRsvpRepository(), eventRepo);

    const result = await service.getDashboard("organizer-1", "organizer");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("AccessDenied");
    }
  });

  it("promotes the oldest waitlisted attendee when a 'going' attendee cancels", async () => {
    const eventRepo = new InMemoryEventRepository([createEvent({ id: 1, capacity: 2 })]);
    const rsvpRepo = new InMemoryRsvpRepository();
    const service = new RsvpService(rsvpRepo, eventRepo);

    // Set up: 2 going, 2 waitlisted
    await service.toggleRsvp("member-a", "member", "1"); // going
    await service.toggleRsvp("member-b", "member", "1"); // going
    // Add a small delay to ensure createdAt differs for waitlisted members
    const member_c_rsvp = await service.toggleRsvp("member-c", "member", "1"); // waitlisted
    await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay
    const member_d_rsvp = await service.toggleRsvp("member-d", "member", "1"); // waitlisted

    // Verify initial state
    expect(member_c_rsvp.ok).toBe(true);
    if (member_c_rsvp.ok) {
      expect(member_c_rsvp.value.status).toBe("waitlisted");
    }
    expect(member_d_rsvp.ok).toBe(true);
    if (member_d_rsvp.ok) {
      expect(member_d_rsvp.value.status).toBe("waitlisted");
    }

    // Member A (going) cancels
    const cancelResult = await service.toggleRsvp("member-a", "member", "1");
    expect(cancelResult.ok).toBe(true);
    if (cancelResult.ok) {
      expect(cancelResult.value.status).toBe("cancelled");
    }

    // Verify that member-c (oldest waitlisted) was promoted to going
    const allRsvps = await rsvpRepo.listEventRsvps("1");
    expect(allRsvps.ok).toBe(true);
    if (allRsvps.ok) {
      const memberCRsvp = allRsvps.value.find((r) => r.userId === "member-c");
      const memberDRsvp = allRsvps.value.find((r) => r.userId === "member-d");
      expect(memberCRsvp?.status).toBe("going");
      expect(memberDRsvp?.status).toBe("waitlisted");
    }
  });

  it("does not promote anyone when a 'waitlisted' attendee cancels", async () => {
    const eventRepo = new InMemoryEventRepository([createEvent({ id: 1, capacity: 1 })]);
    const rsvpRepo = new InMemoryRsvpRepository();
    const service = new RsvpService(rsvpRepo, eventRepo);

    // Set up: 1 going, 2 waitlisted
    await service.toggleRsvp("member-a", "member", "1"); // going
    const member_b_rsvp = await service.toggleRsvp("member-b", "member", "1"); // waitlisted
    await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay
    const member_c_rsvp = await service.toggleRsvp("member-c", "member", "1"); // waitlisted

    // Verify initial state
    expect(member_b_rsvp.ok).toBe(true);
    if (member_b_rsvp.ok) {
      expect(member_b_rsvp.value.status).toBe("waitlisted");
    }
    expect(member_c_rsvp.ok).toBe(true);
    if (member_c_rsvp.ok) {
      expect(member_c_rsvp.value.status).toBe("waitlisted");
    }

    // Member B (waitlisted) cancels
    const cancelResult = await service.toggleRsvp("member-b", "member", "1");
    expect(cancelResult.ok).toBe(true);
    if (cancelResult.ok) {
      expect(cancelResult.value.status).toBe("cancelled");
    }

    // Verify that member-c remains waitlisted (no promotion since member-b was waitlisted)
    const allRsvps = await rsvpRepo.listEventRsvps("1");
    expect(allRsvps.ok).toBe(true);
    if (allRsvps.ok) {
      const memberAStatus = allRsvps.value.find((r) => r.userId === "member-a")?.status;
      const memberCStatus = allRsvps.value.find((r) => r.userId === "member-c")?.status;
      expect(memberAStatus).toBe("going");
      expect(memberCStatus).toBe("waitlisted");
    }
  });
});
