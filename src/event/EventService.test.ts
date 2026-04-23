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

// Get event test
describe("EventService.getEvent", () => {
    describe("published event", () => {
        it("returns the event for the organizer", async () => {
            const { service } = makeService();
            const result = await service.getEvent(1, organizer);
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.id).toBe(1);
                expect(result.value.status).toBe("published");
            }
        });
    
        it("returns the event for a different authenticated user", async () => {
            const { service } = makeService();
            const result = await service.getEvent(1, otherUser);
            expect(result.ok).toBe(true);
        });
    
        it("returns the event for an admin", async () => {
            const { service } = makeService();
            const result = await service.getEvent(1, admin);
            expect(result.ok).toBe(true);
        });
    });
    
    describe("missing event", () => {
        it("returns EventNotFound for an ID that does not exist", async () => {
            const { service } = makeService();
            const result = await service.getEvent(9999, organizer);
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.value.name).toBe("EventNotFound");
            }
        });
    
        it("returns EventNotFound for a non-numeric-like ID resolved to NaN path", async () => {
            const { service } = makeService();
            const result = await service.getEvent(NaN, organizer);
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.value.name).toBe("EventNotFound");
            }
        });
    });
    
    describe("draft visibility rule", () => {
        // Event id 2 in the seed data is a draft owned by "user-reader" (organizer fixture)
    
        it("returns the draft for the organizer who owns it", async () => {
            const { service } = makeService();
            const result = await service.getEvent(2, organizer);
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.status).toBe("draft");
            }
        });
    
        it("returns the draft for an admin", async () => {
            const { service } = makeService();
            const result = await service.getEvent(2, admin);
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.status).toBe("draft");
            }
        });
    
        it("hides the draft from a different regular user", async () => {
            const { service } = makeService();
            const result = await service.getEvent(2, otherUser);
            expect(result.ok).toBe(false);
            if (!result.ok) {
                // Must be not-found, not forbidden — draft existence must not leak
                expect(result.value.name).toBe("EventNotFound");
            }
        });
    
        it("returns not-found (not forbidden) so the draft existence is not leaked", async () => {
            const { service } = makeService();
            const draftResult = await service.getEvent(2, otherUser);
            const missingResult = await service.getEvent(9999, otherUser);
        
            expect(draftResult.ok).toBe(false);
            expect(missingResult.ok).toBe(false);
        
            if (!draftResult.ok && !missingResult.ok) {
                // Both should return the same error shape
                expect(draftResult.value.name).toBe(missingResult.value.name);
            }
        });
    });
});