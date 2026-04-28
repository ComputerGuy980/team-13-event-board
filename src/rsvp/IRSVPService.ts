import type { Result } from "../lib/result";
import type { RSVP } from "./RSVP.ts";
import type { RSVPServiceError } from "./ServiceErrorRSVP.ts";
import type { IEventRecord } from "../event/Event";
 
// ── Dashboard view type ───────────────────────────────────────────────────────
 
export interface RSVPWithEvent {
  rsvp: RSVP;
  event: IEventRecord;
}
 
export interface DashboardView {
  /** Active RSVPs for future events — sorted soonest first. */
  upcoming: RSVPWithEvent[];
  /** RSVPs the user cancelled (excluding past events) — sorted most recent first. */
  noLongerRSVPd: RSVPWithEvent[];
  /** Events that were cancelled by organizer/admin or past events — sorted most recent first. */
  cancelled: RSVPWithEvent[];
}
 
// ── Service interface ─────────────────────────────────────────────────────────
 
export interface IRsvpService {
  /**
   * Toggle the RSVP for a user on an event.
   * Handles three cases:
   *  - No existing RSVP → creates as "going" or "waitlisted"
   *  - Active RSVP ("going" | "waitlisted") → cancels it
   *  - Cancelled RSVP → reactivates as "going" or "waitlisted"
   */
  toggleRsvp(
    userId: string,
    userRole: "member" | "organizer" | "admin",
    eventId: string
  ): Promise<Result<RSVP, RSVPServiceError>>;
 
  /**
   * Retrieve the My RSVPs dashboard for a member.
   * Organizers and admins are rejected.
   */
  getDashboard(
    userId: string,
    userRole: "member" | "organizer" | "admin"
  ): Promise<Result<DashboardView, RSVPServiceError>>;
}