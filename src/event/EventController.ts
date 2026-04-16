import type { Request, Response } from "express";
import type { ILoggingService } from "../service/LoggingService";
import type { AppSessionStore } from "../session/AppSession";
import { getAuthenticatedUser, recordPageView } from "../session/AppSession";
import type { IEventService } from "./EventService";

export interface IEventController {
    showEventDetail(req: Request, res: Response, store: AppSessionStore): Promise<void>;
    showArchive(req: Request, res: Response, store: AppSessionStore): Promise<void>;
    showEditForm(req: Request, res: Response, store: AppSessionStore): Promise<void>;
    submitEdit(req: Request, res: Response, store: AppSessionStore): Promise<void>;
}

class EventController implements IEventController {
    constructor(
        private readonly service: IEventService,
        private readonly logger: ILoggingService,
    ) {}

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

        this.logger.info(`GET /events/${id} for ${session.browserLabel}`);

        res.render("events/detail", {
            event: result.value,
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

    async showEditForm(req: Request, res: Response, store: AppSessionStore): Promise<void> {
        const id = parseInt(req.params.id as string, 10);
        const viewer = getAuthenticatedUser(store);

        if (!viewer) {
            res.redirect("/login");
            return;
        }

        const result = await this.service.getEvent(id, viewer);

        if (result.ok === false) {
            res.status(404).render("partials/error", {
                message: result.value.message,
                layout: false,
            });
            return;
        }

        res.render("events/edit", {
            event: result.value,
            pageError: null,
        });
    }
    async submitEdit(req: Request, res: Response, store: AppSessionStore): Promise<void> {
        const id = parseInt(req.params.id as string, 10);
        const viewer = getAuthenticatedUser(store);

        if (!viewer) {
            res.redirect("/login");
            return;
        }

        const existing = await this.service.getEvent(id, viewer);

        if (existing.ok === false) {
            res.status(404).render("partials/error", {
                message: existing.value.message,
                layout: false,
            });
            return;
        }

        const result = await this.service.editEvent(id, {
            ...existing.value,
            title: String(req.body.title ?? ""),
            description: String(req.body.description ?? ""),
            location: String(req.body.location ?? ""),
            category: String(req.body.category ?? ""),
        }, viewer);

        if (result.ok === false) {
            res.status(400).render("partials/error", {
                message: result.value.message,
                layout: false,
            });
            return;
        }
        this.logger.info(`POST /events/${id}/edit`);
        res.redirect(`/events/${id}`);
    }
}

export function CreateEventController(
    service: IEventService,
    logger: ILoggingService,
): IEventController {
    return new EventController(service, logger);
}