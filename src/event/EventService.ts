import { Err, Ok, type Result } from "../lib/result";
import type { IAuthenticatedUserSession } from "../session/AppSession";
import { EventNotFound, type EventError } from "./errors";
import type { IEventRecord } from "./Event";
import type { IEventRepository } from "./EventRepository";

export interface IEventService {
    getEvent(
        id: number,
        viewer: IAuthenticatedUserSession,
    ): Promise<Result<IEventRecord, EventError>>;
    transitionExpiredEvents(): Promise<void>;
    getArchivedEvents(): Promise<Result<IEventRecord[], EventError>>;
}

class EventService implements IEventService {
    constructor(private readonly events: IEventRepository) {}

    async getEvent(
        id: number,
        viewer: IAuthenticatedUserSession,
): Promise<Result<IEventRecord, EventError>> {
    const result = await this.events.get_event(id);

    if (result.ok === false) {
        return Err(EventNotFound(`Event ${id} not found.`));
    }

    const event = result.value;

    if (!event) {
        return Err(EventNotFound(`Event ${id} not found.`));
    }

    const isDraft = event.status === "draft";
    const canSeeDraft =
        viewer.role === "admin" || viewer.userId === String(event.organizerId);

    if (isDraft && !canSeeDraft) {
      // Return not-found rather than forbidden — don't leak that the draft exists
        return Err(EventNotFound(`Event ${id} not found.`));
    }

    return Ok(event);
    }

    async transitionExpiredEvents(): Promise<void> {
        const now = Date.now();
        const result = await this.events.find_by_status("published");
        if (result.ok === false) return;
    
        const expired = result.value.filter((e) => e.endDatetime < now);
        await Promise.all(
            expired.map((e) => this.events.set_event_status(e.id, "past")),
        );
    }
    
    async getArchivedEvents(): Promise<Result<IEventRecord[], EventError>> {
        const result = await this.events.find_by_status("past");
        if (result.ok === false) {
            return Err(EventNotFound("Could not load archived events."));
        }
        // Reverse chronological — most recently ended first
        const sorted = result.value.slice().sort((a, b) => b.endDatetime - a.endDatetime);
        return Ok(sorted);
    }
}

export function CreateEventService(events: IEventRepository): IEventService {
    return new EventService(events);
}