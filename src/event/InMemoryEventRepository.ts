import { Err, Ok, type Result } from "../lib/result";
import { type EventError, EventNotFound } from "./errors";
import type { EventStatus, IEventRecord } from "./Event";
import type { IEventRepository } from "./EventRepository";

const store: IEventRecord[] = [
  {
    id: 1,
    title: "Community Hackathon 2025",
    description:
      "A weekend-long collaborative coding event open to all skill levels. Teams of up to four will build projects around the theme of civic tech.",
    location: "The Foundry, 12 Mill Road, Cambridge",
    category: "Technology",
    status: "published",
    capacity: 120,
    startDatetime: Date.now() + 3 * 86400000,
    endDatetime: Date.now() + 3 * 86400000 + 8 * 3600000,
    organizerId: "user-reader",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 2,
    title: "Draft Workshop",
    description: "Work in progress.",
    location: "TBD",
    category: "Workshop",
    status: "draft",
    capacity: 20,
    startDatetime: Date.now() + 7 * 86400000,
    endDatetime: Date.now() + 7 * 86400000 + 2 * 3600000,
    organizerId: "user-reader",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

export class InMemoryEventRepository implements IEventRepository {
    constructor(private readonly events: IEventRecord[]) {}

    async create_event(event: IEventRecord): Promise<Result<IEventRecord | null, EventError>> {
        try {
            let id = this.events.length;
            while (this.events.find(e => e.id === id)) {
                id++;
            }

            const new_event = { ...event, id };

            this.events.push(new_event);
            return Ok(new_event);
        } catch {
            return Err(EventNotFound("Failed to create event."));
        }
    }

    async get_event(id: number): Promise<Result<IEventRecord | null, EventError>> {
        try {
            const match = this.events.find(e => e.id === id);
            if (!match) return Err(EventNotFound(`Cannot find event with id ${id}.`));
            return Ok(match);
        } catch {
            return Err(EventNotFound("Failed to get event."))
        }
    }

    async edit_event(id: number, event: IEventRecord): Promise<Result<boolean, EventError>> {
        try {
            const match_idx = this.events.findIndex(e => e.id === id);
            if (match_idx < 0) return Err(EventNotFound(`Cannot find event with id ${id}.`));
            this.events[match_idx] = event;
            return Ok(true);
        } catch {
            return Err(EventNotFound("Failed to edit event."))
        }
    }

    async find_by_status(status: EventStatus): Promise<Result<IEventRecord[], Error>> {
        const events = store.filter((e) => e.status === status);
        return Ok(events);
    }

    async set_event_status(id: number, status: EventStatus): Promise<Result<boolean, EventError>> {
        try {
            const match = this.events.find(e => e.id === id);
            if (!match) return Err(EventNotFound(`Cannot find event with id ${id}.`));
            match.status = status;
            return Ok(true);
        } catch {
            return Err(EventNotFound("Failed to change event status."));
        }
    }

    async list_events(): Promise<Result<IEventRecord[], EventError>> {
        return Ok(this.events);
    }
}

export function CreateInMemoryEventRepository(): IEventRepository {
    return new InMemoryEventRepository(store);
}