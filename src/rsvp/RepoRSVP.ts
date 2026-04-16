import type { Result } from "../lib/result";
import type { RSVP, RSVPStatus } from "./RSVP.ts";
import type { RSVPError } from "./RouteErrorRSVP"; 

export interface IRsvpRepository {

  /** Find a single RSVP by user + event (any status). */
  findByMemberAndEvent(userId: string, eventId: string): Promise<Result< RSVP | undefined,  RSVPError>>;

  /** Get the status of an existing RSVP. */
  getRsvpStatus(id: string): Promise<Result< RSVP,  RSVPError>>;

  /** Update the status of an existing RSVP. Returns the updated record. */
  toggleRsvpStatus(id: string, status: RSVPStatus): Promise<Result< RSVP,  RSVPError>>;
 
  /** Return all RSVPs belonging to a user. */
  listUserRsvps(userId: string): Promise<Result< RSVP[],  RSVPError>>; 
}
