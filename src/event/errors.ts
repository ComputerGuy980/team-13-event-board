export type EventError = 
 | { name: "EventNotFound"; message: string }

export const EventNotFound = (message: string): EventError => ({
    name: "EventNotFound",
    message: message
});