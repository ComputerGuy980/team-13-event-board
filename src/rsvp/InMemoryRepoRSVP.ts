import type { Result } from "../lib/result";
import type { RSVP, RSVPStatus } from "./RSVP";
import type { IRsvpRepository } from "./RepoRSVP";
import { RSVPNotFound } from "./RouteErrorRSVP";
 
export class InMemoryRsvpRepository implements IRsvpRepository {
  private readonly store = new Map<string, RSVP>();
  private nextId = 1;
 
  // Non-interface: raw insert called by the service layer 
 
  async create(userId: string, eventId: string, status: RSVPStatus): Promise<RSVP> {
    const rsvp: RSVP = {
      id: `rsvp-${this.nextId++}`,
      userId,
      eventId,
      status,
      createdAt: new Date(),
    };
    this.store.set(rsvp.id, rsvp);
    return rsvp;
  }
 
  // IRsvpRepository
 
  async findByMemberAndEvent(
    userId: string,
    eventId: string
  ): Promise<Result<RSVP | undefined, never>> {
    for (const rsvp of this.store.values()) {
      if (rsvp.userId === userId && rsvp.eventId === eventId) {
        return { ok: true, value: rsvp };
      }
    }
    return { ok: true, value: undefined };
  }
 
  async getRsvpStatus(id: string): Promise<Result<RSVP, ReturnType<typeof RSVPNotFound>>> {
    const rsvp = this.store.get(id);
    if (!rsvp) return { ok: false, value: RSVPNotFound(`No RSVP found with id: ${id}`) };
    return { ok: true, value: rsvp };
  }
 
  async toggleRsvpStatus(
    id: string,
    status: RSVPStatus
  ): Promise<Result<RSVP, ReturnType<typeof RSVPNotFound>>> {
    const existing = this.store.get(id);
    if (!existing) return { ok: false, value: RSVPNotFound(`No RSVP found with id: ${id}`) };
    const updated: RSVP = { ...existing, status };
    this.store.set(id, updated);
    return { ok: true, value: updated };
  }
 
  async listUserRsvps(userId: string): Promise<Result<RSVP[], never>> {
    const results = [...this.store.values()].filter((r) => r.userId === userId);
    return { ok: true, value: results };
  }
}
 