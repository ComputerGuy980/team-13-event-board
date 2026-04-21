import type { Request, Response } from "express";
import type { ILoggingService } from "../service/LoggingService";
import type { AppSessionStore } from "../session/AppSession";
import { getAuthenticatedUser, recordPageView } from "../session/AppSession";
import type { IEventService } from "./EventService";
import type { IRsvpRepository } from "../rsvp/RepoRSVP";

export interface IEventController {
    createNewEvent(req: Request, res: Response, store: AppSessionStore): Promise<void>;
    showEventDetail(req: Request, res: Response, store: AppSessionStore): Promise<void>;
    showArchive(req: Request, res: Response, store: AppSessionStore): Promise<void>;
}

class EventController implements IEventController {
    constructor(
        private readonly service: IEventService,
        private readonly logger: ILoggingService,
        private readonly rsvpRepository: IRsvpRepository,
    ) {}

    async createNewEvent(req: Request, res: Response, store: AppSessionStore): Promise<void> {
        const viewer = getAuthenticatedUser(store);
        if (!viewer) {
            res.redirect("/login");
            return;
        }

        const session = recordPageView(store);
        const result = await this.service.createEvent(req.body, viewer);

        if (result.ok === false) {
            this.logger.warn("Event creation failed.");
            res.status(404).render("partials/error", {
                message: result.value.message,
                layout: false
            });
            return;
        }
    
        this.logger.info(`GET /events/create for ${session.browserLabel}`);

        res.redirect(`/events/${result.value}`);
    }

    async showEventDetail(req: Request, res: Response, store: AppSessionStore): Promise<void> {
        const id = parseInt(req.params.id as string, 10);

        if (isNaN(id)) {
            res.status(404).render("partials/error", {
                message: "Event not found.",
                layout: false,
            });
            return;
        }

        const viewer = getAuthenticatedUser(store);
        if (!viewer) {
            res.redirect("/login");
            return;
        }

        const session = recordPageView(store);
        const result = await this.service.getEvent(id, viewer);

        if (result.ok === false) {
            this.logger.warn(`Event not found: ${id}`);
            res.status(404).render("partials/error", {
                message: result.value.message,
                layout: false,
            });
            return;
        }

        const event = result.value;

        // Fetch RSVP data for this event
        const rsvpsResult = await this.rsvpRepository.listEventRsvps(String(event.id));
        const rsvps = rsvpsResult.ok ? rsvpsResult.value : [];
        const rsvpCount = rsvps.filter((r) => r.status === "going").length;

        const userRsvp = rsvps.find((r) => r.userId === viewer.userId);
        const userRsvpStatus = userRsvp?.status || "none";

        // Enhance event object with RSVP info
        const eventWithRsvp = {
            ...event,
            rsvpCount,
            userRsvpStatus,
        };

        this.logger.info(`GET /events/${id} for ${session.browserLabel}`);

        res.render("events/detail", {
            event: eventWithRsvp,
            viewer,
            session,
            pageError: null,
        });
    }

    async showArchive(req: Request, res: Response, store: AppSessionStore): Promise<void> {
        const session = recordPageView(store);
        const result = await this.service.getArchivedEvents();
    
        if (result.ok === false) {
            this.logger.warn("Failed to load event archive");
            res.status(500).render("partials/error", {
                message: result.value.message,
                layout: false,
            });
            return;
        }
    
        this.logger.info(`GET /events/archive for ${session.browserLabel}`);
    
        res.render("events/archive", {
            events: result.value,
            session,
            pageError: null,
        });
    }
}

export function CreateEventController(
    service: IEventService,
    logger: ILoggingService,
    rsvpRepository: IRsvpRepository,
): IEventController {
    return new EventController(service, logger, rsvpRepository);
}