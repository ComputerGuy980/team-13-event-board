export type EventError = 
 | { name: "EventNotFound"; message: string }
 | { name: "InvalidEventDetails"; message: string }

export const EventNotFound = (message: string): EventError => ({
    name: "EventNotFound",
    message: message
});

export const InvalidEventDetails = (message: string): EventError => ({
    name: "InvalidEventDetails",
    message: message
});