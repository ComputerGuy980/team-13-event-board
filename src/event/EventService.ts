import { start } from "node:repl";
import { Err, Ok, type Result } from "../lib/result";
import type { IAuthenticatedUserSession } from "../session/AppSession";
import { EventNotFound, InvalidEventDetails, Unauthorized, InvalidState, InvalidInput, type EventError } from "./errors";
import type { IEventRecord } from "./Event";
import type { IEventRepository } from "./EventRepository";

export interface IEventService {
    getEvent(
        id: number,
        viewer: IAuthenticatedUserSession,
    ): Promise<Result<IEventRecord, EventError>>;
    createEvent(
        event: Object,
        organizer: IAuthenticatedUserSession
    ): Promise<Result<number | null, EventError>>;
    transitionExpiredEvents(): Promise<void>;
    getArchivedEvents(): Promise<Result<IEventRecord[], EventError>>;
    searchEvents(query: string): Promise<Result<IEventRecord[], EventError>>;
    editEvent(
        id: number,
        updates: IEventRecord,
        viewer: IAuthenticatedUserSession,
    ): Promise<Result<IEventRecord, EventError>>;
    cancelEvent(
        id: number,
        viewer: IAuthenticatedUserSession
    ): Promise<Result<boolean, EventError>>;
    publishEvent(
        id: number,
        viewer: IAuthenticatedUserSession
    ): Promise<Result<boolean, EventError>>;
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
    
    async createEvent(event: Object, organizer: IAuthenticatedUserSession): Promise<Result<number | null, EventError>> {

        // TODO: property length limits, profanity filter, etc.

        if (!("title" in event) || typeof event.title !== "string" || event.title === "") return Err(InvalidEventDetails("New event title invalid."));
        if (!("description" in event) || typeof event.description !== "string") return Err(InvalidEventDetails("New event description invalid."));
        if (!("location" in event) || typeof event.location !== "string") return Err(InvalidEventDetails("New event location invalid."));
        if (!("category" in event) || typeof event.category !== "string") return Err(InvalidEventDetails("New event category invalid."));
        if (!("capacity" in event) || typeof event.capacity !== "string") return Err(InvalidEventDetails("New event capacity invalid."));
        if (!("start_date" in event) || typeof event.start_date !== "string") return Err(InvalidEventDetails("New event start date invalid."));
        if (!("end_date" in event) || typeof event.end_date !== "string") return Err(InvalidEventDetails("New event end date invalid."));

        const capacity = parseInt(event.capacity);
        if (isNaN(capacity) || capacity < 1) return Err(InvalidEventDetails("New event capacity out of bounds."));

        const startDatetime = new Date(event.start_date);
        if (isNaN(startDatetime.getTime())) return Err(InvalidEventDetails("New event start date format invalid."));
        const endDatetime = new Date(event.end_date);
        if (isNaN(endDatetime.getTime())) return Err(InvalidEventDetails("New event end date format invalid."));

        if (startDatetime >= endDatetime) return Err(InvalidEventDetails("New event start date after end date."));

        const new_event: IEventRecord = {
            id: 0, // value is autoincremented in repository
        
            title: event.title,
            description: event.description,
            location: event.location,
            category: event.category,
        
            status: "draft",
        
            capacity: capacity,
        
            startDatetime: startDatetime.getTime(),
            endDatetime: endDatetime.getTime(),

            organizerId: organizer.userId,
        
            createdAt: Date.now(),
            updatedAt: Date.now()
        }

        const result = await this.events.create_event(new_event);
        if (result.ok === false) return Err(InvalidEventDetails(result.value.message));
        if (!result.value) return Err(InvalidEventDetails("Event creation failed."));
        
        return Ok(result.value.id);
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

    async searchEvents(query: string): Promise<Result<IEventRecord[], EventError>> {
        const result = await this.events.list_events();

        if (result.ok === false) {
            return Err(EventNotFound("Could not load events."));
        }

        const now = Date.now();

        const normalized = query.trim().toLowerCase();

        const filtered = result.value.filter((event) => {
            const isPublishedUpcoming =
                event.status === "published" && event.endDatetime > now;

            if (!isPublishedUpcoming) return false;
            if (!normalized) return true;

            return (
                event.title.toLowerCase().includes(normalized) ||
                event.description.toLowerCase().includes(normalized) ||
                event.location.toLowerCase().includes(normalized)
            );
        });

        return Ok(filtered);
    }

    async editEvent(
        id: number,
        updates: IEventRecord,
        viewer: IAuthenticatedUserSession
    ): Promise<Result<IEventRecord, EventError>> {
        const existing = await this.events.get_event(id);

        if (existing.ok === false || !existing.value) {
            return Err(EventNotFound(`Event ${id} not found.`));
        }

        const event = existing.value;

        const canEdit =
            viewer.role === "admin" ||
            viewer.userId === event.organizerId;

        if (!canEdit) {
            return Err(Unauthorized("You cannot edit this event."));
        }

        if (event.status === "cancelled" || event.status === "past") {
            return Err(InvalidState("Past or cancelled events cannot be edited."));
        }
        if (!updates.title.trim()) {
            return Err(InvalidInput("Title is required."));
        }
        const updated: IEventRecord = {
            ...updates,
            id: event.id,
            organizerId: event.organizerId,
            createdAt: event.createdAt,
            updatedAt: Date.now(),
        };

        const saved = await this.events.edit_event(id, updated);

        if (saved.ok === false) {
            return Err(saved.value);
        }

        return Ok(updated);
    }

    async cancelEvent(id: number, viewer: IAuthenticatedUserSession): Promise<Result<boolean, EventError>> {
        const existing = await this.events.get_event(id);

        if (existing.ok === false || !existing.value) {
            return Err(EventNotFound(`Event ${id} not found.`));
        }

        const event = existing.value;

        const canEdit =
            viewer.role === "admin" ||
            viewer.userId === event.organizerId;

        if (!canEdit) {
            return Err(EventNotFound("You cannot edit this event."));
        }

        if (event.status === "cancelled" || event.status === "past") {
            return Err(EventNotFound("Past or cancelled events cannot be cancelled."));
        }

        const result = await this.events.set_event_status(id, "cancelled");

        if (result.ok === false) {
            return Err(EventNotFound("Failed to cancel event."));
        }

        return Ok(true);
    }

    async publishEvent(id: number, viewer: IAuthenticatedUserSession): Promise<Result<boolean, EventError>> {
        const existing = await this.events.get_event(id);

        if (existing.ok === false || !existing.value) {
            return Err(EventNotFound(`Event ${id} not found.`));
        }

        const event = existing.value;

        const canEdit =
            viewer.role === "admin" ||
            viewer.userId === event.organizerId;

        if (!canEdit) {
            return Err(EventNotFound("You cannot edit this event."));
        }

        if (event.status === "cancelled" || event.status === "past") {
            return Err(EventNotFound("Past or cancelled events cannot be published."));
        }

        const result = await this.events.set_event_status(id, "published");

        if (result.ok === false) {
            return Err(EventNotFound("Failed to publish event."));
        }

        return Ok(true);
    }
}

export function CreateEventService(events: IEventRepository): IEventService {
    return new EventService(events);
}
