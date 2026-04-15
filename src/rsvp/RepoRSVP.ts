import type { RSVP, RSVPStatus } from "./RSVP.ts";
import type { RSVPError } from "./ErrorRSVP"; 

export interface IRsvpRepository {

  /** Create a new RSVP for a given event */
  createRsvp(eventId: string): RSVP | RSVPError;

  /** Find a single RSVP by member + event (any status). */
  findByMemberAndEvent(memberId: string, eventId: string): RSVP | RSVPError | undefined;

  /** Get the status of an existing RSVP. */
  getRsvpStatus(id: string): RSVPStatus | RSVPError;

  /** Update the status of an existing RSVP. Returns the updated record. */
  toggleRsvpStatus(id: string, status: RSVPStatus): RSVP | RSVPError;
 
  /** Return all RSVPs belonging to a member. */
  listUserRsvps(memberId: string): RSVP[] | RSVPError; 
}
