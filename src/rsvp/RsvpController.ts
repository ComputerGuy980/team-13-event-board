import type { Request, Response } from "express";
import type { IRsvpService } from "./IRSVPService";
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
  constructor(private readonly service: IRsvpService) {}

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

    // 🔑 return JSON for frontend update
    res.json({
      status: result.value.status,
    });
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

export function CreateRsvpController(service: IRsvpService): IRsvpController {
  return new RsvpController(service);
}