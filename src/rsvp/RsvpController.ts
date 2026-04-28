import type { Request, Response } from "express";
import type { IRsvpService, DashboardView } from "./IRSVPService";
import type { IEventRepository } from "../event/EventRepository";
import type { IRsvpRepository } from "./RepoRSVP";
import type { AppSessionStore } from "../session/AppSession";
import { getAuthenticatedUser, recordPageView } from "../session/AppSession";
import { RSVPServiceError } from "./ServiceErrorRSVP";

export interface IRsvpController {
  toggleRsvp(req: Request, res: Response, store: AppSessionStore): Promise<void>;
  getAttendance(req: Request, res: Response): Promise<void>;
  showDashboard(req: Request, res: Response, store: AppSessionStore): Promise<void>;
}

function mapRole(role: string): "admin" | "member" | "organizer" {
  if (role === "admin") return "admin";
  // In the current system, there's no "organizer" role - just "admin", "staff", and "user"
  // All non-admin roles map to "member"
  return "member";
}

function getParam(param: string | string[] | undefined): string | null {
  if (!param) return null;
  return Array.isArray(param) ? param[0] : param;
}

class RsvpController implements IRsvpController {
  constructor(
    private readonly service: IRsvpService,
    private readonly eventRepository: IEventRepository,
    private readonly rsvpRepository: IRsvpRepository,
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

    // Check if request is from dashboard
    const fromDashboard = req.query.from === "dashboard";

    if (isHtmx && fromDashboard) {
      // For dashboard HTMX requests, fetch updated dashboard and return sections as OOB swaps
      const dashboardResult = await this.service.getDashboard(
        viewer.userId,
        mapRole(viewer.role)
      );

      if (!dashboardResult.ok) {
        res.status(400).send("Failed to update dashboard");
        return;
      }

      const dashboard = dashboardResult.value;

      // Render sections as HTML fragments
      const upcomingHtml = this.renderUpcomingSection(dashboard);
      const noLongerRsvpdHtml = this.renderNoLongerRsvpdSection(dashboard);

      const response = `
        <div id="upcoming-section" hx-swap-oob="innerHTML">
          ${upcomingHtml}
        </div>
        <div id="no-longer-rsvpd-section" hx-swap-oob="innerHTML">
          ${noLongerRsvpdHtml}
        </div>
      `;

      res.send(response);
    } else if (isHtmx) {
      // For event detail page HTMX requests, return updated button and attendance
      // Fetch updated event data to get new attendance count
      const eventResult = await this.eventRepository.get_event(Number(eventId));
      if (!eventResult.ok) {
        res.status(400).send("Event not found");
        return;
      }

      const event = eventResult.value;
      if (!event) {
        res.status(400).send("Event not found");
        return;
      }

      // Get RSVPs for this event to calculate the count
      const rsvpsResult = await this.rsvpRepository.listEventRsvps(String(event.id));
      const rsvps = rsvpsResult.ok ? rsvpsResult.value : [];
      const rsvpCount = rsvps.filter((r) => r.status === "going").length;

      // For HTMX requests, return updated button AND attendance using OOB swap
      const buttonText =
        newStatus === 'going' ? 'Cancel RSVP' :
        newStatus === 'waitlisted' ? 'Leave Waitlist' :
        'RSVP to this event';

      const buttonClass =
        (newStatus === 'going' || newStatus === 'waitlisted')
          ? 'bg-red-600 hover:bg-red-700'
          : 'bg-blue-600 hover:bg-blue-700';

      // Generate updated attendance section
      const pct = event.capacity ? Math.min(Math.round((rsvpCount / event.capacity) * 100), 100) : 0;
      const spotsLeft = event.capacity ? event.capacity - rsvpCount : null;

      let attendanceHtml = '';
      if (event.capacity) {
        attendanceHtml = `
          <p class="text-sm font-medium text-slate-800">${rsvpCount} / ${event.capacity} attending</p>
          <div class="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all ${pct >= 100 ? 'bg-red-400' : pct >= 80 ? 'bg-amber-400' : 'bg-emerald-400'}"
              style="width: ${pct}%">
            </div>
          </div>
          <p class="text-xs text-slate-400 mt-1">${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left</p>
        `;
      } else {
        attendanceHtml = `
          <p class="text-sm font-medium text-slate-800">${rsvpCount} attending</p>
          <p class="text-xs text-slate-400 mt-0.5">No capacity limit</p>
        `;
      }

      // Return button as main swap, and attendance section as OOB swap
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
        <div id="attendance-content-${eventId}" hx-swap-oob="innerHTML">
          ${attendanceHtml}
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

  private renderUpcomingSection(dashboard: DashboardView): string {
    if (dashboard.upcoming.length === 0) {
      return '<p class="text-sm text-slate-400 mb-6">No upcoming RSVPs.</p>';
    }

    const items = dashboard.upcoming.map((item) => `
      <div
        class="bg-white border rounded-xl px-4 py-3 flex justify-between items-center"
        id="rsvp-${item.rsvp.id}"
      >
        <div>
          <p class="font-medium">${item.event.title}</p>
          <p class="text-xs text-slate-400">
            ${new Date(item.event.startDatetime).toLocaleDateString()}
          </p>
          <p class="text-xs">
            Status: <span id="status-${item.rsvp.id}">${item.rsvp.status}</span>
          </p>
        </div>

        <button
          hx-post="/events/${item.event.id}/rsvp?from=dashboard"
          hx-trigger="click"
          hx-swap="none"
          hx-confirm="Are you sure you want to cancel this RSVP?"
          class="text-sm px-3 py-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
          data-rsvp-id="${item.rsvp.id}"
        >
          Cancel
        </button>
      </div>
    `).join('');

    return `
      <div class="flex flex-col gap-3 mb-8">
        ${items}
      </div>
    `;
  }

  private renderNoLongerRsvpdSection(dashboard: DashboardView): string {
    if (dashboard.noLongerRSVPd.length === 0) {
      return '<p class="text-sm text-slate-400 mb-6">You\'re still RSVP\'d to all upcoming events.</p>';
    }

    const items = dashboard.noLongerRSVPd.map((item) => `
      <div class="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex justify-between items-center" id="rsvp-${item.rsvp.id}">
        <div>
          <p class="font-medium text-amber-900">${item.event.title}</p>
          <p class="text-xs text-amber-600">
            ${new Date(item.event.startDatetime).toLocaleDateString()}
          </p>
          <p class="text-xs text-amber-700">
            Status: ${item.rsvp.status}
          </p>
        </div>

        <button
          hx-post="/events/${item.event.id}/rsvp?from=dashboard"
          hx-trigger="click"
          hx-swap="none"
          class="text-sm px-3 py-1.5 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
          data-rsvp-id="${item.rsvp.id}"
        >
          RSVP Again
        </button>
      </div>
    `).join('');

    return `
      <div class="flex flex-col gap-3 mb-8">
        ${items}
      </div>
    `;
  }

  // GET /events/:id/attendance - return just the attendance section
  async getAttendance(req: Request, res: Response): Promise<void> {
    const eventId = getParam(req.params.id);

    if (!eventId) {
      res.status(400).send("Invalid event id");
      return;
    }

    const eventResult = await this.eventRepository.get_event(Number(eventId));
    if (!eventResult.ok) {
      res.status(404).send("Event not found");
      return;
    }

    const event = eventResult.value;
    if (!event) {
      res.status(404).send("Event not found");
      return;
    }

    // Get RSVPs for this event to calculate the count
    const rsvpsResult = await this.rsvpRepository.listEventRsvps(String(event.id));
    const rsvps = rsvpsResult.ok ? rsvpsResult.value : [];
    const rsvpCount = rsvps.filter((r) => r.status === "going").length;

    const pct = event.capacity ? Math.min(Math.round((rsvpCount / event.capacity) * 100), 100) : 0;
    const spotsLeft = event.capacity ? event.capacity - rsvpCount : null;

    let attendanceHtml = '';
    if (event.capacity) {
      attendanceHtml = `
        <p class="text-sm font-medium text-slate-800">${rsvpCount} / ${event.capacity} attending</p>
        <div class="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div class="h-full rounded-full transition-all ${pct >= 100 ? 'bg-red-400' : pct >= 80 ? 'bg-amber-400' : 'bg-emerald-400'}"
            style="width: ${pct}%">
          </div>
        </div>
        <p class="text-xs text-slate-400 mt-1">${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left</p>
      `;
    } else {
      attendanceHtml = `
        <p class="text-sm font-medium text-slate-800">${rsvpCount} attending</p>
        <p class="text-xs text-slate-400 mt-0.5">No capacity limit</p>
      `;
    }

    res.send(attendanceHtml);
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

export function CreateRsvpController(service: IRsvpService, eventRepository: IEventRepository, rsvpRepository: IRsvpRepository): IRsvpController {
  return new RsvpController(service, eventRepository, rsvpRepository);
}