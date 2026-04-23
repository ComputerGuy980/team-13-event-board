import { CreateApp } from "./app";
import { CreateAdminUserService } from "./auth/AdminUserService";
import { CreateAuthController } from "./auth/AuthController";
import { CreateAuthService } from "./auth/AuthService";
import { CreateInMemoryUserRepository } from "./auth/InMemoryUserRepository";
import { CreatePasswordHasher } from "./auth/PasswordHasher";
import type { IApp } from "./contracts";
import { CreateEventController } from "./event/EventController";
import { CreateEventService } from './event/EventService';
import { CreateInMemoryEventRepository } from "./event/InMemoryEventRepository";
import { InMemoryRsvpRepository } from "./rsvp/InMemoryRepoRSVP";
import { CreateRsvpController } from "./rsvp/RsvpController";
import { RsvpService } from "./rsvp/ServiceRSVP";
import type { ILoggingService } from "./service/LoggingService";
import { CreateLoggingService } from "./service/LoggingService";

export function createComposedApp(logger?: ILoggingService): IApp {
  const resolvedLogger = logger ?? CreateLoggingService();

  // Authentication & authorization wiring
  const authUsers = CreateInMemoryUserRepository();
  const passwordHasher = CreatePasswordHasher();
  const authService = CreateAuthService(authUsers, passwordHasher);
  const adminUserService = CreateAdminUserService(authUsers, passwordHasher);
  const authController = CreateAuthController(authService, adminUserService, resolvedLogger);

  // Event wiring
  const eventRepository = CreateInMemoryEventRepository();
  const eventService = CreateEventService(eventRepository);

  // RSVP wiring
  const rsvpRepository = new InMemoryRsvpRepository();
  const rsvpService = new RsvpService(rsvpRepository, eventRepository);
  const rsvpController = CreateRsvpController(rsvpService);

  const eventController = CreateEventController(eventService, resolvedLogger, rsvpRepository, authUsers);

  return CreateApp(
  authController,
  eventController,
  eventService,
  resolvedLogger,
  rsvpController
);
}
