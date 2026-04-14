import { Ok, type Result } from "../lib/result";
import type { Event } from "./Event";
import type { EventRepository } from "./EventRepository";

export interface ISearchEventsService {
  searchEvents(query: string): Result<Event[], Error>;
}

export function CreateSearchEventsService(
  eventRepository: EventRepository
): ISearchEventsService {
  function searchEvents(query: string): Result<Event[], Error> {
    const allEvents = eventRepository.getAll();
    const now = new Date();
    const q = query.trim().toLowerCase();

    const filtered = allEvents.filter((event) => {
      const matchesState =
        event.status === "published" &&
        event.startDatetime > now;

      if (!matchesState) return false;

      if (!q) return true;

      return (
        event.title.toLowerCase().includes(q) ||
        event.description.toLowerCase().includes(q) ||
        event.location.toLowerCase().includes(q)
      );
    });

    return Ok(filtered);
  }

  return {
    searchEvents,
  };
}