import { EventNotFound, InvalidEventDetails } from './errors';

describe('EventNotFound', () => {
    it('has the correct name', () => {
        const error = EventNotFound('Event 1 not found.');
        expect(error.name).toBe('EventNotFound');
    });

    it('carries the provided message', () => {
        const error = EventNotFound('Event 21 not found.');
        expect(error.message).toBe('Event 21 not found.')
    });
});

describe("InvalidEventDetails", () => {
    it("has the correct name", () => {
        const error = InvalidEventDetails("Title is required.");
        expect(error.name).toBe("InvalidEventDetails");
    });

    it("carries the provided message", () => {
        const error = InvalidEventDetails("Capacity must be a positive number.");
        expect(error.message).toBe("Capacity must be a positive number.");
    });
});
