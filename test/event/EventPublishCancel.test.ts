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
        const response = await agent
        .post("/events/1/cancel")
        .expect(302)
    });

    it("should redirect to event details after successfully publishing event", async () => {
        const response = await agent
        .post("/events/2/publish")
        .expect(302)
    });
});