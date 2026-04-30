import { createComposedApp } from "../../src/composition";
import request from "supertest";

const app = createComposedApp().getExpressApp();

describe("Event publication and cancellation pipeline", () => {
    let agent = request.agent(app);

    beforeEach(async () => {
        agent = request.agent(app);

        await agent
        .post("/login")
        .send("email=admin@app.test&password=password123")
        .expect(302)
    });

    it("should redirect to /events after successfully cancelling event", async () => {
        const create_response = await agent
        .post("/events/create")
        .type("form")
        .send({
            title: "Test Event",
            description: "Test Event Description",
            location: "Your Mom House",
            category: "Test Category",
            capacity: "10",
            start_date: "2026-08-24T11:11",
            end_date: "2026-08-24T11:22"
        })
        .expect(302)

        console.warn(`TEST/CANCEL: ${create_response.headers["location"]}`);

        const response = await agent
        .post(`${create_response.headers["location"]}/cancel`);

        console.warn(`TEST/CANCEL: ${response.text}`);

        expect(response.status).toBe(302);
    });

    it("should redirect to event details after successfully publishing event", async () => {
        const create_response = await agent
        .post("/events/create")
        .type("form")
        .send({
            title: "Test Event",
            description: "Test Event Description",
            location: "Your Mom House",
            category: "Test Category",
            capacity: "10",
            start_date: "2026-08-24T11:11",
            end_date: "2026-08-24T11:22"
        })
        .expect(302)

        console.warn(`TEST/PUBLISH: ${create_response.headers["location"]}`);

        const response = await agent
        .post(`${create_response.headers["location"]}/publish`);
        
        console.warn(`TEST/PUBLISH: ${response.text}`);

        expect(response.status).toBe(302);
    });
});