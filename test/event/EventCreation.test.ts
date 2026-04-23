import { createComposedApp } from "../../src/composition";
import request from "supertest";

const app = createComposedApp().getExpressApp();

describe("Event creation pipeline", () => {
    let agent = request.agent(app);

    beforeEach(async () => {
        agent = request.agent(app);

        await agent
        .post("/login")
        .send("email=admin@app.test&password=password123")
        .expect(302)
    });

    it("should create event successfully and redirect to new event details page", async () => {
        const response = await agent
        .post("/events/create")
        .type("form")
        .send({
            title: "Test Event",
            description: "Test Event Description",
            location: "Your Mom House",
            category: "Test Category",
            capacity: "10",
            start_date: "2026-04-24T11:11",
            end_date: "2026-04-24T11:22"
        })
        .expect(302)
    });

    it("should fail to create event with start date after end date", async () => {
        const response = await agent
        .post("/events/create")
        .type("form")
        .send({
            title: "Test Event",
            description: "Test Event Description",
            location: "Your Mom House",
            category: "Test Category",
            capacity: "10",
            // start_date > end_date
            start_date: "2026-04-24T11:22",
            end_date: "2026-04-24T11:11"
        })
        .expect(404)
    });

    it("should fail to create event without title / description", async () => {
        const response = await agent
        .post("/events/create")
        .type("form")
        .send({
            location: "Your Mom House",
            category: "Test Category",
            capacity: "10",
            start_date: "2026-04-24T11:11",
            end_date: "2026-04-24T11:22"
        })
        .expect(404)
    });
});