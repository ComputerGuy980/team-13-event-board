import { Ok, Err, type Result } from "../lib/result";
import type { RSVP } from "./RSVP.ts";
import type { IRsvpRepository } from "./RepoRSVP.ts";
import type { IRsvpService, DashboardView, RSVPWithEvent } from "./IRSVPService";
import type { IEventRepository } from "../event/EventRepository";
import {
  type RSVPServiceError,
  RSVPNotFound,
  EventNotFound,
  EventCancelled,
  EventInPast,
  OrganizerCannotRSVP,
  AdminCannotRSVP,
  AccessDenied,
} from "./ServiceErrorRSVP";
 
export class RsvpService implements IRsvpService {
  constructor(
    private readonly rsvpRepo: IRsvpRepository,
    private readonly eventRepo: IEventRepository
  ) {}
 
  // ── Feature 4: Toggle RSVP ────────────────────────────────────────────────
 
  async toggleRsvp(
    userId: string,
    userRole: "member" | "organizer" | "admin",
    eventId: string
  ): Promise<Result<RSVP, RSVPServiceError>> {
 
    // ── Guard: role ───────────────────────────────────────────────────────────
    if (userRole === "organizer") return Err(OrganizerCannotRSVP("Organizers cannot RSVP to events."));
    if (userRole === "admin") return Err(AdminCannotRSVP("Admins cannot RSVP to events."));
 
    // ── Guard: event ──────────────────────────────────────────────────────────
    const eventResult = await this.eventRepo.get_event(Number(eventId));
    if (!eventResult.ok) return Err(EventNotFound(`Event ${eventId} could not be retrieved.`));
    if (!eventResult.value) return Err(EventNotFound(`Event ${eventId} does not exist.`));
 
    const event = eventResult.value;
 
    if (event.status === "cancelled") return Err(EventCancelled("Cannot RSVP to a cancelled event."));
    if (event.status === "past") return Err(EventInPast("Cannot RSVP to a past event."));
 
    // ── Find existing RSVP ────────────────────────────────────────────────────
    const findResult = await this.rsvpRepo.findByMemberAndEvent(userId, eventId);
    if (!findResult.ok) return Err(RSVPNotFound("Failed to look up existing RSVP."));
 
    const existing = findResult.value;
 
    // ── Case 1: No existing RSVP → create as going or waitlisted ─────────────
    if (!existing) {
      const goingCount = await this.countGoingAttendees(eventId);
      const isFull = goingCount >= event.capacity;
      const status = isFull ? "waitlisted" : "going";
      const created = await this.rsvpRepo.create(userId, eventId, status);
      return Ok(created);
    }
 
    // ── Case 2: Active RSVP → cancel it ──────────────────────────────────────
    if (existing.status === "going" || existing.status === "waitlisted") {
      const updated = await this.rsvpRepo.toggleRsvpStatus(existing.id, "cancelled");
      if (!updated.ok) return Err(RSVPNotFound(`Could not cancel RSVP ${existing.id}.`));
      return Ok(updated.value);
    }
 
    // ── Case 3: Cancelled RSVP → reactivate as going or waitlisted ───────────
    const goingCount = await this.countGoingAttendees(eventId);
    const isFull = goingCount >= event.capacity;
    const status = isFull ? "waitlisted" : "going";
    const reactivated = await this.rsvpRepo.toggleRsvpStatus(existing.id, status);
    if (!reactivated.ok) return Err(RSVPNotFound(`Could not reactivate RSVP ${existing.id}.`));
    return Ok(reactivated.value);
  }
 
  // ── Feature 7: My RSVPs Dashboard ─────────────────────────────────────────
 
  async getDashboard(
    userId: string,
    userRole: "member" | "organizer" | "admin"
  ): Promise<Result<DashboardView, RSVPServiceError>> {

    if (userRole === "organizer") return Err(AccessDenied("Organizers do not have an RSVPs dashboard."));
    if (userRole === "admin") return Err(AccessDenied("Admins do not have an RSVPs dashboard."));

    const rsvpsResult = await this.rsvpRepo.listUserRsvps(userId);
    if (!rsvpsResult.ok) return Err(AccessDenied("Could not retrieve RSVPs."));

    const rsvps = rsvpsResult.value;

    // Fetch all events in parallel
    const eventResults = await Promise.all(
      rsvps.map((r) => this.eventRepo.get_event(Number(r.eventId)))
    );

    const now = Date.now();
    const upcoming: RSVPWithEvent[] = [];
    const noLongerRSVPd: RSVPWithEvent[] = [];
    const cancelled: RSVPWithEvent[] = [];

    for (let i = 0; i < rsvps.length; i++) {
      const rsvp = rsvps[i];
      const eventResult = eventResults[i];

      // Skip RSVPs whose event could not be found
      if (!eventResult.ok || !eventResult.value) continue;

      const event = eventResult.value;
      const isActive = rsvp.status === "going" || rsvp.status === "waitlisted";
      const isFuture = event.endDatetime > now;

      if (isActive && isFuture) {
        upcoming.push({ rsvp, event });
      } else if (rsvp.status === "cancelled" && isFuture) {
        // User cancelled, but event hasn't happened yet
        noLongerRSVPd.push({ rsvp, event });
      } else {
        // Event was cancelled OR event is in the past
        cancelled.push({ rsvp, event });
      }
    }

    // Soonest first for upcoming
    upcoming.sort((a, b) => a.event.startDatetime - b.event.startDatetime);

    // Most recent first for no longer RSVP'd
    noLongerRSVPd.sort((a, b) => b.event.startDatetime - a.event.startDatetime);

    // Most recent first for cancelled
    cancelled.sort((a, b) => b.event.startDatetime - a.event.startDatetime);

    return Ok({ upcoming, noLongerRSVPd, cancelled });
  }
 
  // ── Private helpers ───────────────────────────────────────────────────────
 
  private async countGoingAttendees(eventId: string): Promise<number> {
    const result = await this.rsvpRepo.listEventRsvps(eventId);
    if (!result.ok) return 0;
    return result.value.filter((r) => r.status === "going").length;
  }
}
 