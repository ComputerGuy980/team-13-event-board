export type EventError =
  | { name: "EventNotFound"; message: string }
  | { name: "InvalidEventDetails"; message: string } // KEEP THIS
  | { name: "Unauthorized"; message: string }
  | { name: "InvalidState"; message: string }
  | { name: "InvalidInput"; message: string };

export const EventNotFound = (message: string): EventError => ({
  name: "EventNotFound",
  message,
});

export const InvalidEventDetails = (message: string): EventError => ({
  name: "InvalidEventDetails",
  message,
});

export const Unauthorized = (message: string): EventError => ({
  name: "Unauthorized",
  message,
});

export const InvalidState = (message: string): EventError => ({
  name: "InvalidState",
  message,
});

export const InvalidInput = (message: string): EventError => ({
  name: "InvalidInput",
  message,
});