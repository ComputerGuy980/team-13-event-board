import { PrismaClient } from "@prisma/client";
import type { Result } from "../lib/result";
import type { RSVP, RSVPStatus } from "./RSVP";
import type { IRsvpRepository } from "./RepoRSVP";
import { RSVPNotFound } from "./RouteErrorRSVP";

export class PrismaRsvpRepository implements IRsvpRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(userId: string, eventId: string, status: RSVPStatus): Promise<RSVP> {
    const rsvp = await this.prisma.rSVP.create({
      data: {
        userId,
        eventId: parseInt(eventId),
        status,
      },
    });

    return this.mapToRSVP(rsvp);
  }

  async findByMemberAndEvent(
    userId: string,
    eventId: string
  ): Promise<Result<RSVP | undefined, never>> {
    const rsvp = await this.prisma.rSVP.findUnique({
      where: {
        eventId_userId: {
          eventId: parseInt(eventId),
          userId,
        },
      },
    });

    return { ok: true, value: rsvp ? this.mapToRSVP(rsvp) : undefined };
  }

  async getRsvpStatus(id: string): Promise<Result<RSVP, ReturnType<typeof RSVPNotFound>>> {
    const rsvp = await this.prisma.rSVP.findUnique({
      where: { id },
    });

    if (!rsvp) {
      return { ok: false, value: RSVPNotFound(`No RSVP found with id: ${id}`) };
    }

    return { ok: true, value: this.mapToRSVP(rsvp) };
  }

  async toggleRsvpStatus(
    id: string,
    status: RSVPStatus
  ): Promise<Result<RSVP, ReturnType<typeof RSVPNotFound>>> {
    try {
      const updated = await this.prisma.rSVP.update({
        where: { id },
        data: { status },
      });

      return { ok: true, value: this.mapToRSVP(updated) };
    } catch {
      return { ok: false, value: RSVPNotFound(`No RSVP found with id: ${id}`) };
    }
  }

  async listUserRsvps(userId: string): Promise<Result<RSVP[], never>> {
    const rsvps = await this.prisma.rSVP.findMany({
      where: { userId },
    });

    return { ok: true, value: rsvps.map((r) => this.mapToRSVP(r)) };
  }

  async listEventRsvps(eventId: string): Promise<Result<RSVP[], never>> {
    const rsvps = await this.prisma.rSVP.findMany({
      where: { eventId: parseInt(eventId) },
    });

    return { ok: true, value: rsvps.map((r) => this.mapToRSVP(r)) };
  }

  private mapToRSVP(dbRsvp: any): RSVP {
    return {
      id: dbRsvp.id,
      eventId: String(dbRsvp.eventId),
      userId: dbRsvp.userId,
      status: dbRsvp.status as RSVPStatus,
      createdAt: dbRsvp.createdAt,
    };
  }
}
