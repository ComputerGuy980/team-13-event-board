import type { Request, Response } from "express";
import type { IRsvpService } from "./IRSVPService";
import type { IEventRepository } from "../event/EventRepository";
import type { AppSessionStore } from "../session/AppSession";
import { getAuthenticatedUser, recordPageView } from "../session/AppSession";
import { RSVPServiceError } from "./ServiceErrorRSVP";

export interface IRsvpController {
  toggleRsvp(req: Request, res: Response, store: AppSessionStore): Promise<void>;
  showDashboard(req: Request, res: Response, store: AppSessionStore): Promise<void>;
}

function mapRole(role: string): "admin" | "member" | "organizer" {
  if (role === "admin") return "admin";
  if (role === "organizer") return "organizer";
  return "member"; // treat everything else (including "staff") as member
}

function getParam(param: string | string[] | undefined): string | null {
  if (!param) return null;
  return Array.isArray(param) ? param[0] : param;
}

class RsvpController implements IRsvpController {
  constructor(
    private readonly service: IRsvpService,
    private readonly eventRepository: IEventRepository,
  ) {}

  // POST /events/:id/rsvp
  async toggleRsvp(req: Request, res: Response, store: AppSessionStore): Promise<void> {
    const viewer = getAuthenticatedUser(store);
    if (!viewer) {
      res.status(401).send("Unauthorized");
      return;
    }

    const eventId = getParam(req.params.id);

if (!eventId) {
  res.status(400).send("Invalid event id");
  return;
}

    const result = await this.service.toggleRsvp(
      viewer.userId,
      mapRole(viewer.role),
      eventId
    );

    if (!result.ok) {
  const err = result.value as RSVPServiceError;
  res.status(400).send(err.message);
  return;
}

    const newStatus = result.value.status;
    const isHtmx = req.get("HX-Request") === "true";

    if (isHtmx) {
      // For HTMX requests, return updated button and attendance HTML
      const buttonText =
        newStatus === 'going' ? 'Cancel RSVP' :
        newStatus === 'waitlisted' ? 'Leave Waitlist' :
        'RSVP to this event';

      const buttonClass =
        (newStatus === 'going' || newStatus === 'waitlisted')
          ? 'bg-red-600 hover:bg-red-700'
          : 'bg-blue-600 hover:bg-blue-700';

      const response = `
        <div id="rsvp-button-${eventId}">
          <button
            hx-post="/events/${eventId}/rsvp"
            hx-trigger="click"
            hx-target="#rsvp-button-${eventId}"
            hx-swap="outerHTML"
            class="px-4 py-2 rounded-lg ${buttonClass} text-white text-sm font-medium cursor-pointer transition-colors"
          >
            ${buttonText}
          </button>
        </div>
      `;

      res.send(response);
    } else {
      // Return JSON for non-HTMX requests
      res.json({
        status: newStatus,
      });
    }
  }

  // GET /my-rsvps
  async showDashboard(req: Request, res: Response, store: AppSessionStore): Promise<void> {
    const viewer = getAuthenticatedUser(store);
    if (!viewer) {
      res.redirect("/login");
      return;
    }

    const session = recordPageView(store);

    const result = await this.service.getDashboard(
      viewer.userId,
      mapRole(viewer.role)
    );

    if (!result.ok) {
  const err = result.value as RSVPServiceError;
  res.status(403).render("partials/error", {
    message: err.message,
    layout: false,
  });
  return;
}

    res.render("rsvp/dashboard", {
      dashboard: result.value,
      viewer,
      session,
      pageError: null,
    });
  }
}

export function CreateRsvpController(service: IRsvpService, eventRepository: IEventRepository): IRsvpController {
  return new RsvpController(service, eventRepository);
}