export type RSVPServiceError =
  | { name: "RSVPNotFound"; message: string }
  | { name: "EventNotFound"; message: string }
  | { name: "EventCancelled"; message: string }
  | { name: "EventInPast"; message: string }
  | { name: "OrganizerCannotRSVP"; message: string }
  | { name: "AdminCannotRSVP"; message: string }
  | { name: "AccessDenied"; message: string };
 
export const RSVPNotFound = (message: string): RSVPServiceError =>
  ({ name: "RSVPNotFound", message });
 
export const EventNotFound = (message: string): RSVPServiceError =>
  ({ name: "EventNotFound", message });
 
export const EventCancelled = (message: string): RSVPServiceError =>
  ({ name: "EventCancelled", message });
 
export const EventInPast = (message: string): RSVPServiceError =>
  ({ name: "EventInPast", message });
 
export const OrganizerCannotRSVP = (message: string): RSVPServiceError =>
  ({ name: "OrganizerCannotRSVP", message });
 
export const AdminCannotRSVP = (message: string): RSVPServiceError =>
  ({ name: "AdminCannotRSVP", message });
 
export const AccessDenied = (message: string): RSVPServiceError =>
  ({ name: "AccessDenied", message });
 