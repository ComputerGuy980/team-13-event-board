export type RSVPError = 
 | { name: "RSVPNotFound"; message: string }

 export const RSVPNotFound = (message: string): RSVPError => ({
    name: "RSVPNotFound",
    message: message
});

