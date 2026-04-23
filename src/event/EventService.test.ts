import type { IAuthenticatedUserSession } from "../session/AppSession";
import { CreateEventService } from "./EventService";
import { CreateInMemoryEventRepository } from "./InMemoryEventRepository";

// Test users
const organizer: IAuthenticatedUserSession = {
    userId: "user-reader",
    email: "organizer@example.com",
    displayName: "Organizer",
    role: "user",
    signedInAt: new Date().toISOString(),
};

const otherUser: IAuthenticatedUserSession = {
    userId: "user-other",
    email: "other@example.com",
    displayName: "Other",
    role: "user",
    signedInAt: new Date().toISOString(),
};

const admin: IAuthenticatedUserSession = {
    userId: "user-admin",
    email: "admin@example.com",
    displayName: "Admin",
    role: "admin",
    signedInAt: new Date().toISOString(),
};


// Helper function
function makeService() {
    const repo = CreateInMemoryEventRepository();
    const service = CreateEventService(repo);
    return { repo, service };
}