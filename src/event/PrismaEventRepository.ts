import { PrismaClient } from "@prisma/client";
import { Err, Ok, type Result } from "../lib/result";
import { EventNotFound, type EventError } from "./errors";
import type { EventStatus, IEventRecord } from "./Event";
import type { IEventRepository } from "./EventRepository";

// Prisma stores DateTime as Date objects; IEventRecord uses Unix ms timestamps.
// These two helpers keep the conversion in one place.
function toRecord(e: {
  id: number;
  title: string;
  description: string;
  location: string;
  category: string;
  status: string;
  capacity: number;
  startDatetime: Date;
  endDatetime: Date;
  organizerId: string;
  createdAt: Date;
  updatedAt: Date;
}): IEventRecord {
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    location: e.location,
    category: e.category,
    status: e.status as EventStatus,
    capacity: e.capacity,
    startDatetime: e.startDatetime.getTime(),
    endDatetime: e.endDatetime.getTime(),
    organizerId: e.organizerId,
    createdAt: e.createdAt.getTime(),
    updatedAt: e.updatedAt.getTime(),
  };
}

class PrismaEventRepository implements IEventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create_event(event: IEventRecord): Promise<Result<IEventRecord | null, EventError>> {
    try {
      const created = await this.prisma.event.create({
        data: {
          title: event.title,
          description: event.description,
          location: event.location,
          category: event.category,
          status: event.status,
          capacity: event.capacity,
          startDatetime: new Date(event.startDatetime),
          endDatetime: new Date(event.endDatetime),
          organizerId: event.organizerId,
        },
      });
      return Ok(toRecord(created));
    } catch (err) {
      return Err(EventNotFound("Failed to create event."));
    }
  }

  async get_event(id: number): Promise<Result<IEventRecord | null, EventError>> {
    try {
      const event = await this.prisma.event.findUnique({ where: { id } });
      if (!event) return Err(EventNotFound(`Cannot find event with id ${id}.`));
      return Ok(toRecord(event));
    } catch {
      return Err(EventNotFound("Failed to get event."));
    }
  }

  async edit_event(id: number, event: IEventRecord): Promise<Result<boolean, EventError>> {
    try {
      await this.prisma.event.update({
        where: { id },
        data: {
          title: event.title,
          description: event.description,
          location: event.location,
          category: event.category,
          status: event.status,
          capacity: event.capacity,
          startDatetime: new Date(event.startDatetime),
          endDatetime: new Date(event.endDatetime),
        },
      });
      return Ok(true);
    } catch {
      return Err(EventNotFound(`Cannot find event with id ${id}.`));
    }
  }

  async find_by_status(status: EventStatus): Promise<Result<IEventRecord[], Error>> {
    try {
      const events = await this.prisma.event.findMany({
        where: { status },
      });
      return Ok(events.map(toRecord));
    } catch (err) {
      return Err(new Error("Failed to query events by status."));
    }
  }

  async set_event_status(id: number, status: EventStatus): Promise<Result<boolean, EventError>> {
    try {
      await this.prisma.event.update({
        where: { id },
        data: { status },
      });
      return Ok(true);
    } catch {
      return Err(EventNotFound(`Cannot find event with id ${id}.`));
    }
  }

  async list_events(): Promise<Result<IEventRecord[], EventError>> {
    try {
      const events = await this.prisma.event.findMany();
      return Ok(events.map(toRecord));
    } catch {
      return Err(EventNotFound("Failed to list events."));
    }
  }
}

export function CreatePrismaEventRepository(prisma: PrismaClient): IEventRepository {
  return new PrismaEventRepository(prisma);
}