import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
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
import { PrismaRsvpRepository } from "./rsvp/PrismaRepoRSVP";
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

  // RSVP wiring - using Prisma for persistence
  const dbUrl = process.env.DATABASE_URL || "file:./prisma/dev.db";
  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({
      url: dbUrl,
    }),
  });
  const rsvpRepository = new PrismaRsvpRepository(prisma);
  const rsvpService = new RsvpService(rsvpRepository, eventRepository);
  const rsvpController = CreateRsvpController(rsvpService, eventRepository, rsvpRepository);

  const eventController = CreateEventController(eventService, resolvedLogger, rsvpRepository, authUsers);

  return CreateApp(
  authController,
  eventController,
  eventService,
  resolvedLogger,
  rsvpController
);
}
